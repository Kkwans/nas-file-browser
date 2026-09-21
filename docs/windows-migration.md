# Windows 通用改进回迁记录

- 来源：Kkwans/win-file-browser@0d1886faf0ba4234160ffa9630c5dfb8539c030a
- NAS 起点：master@a202d0e627d2f10a45a4dbc69c728c3f71090204
- 基线运行镜像：nas-file-browser:2026.9.6-v14；发布前重新核验。
- 既有工作区改动：CI、Dockerfile.custom、README、Compose、push-acr 脚本、嵌入前端产物及未跟踪文档/缓存/数据；不纳入本任务提交。
- 每个切片通过门禁后立即 commit/push，最终统一部署。

## 来源差异清单

| 路径 | 处理 |
| --- | --- |
| `frontend/src/api/media.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/api/utils.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/api/volumes.ts` | Windows 专属排除；保留 NAS 实现 |
| `frontend/src/components/Sidebar.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/components/files/ArtPlayerVideo.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/components/files/VideoPlayer.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/components/prompts/PathPicker.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/components/settings/Rules.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/components/ui/AppSelect.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/css/settings.css` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/css/styles.css` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/stores/categories.ts` | Windows 专属排除；保留 NAS 实现 |
| `frontend/src/stores/volumes.ts` | Windows 专属排除；保留 NAS 实现 |
| `frontend/src/types/user.d.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/__tests__/previewLifecycleContract.test.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/__tests__/settingsUiContract.test.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/__tests__/tokenExpiration.test.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/__tests__/videoPlayback.test.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/fileListing.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/playerControls.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/storageSize.ts` | Windows 专属排除；保留 NAS 实现 |
| `frontend/src/utils/tokenExpiration.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/utils/videoPlayback.ts` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/Settings.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/files/FileListing.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/files/Preview.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/settings/Global.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/settings/Profile.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/settings/Shares.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/settings/User.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `frontend/src/views/settings/Users.vue` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/analysis/storage.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/cmd/root.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/cmd/users.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/created_time.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/drivefs_errors.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/drivefs_other.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/drivefs_windows.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/listing.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/files/listing_sort_windows_test.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/files/virtual_root.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/hls/service.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/hls/service_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/auth.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/categories.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/http/duplicate_cleanup_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/ffmpeg_path.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/hls.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/hls_ffmpeg_stub_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/hls_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/http.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/image_preview.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/media_info.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/public.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/resource.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/share.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/stat_helper.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/http/token_expiration_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/users.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/video_preview.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/video_sprite.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/http/volumes.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/http/volumes_other.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/http/volumes_windows.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/risk/risk.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/settings/dir.go` | Windows 专属排除；保留 NAS 实现 |
| `backend/users/resume_min_sec_test.go` | NAS 适配；按相关功能切片迁入并回归 |
| `backend/users/users.go` | NAS 适配；按相关功能切片迁入并回归 |

## 切片验证记录

### 1. 通用控件与路径选择器

- 迁入 AppSelect、主题选择、规则表单和共享样式；补齐键盘选择/焦点/禁用语义及唯一 ID。
- 文件模式保留目录导航，但禁止选择目录；扩展名筛选大小写不敏感。
- 验证：前端 typecheck、lint、settingsUiContract/copyMoveUiContract/analysisAccessibilityContract/fileListIconContract；结果随门禁更新。
- 部署：尚未部署；真实浏览器及最终发布验收待完成。

### 2. 账户设置与播放器偏好

- 切片 1：`2566a093`，已 push master；typecheck/lint 通过，4 个测试文件 17 项通过。
- 账户页复用 Windows 分区布局；账号偏好串行保存，失败保留输入，账号切换隔离延迟响应。
- PlayerPreferences 在用户存储层合并局部更新，保留旧账号默认；会话上限暂不变。
- 聚焦门禁：accountPreferences/settingsUiContract；Go users/http；typecheck/lint/diff-check。
- 尚未部署，回滚候选仍为 v14；浏览器验收待最终发布。
- 结果：前端 2 文件 6 测试、typecheck、lint、Go users/http 通过。`CGO_ENABLED=1 go test -race ./users` 因 gcc 缺失无法执行；不安装系统编译器，竞态检测标为未验证。

### 3. 全局设置与统一保存

- 切片 2：`356372f9`，已 push master。
- 复用来源布局；通过当前路由组件公开保存方法接入唯一顶部入口，移除全局 window 保存事件。
- 全局设置请求去重，保存前读取最新分块大小；失败保留输入，成功后应用主题。
- typecheck/lint 与 2 文件 6 项聚焦测试通过；生产构建单独验证。
- 尚未部署，真实目标验收待完成；回滚候选 v14。

### 4. 用户管理

- 切片 3：`d5502c9c`，已 push；生产构建通过（保留既有大 chunk 提示）。
- 用户列表迁入来源标识；编辑页接入唯一顶部保存，保留原生表单验证与当前密码确认。
- 保存请求防重，提交快照不随表单输入漂移；明文密码不写入 auth store。
- 验证：settingsUiContract 3 项；typecheck/lint/diff-check。尚未部署，真实交互验收待完成。

### 5. 分享管理

- 切片 4：`d145c563`，已 push master；typecheck/lint 和 settingsUiContract 3 项通过。
- 迁入分享空态和复制反馈；删除仅在服务端确认成功后更新列表，并防止重复删除请求。
- 聚焦验证：settingsUiContract、typecheck、lint、diff-check。尚未部署，真实交互验收待完成。
