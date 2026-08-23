package hls

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DefaultMaxBytes    = int64(10 << 30)
	DefaultProfile     = "h264-main-720p-aac-hls4-v1"
	DefaultCopyProfile = "h264-copy-hls-v1"
	DefaultWebMProfile = "vp9-720p-opus-webm-v1"
	playingLease       = 2 * time.Minute
	maxFFmpegError     = 8 * 1024
)

var (
	ErrNotFound  = errors.New("HLS cache not found")
	ErrForbidden = errors.New("HLS cache access denied")
	ErrState     = errors.New("HLS cache state does not allow this operation")
	cacheIDRE    = regexp.MustCompile(`^[a-f0-9]{64}$`)
	assetNameRE  = regexp.MustCompile(`^(index\.m3u8|index\.webm|segment-[0-9]{6}\.ts)$`)
)

type State string

const (
	StateQueued     State = "queued"
	StatePreparing  State = "preparing"
	StateStreamable State = "streamable"
	StateCompleted  State = "completed"
	StateFailed     State = "failed"
	StateCanceled   State = "canceled"
)

type Config struct {
	CacheDir   string
	MaxBytes   int64
	Workers    int
	FFmpegPath string
	Profile    string
}

type Input struct {
	UserID     uint
	Path       string
	Identity   string
	SourcePath string
	VideoCodec string
	AudioCodec string
}

type Job struct {
	ID         string
	UserID     uint
	Path       string
	Identity   string
	SourcePath string
	Profile    string
}

// IsWebMProfile reports whether a compatibility artifact is a complete WebM
// file rather than an HLS playlist.  The profile is part of the cache key so
// browsers with and without H.264 MSE support do not share incompatible data.
func IsWebMProfile(profile string) bool {
	return profile == DefaultWebMProfile
}

// IsCopyProfile reports whether the HLS artifact only remuxes streams that
// Chromium can consume.  It avoids a full video encode for MKV/MOV files that
// already contain H.264 video and AAC (or no) audio.
func IsCopyProfile(profile string) bool {
	return profile == DefaultCopyProfile
}

// CanCopyMedia is deliberately conservative: copying an unsupported audio
// stream would produce a fast but unusable compatibility artifact.
func CanCopyMedia(videoCodec, audioCodec string) bool {
	videoCodec = strings.ToLower(strings.TrimSpace(videoCodec))
	audioCodec = strings.ToLower(strings.TrimSpace(audioCodec))
	return videoCodec == "h264" && (audioCodec == "" || audioCodec == "aac")
}

type Status struct {
	ID           string `json:"id"`
	TaskID       string `json:"taskId,omitempty"`
	Path         string `json:"path"`
	Identity     string `json:"identity"`
	Profile      string `json:"profile"`
	State        State  `json:"state"`
	Error        string `json:"error,omitempty"`
	UpdatedAt    int64  `json:"updatedAt"`
	LastAccessAt int64  `json:"lastAccessAt,omitempty"`
	SizeBytes    int64  `json:"sizeBytes,omitempty"`
	UserID       uint   `json:"userId"`
}

type entry struct {
	Status
	sourcePath string
	leaseUntil time.Time
}

type StartFunc func(job Job) (taskID string, err error)

type Service struct {
	cacheDir   string
	maxBytes   int64
	ffmpegPath string
	profile    string
	workers    chan struct{}

	mu      sync.Mutex
	entries map[string]*entry
}

type cappedBuffer struct {
	bytes.Buffer
	limit int
}

func (buffer *cappedBuffer) Write(payload []byte) (int, error) {
	written := len(payload)
	remaining := buffer.limit - buffer.Len()
	if remaining > 0 {
		if remaining > len(payload) {
			remaining = len(payload)
		}
		_, _ = buffer.Buffer.Write(payload[:remaining])
	}
	return written, nil
}

func New(config Config) (*Service, error) {
	if config.CacheDir == "" {
		return nil, fmt.Errorf("HLS cache directory is required")
	}
	if config.MaxBytes <= 0 {
		config.MaxBytes = DefaultMaxBytes
	}
	if config.Workers < 1 || config.Workers > 2 {
		return nil, fmt.Errorf("HLS processors count must be between 1 and 2")
	}
	if config.FFmpegPath == "" {
		config.FFmpegPath = "ffmpeg"
	}
	if config.Profile == "" {
		config.Profile = DefaultProfile
	}
	if err := os.MkdirAll(config.CacheDir, 0o700); err != nil {
		return nil, fmt.Errorf("create HLS cache directory: %w", err)
	}
	service := &Service{
		cacheDir: config.CacheDir, maxBytes: config.MaxBytes,
		ffmpegPath: config.FFmpegPath, profile: config.Profile,
		workers: make(chan struct{}, config.Workers), entries: make(map[string]*entry),
	}
	if err := service.loadCompleted(); err != nil {
		return nil, err
	}
	service.mu.Lock()
	service.cleanupLocked("")
	service.mu.Unlock()
	return service, nil
}

func (service *Service) Reserve(input Input, start StartFunc) (Status, bool, error) {
	return service.reserve(input, service.profile, start)
}

// ReserveCopy creates an HLS playlist by copying already browser-compatible
// H.264/AAC streams.  The container is remuxed, not re-encoded.
func (service *Service) ReserveCopy(input Input, start StartFunc) (Status, bool, error) {
	return service.reserve(input, DefaultCopyProfile, start)
}

// ReserveWebM creates a compatibility artifact that can be played by
// Chromium builds without proprietary H.264/MSE decoders.  It intentionally
// waits until the complete WebM file is available before exposing it, which
// gives the browser a normal seekable resource instead of a broken HLS source.
func (service *Service) ReserveWebM(input Input, start StartFunc) (Status, bool, error) {
	return service.reserve(input, DefaultWebMProfile, start)
}

func (service *Service) reserve(input Input, profile string, start StartFunc) (Status, bool, error) {
	if input.UserID == 0 || input.Path == "" || input.Identity == "" || input.SourcePath == "" {
		return Status{}, false, fmt.Errorf("invalid HLS source")
	}
	if start == nil {
		return Status{}, false, fmt.Errorf("HLS task starter is required")
	}
	job := Job{
		ID:     cacheKey(input.UserID, input.Path, input.Identity, profile),
		UserID: input.UserID, Path: input.Path, Identity: input.Identity,
		SourcePath: input.SourcePath, Profile: profile,
	}

	service.mu.Lock()
	defer service.mu.Unlock()
	if current := service.entries[job.ID]; current != nil &&
		(current.State == StateQueued || current.State == StatePreparing ||
			current.State == StateStreamable || current.State == StateCompleted) {
		return current.Status, false, nil
	}
	now := time.Now().UnixMilli()
	current := &entry{Status: Status{
		ID: job.ID, UserID: job.UserID, Path: job.Path, Identity: job.Identity,
		Profile: job.Profile, State: StateQueued, UpdatedAt: now,
	}, sourcePath: job.SourcePath}
	service.entries[job.ID] = current
	taskID, err := start(job)
	if err != nil {
		current.State = StateFailed
		current.Error = err.Error()
		current.UpdatedAt = time.Now().UnixMilli()
		return current.Status, true, err
	}
	current.TaskID = taskID
	current.UpdatedAt = time.Now().UnixMilli()
	return current.Status, true, nil
}

func (service *Service) Get(id string, userID uint) (Status, error) {
	service.mu.Lock()
	defer service.mu.Unlock()
	current := service.entries[id]
	if current == nil {
		return Status{}, ErrNotFound
	}
	if current.UserID != userID {
		return Status{}, ErrForbidden
	}
	return current.Status, nil
}

func (service *Service) Run(ctx context.Context, job Job) error {
	select {
	case service.workers <- struct{}{}:
		defer func() { <-service.workers }()
	case <-ctx.Done():
		service.finish(job.ID, StateCanceled, "任务已取消", 0)
		return ctx.Err()
	}

	service.mu.Lock()
	current := service.entries[job.ID]
	if current == nil || current.UserID != job.UserID || current.Identity != job.Identity {
		service.mu.Unlock()
		return ErrState
	}
	current.State = StatePreparing
	current.Error = ""
	current.UpdatedAt = time.Now().UnixMilli()
	service.mu.Unlock()

	directory := service.entryDir(job.ID)
	if err := os.RemoveAll(directory); err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("reset HLS work directory: %w", err)
	}
	if err := os.MkdirAll(directory, 0o700); err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("create HLS work directory: %w", err)
	}
	if IsWebMProfile(job.Profile) {
		return service.runWebM(ctx, job, directory)
	}

	playlist := filepath.Join(directory, "index.m3u8")
	segmentPattern := filepath.Join(directory, "segment-%06d.ts")
	args := ffmpegArgs(job.SourcePath, segmentPattern, playlist)
	if IsCopyProfile(job.Profile) {
		args = copyFFmpegArgs(job.SourcePath, segmentPattern, playlist)
	}
	command := exec.CommandContext(ctx, service.ffmpegPath, args...)
	stderr := cappedBuffer{limit: maxFFmpegError}
	command.Stderr = &stderr
	if err := command.Start(); err != nil {
		message := fmt.Sprintf("FFmpeg HLS 转码启动失败: %v", err)
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}

	wait := make(chan error, 1)
	go func() { wait <- command.Wait() }()
	ticker := time.NewTicker(120 * time.Millisecond)
	defer ticker.Stop()
	streamable := false
	var runErr error
	finished := false
	for !finished {
		select {
		case runErr = <-wait:
			finished = true
		case <-ticker.C:
			if !streamable && readyToStream(directory) {
				streamable = true
				service.setState(job.ID, StateStreamable, "")
			}
		case <-ctx.Done():
			runErr = <-wait
			if runErr == nil {
				runErr = ctx.Err()
			}
			finished = true
		}
	}
	if errors.Is(ctx.Err(), context.Canceled) {
		service.finish(job.ID, StateCanceled, "任务已取消", 0)
		_ = os.RemoveAll(directory)
		return ctx.Err()
	}
	if runErr != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = runErr.Error()
		}
		message = "FFmpeg HLS 转码失败: " + message
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}
	if !readyToStream(directory) {
		message := "FFmpeg HLS 转码未生成可播放分段"
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}

	size, err := directorySize(directory)
	if err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("measure HLS cache: %w", err)
	}
	service.finish(job.ID, StateCompleted, "", size)
	if err := service.persist(job.ID); err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("persist HLS cache metadata: %w", err)
	}
	service.mu.Lock()
	service.cleanupLocked(job.ID)
	service.mu.Unlock()
	return nil
}

func (service *Service) runWebM(ctx context.Context, job Job, directory string) error {
	temporary := filepath.Join(directory, "index.webm.tmp")
	output := filepath.Join(directory, "index.webm")
	args := webMArgs(job.SourcePath, temporary)
	command := exec.CommandContext(ctx, service.ffmpegPath, args...)
	stderr := cappedBuffer{limit: maxFFmpegError}
	command.Stderr = &stderr
	if err := command.Start(); err != nil {
		message := fmt.Sprintf("FFmpeg WebM 转码启动失败: %v", err)
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}
	runErr := command.Wait()
	if errors.Is(ctx.Err(), context.Canceled) {
		service.finish(job.ID, StateCanceled, "任务已取消", 0)
		_ = os.RemoveAll(directory)
		return ctx.Err()
	}
	if runErr != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = runErr.Error()
		}
		message = "FFmpeg WebM 转码失败: " + message
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}
	if err := os.Rename(temporary, output); err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		_ = os.RemoveAll(directory)
		return fmt.Errorf("publish WebM compatibility artifact: %w", err)
	}
	if !readyForProfile(directory, job.Profile) {
		message := "FFmpeg WebM 转码未生成可播放文件"
		service.finish(job.ID, StateFailed, message, 0)
		_ = os.RemoveAll(directory)
		return errors.New(message)
	}

	size, err := directorySize(directory)
	if err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("measure WebM cache: %w", err)
	}
	service.finish(job.ID, StateCompleted, "", size)
	if err := service.persist(job.ID); err != nil {
		service.finish(job.ID, StateFailed, err.Error(), 0)
		return fmt.Errorf("persist WebM cache metadata: %w", err)
	}
	service.mu.Lock()
	service.cleanupLocked(job.ID)
	service.mu.Unlock()
	return nil
}

func (service *Service) Asset(id string, userID uint, name string) (string, State, error) {
	if !assetNameRE.MatchString(name) {
		return "", "", ErrNotFound
	}
	service.mu.Lock()
	defer service.mu.Unlock()
	current := service.entries[id]
	if current == nil {
		return "", "", ErrNotFound
	}
	if current.UserID != userID {
		return "", "", ErrForbidden
	}
	if current.State != StateStreamable && current.State != StateCompleted {
		return "", current.State, ErrState
	}
	if name == "index.webm" && current.State != StateCompleted {
		return "", current.State, ErrState
	}
	path := filepath.Join(service.entryDir(id), name)
	if info, err := os.Stat(path); err != nil || info.IsDir() {
		return "", current.State, ErrNotFound
	}
	now := time.Now()
	current.LastAccessAt = now.UnixMilli()
	current.leaseUntil = now.Add(playingLease)
	return path, current.State, nil
}

func (service *Service) setState(id string, state State, message string) {
	service.mu.Lock()
	defer service.mu.Unlock()
	if current := service.entries[id]; current != nil {
		current.State = state
		current.Error = message
		current.UpdatedAt = time.Now().UnixMilli()
	}
}

func (service *Service) finish(id string, state State, message string, size int64) {
	service.mu.Lock()
	defer service.mu.Unlock()
	if current := service.entries[id]; current != nil {
		current.State = state
		current.Error = message
		current.SizeBytes = size
		current.UpdatedAt = time.Now().UnixMilli()
	}
}

func (service *Service) persist(id string) error {
	service.mu.Lock()
	current := service.entries[id]
	if current == nil || current.State != StateCompleted {
		service.mu.Unlock()
		return ErrState
	}
	status := current.Status
	service.mu.Unlock()

	payload, err := json.Marshal(status)
	if err != nil {
		return err
	}
	directory := service.entryDir(id)
	temporary, err := os.CreateTemp(directory, ".meta-*.tmp")
	if err != nil {
		return err
	}
	temporaryName := temporary.Name()
	defer func() { _ = os.Remove(temporaryName) }()
	if err := temporary.Chmod(0o600); err != nil {
		_ = temporary.Close()
		return err
	}
	if _, err := temporary.Write(payload); err != nil {
		_ = temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	return os.Rename(temporaryName, filepath.Join(directory, "meta.json"))
}

func (service *Service) loadCompleted() error {
	prefixes, err := os.ReadDir(service.cacheDir)
	if err != nil {
		return fmt.Errorf("read HLS cache directory: %w", err)
	}
	for _, prefix := range prefixes {
		if !prefix.IsDir() || len(prefix.Name()) != 2 {
			continue
		}
		children, readErr := os.ReadDir(filepath.Join(service.cacheDir, prefix.Name()))
		if readErr != nil {
			return fmt.Errorf("read HLS cache prefix: %w", readErr)
		}
		for _, child := range children {
			if !child.IsDir() || !cacheIDRE.MatchString(child.Name()) || !strings.HasPrefix(child.Name(), prefix.Name()) {
				continue
			}
			directory := filepath.Join(service.cacheDir, prefix.Name(), child.Name())
			payload, readErr := os.ReadFile(filepath.Join(directory, "meta.json"))
			var status Status
			if readErr != nil || json.Unmarshal(payload, &status) != nil ||
				status.ID != child.Name() || status.State != StateCompleted || !readyForProfile(directory, status.Profile) {
				_ = os.RemoveAll(directory)
				continue
			}
			if status.SizeBytes <= 0 {
				status.SizeBytes, _ = directorySize(directory)
			}
			service.entries[status.ID] = &entry{Status: status}
		}
	}
	return nil
}

func (service *Service) cleanupLocked(protectID string) {
	total := int64(0)
	candidates := make([]*entry, 0, len(service.entries))
	now := time.Now()
	for _, current := range service.entries {
		if current.State != StateCompleted {
			continue
		}
		total += current.SizeBytes
		if current.ID != protectID && !current.leaseUntil.After(now) {
			candidates = append(candidates, current)
		}
	}
	if total <= service.maxBytes {
		return
	}
	sort.SliceStable(candidates, func(left, right int) bool {
		leftTime := candidates[left].LastAccessAt
		if leftTime == 0 {
			leftTime = candidates[left].UpdatedAt
		}
		rightTime := candidates[right].LastAccessAt
		if rightTime == 0 {
			rightTime = candidates[right].UpdatedAt
		}
		return leftTime < rightTime
	})
	for _, candidate := range candidates {
		if total <= service.maxBytes {
			break
		}
		if err := os.RemoveAll(service.entryDir(candidate.ID)); err != nil {
			continue
		}
		total -= candidate.SizeBytes
		delete(service.entries, candidate.ID)
	}
}

func (service *Service) entryDir(id string) string {
	return filepath.Join(service.cacheDir, id[:2], id)
}

func cacheKey(userID uint, path, identity, profile string) string {
	digest := sha256.Sum256([]byte(strconv.FormatUint(uint64(userID), 10) + "\x00" + path + "\x00" + identity + "\x00" + profile))
	return hex.EncodeToString(digest[:])
}

func ffmpegArgs(source, segmentPattern, playlist string) []string {
	return []string{
		"-hide_banner", "-loglevel", "error", "-nostdin", "-i", source,
		"-map", "0:v:0", "-map", "0:a:0?",
		"-vf", "scale=w='trunc(min(1280,iw)/2)*2':h=-2:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
		"-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main", "-pix_fmt", "yuv420p",
		"-threads", "1", "-filter_threads", "1",
		"-c:a", "aac", "-b:a", "128k", "-ac", "2",
		"-force_key_frames", "expr:gte(t,n_forced*4)",
		"-f", "hls", "-hls_time", "4", "-hls_list_size", "0", "-hls_playlist_type", "event",
		"-hls_flags", "independent_segments+temp_file",
		"-hls_segment_filename", segmentPattern, playlist,
	}
}

func copyFFmpegArgs(source, segmentPattern, playlist string) []string {
	return []string{
		"-hide_banner", "-loglevel", "error", "-nostdin", "-i", source,
		"-map", "0:v:0", "-map", "0:a:0?",
		"-c:v", "copy", "-c:a", "copy",
		"-f", "hls", "-hls_time", "4", "-hls_list_size", "0", "-hls_playlist_type", "event",
		"-hls_flags", "independent_segments+temp_file",
		"-hls_segment_filename", segmentPattern, playlist,
	}
}

func webMArgs(source, output string) []string {
	return []string{
		"-hide_banner", "-loglevel", "error", "-nostdin", "-i", source,
		"-map", "0:v:0", "-map", "0:a:0?",
		"-vf", "scale=w='trunc(min(1280,iw)/2)*2':h=-2:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2",
		"-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-b:v", "1.5M",
		"-row-mt", "1", "-threads", "1", "-pix_fmt", "yuv420p",
		"-c:a", "libopus", "-b:a", "128k", "-ac", "2",
		"-f", "webm", output,
	}
}

func readyToStream(directory string) bool {
	playlist, err := os.Stat(filepath.Join(directory, "index.m3u8"))
	if err != nil || playlist.Size() == 0 {
		return false
	}
	segment, err := os.Stat(filepath.Join(directory, "segment-000000.ts"))
	return err == nil && segment.Size() > 0
}

func readyForProfile(directory, profile string) bool {
	if IsWebMProfile(profile) {
		info, err := os.Stat(filepath.Join(directory, "index.webm"))
		return err == nil && !info.IsDir() && info.Size() > 0
	}
	return readyToStream(directory)
}

func directorySize(directory string) (int64, error) {
	var total int64
	err := filepath.WalkDir(directory, func(_ string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		total += info.Size()
		return nil
	})
	return total, err
}
