<template>
  <div
    v-if="uploadStore.activeUploads.size > 0"
    class="upload-files"
    v-bind:class="{ closed: !open }"
  >
    <div class="card floating">
      <div class="card-title">
        <h2 class="upload-title">
          <span class="upload-title-main">上传文件</span>
          <span class="upload-count"
            >{{ uploadStore.pendingUploadCount }} 个</span
          >
        </h2>
        <div class="upload-info">
          <div class="upload-speed"><span>速度</span>{{ speedText }}/秒</div>
          <div class="upload-eta"><span>剩余</span>{{ formattedETA }}</div>
          <div class="upload-percentage">
            <span>进度</span>{{ sentPercent }}%
          </div>
          <div class="upload-fraction">
            <span>已传</span> {{ sentMbytes }} /
            {{ totalMbytes }}
          </div>
        </div>
        <button class="action" @click="abortAll" aria-label="中止" title="中止">
          <AppIcon name="x" :size="22" :stroke-width="2" />
        </button>
        <button
          class="action"
          @click="toggle"
          aria-label="切换列表"
          title="切换列表"
        >
          <AppIcon
            :name="open ? 'chevron-down' : 'chevron-up'"
            :size="22"
            :stroke-width="2"
          />
        </button>
      </div>

      <div class="card-content file-icons">
        <div
          class="file"
          v-for="upload in uploadStore.activeUploads"
          :key="upload.path"
          :data-dir="upload.type === 'dir'"
          :data-type="upload.type"
          :aria-label="upload.name"
        >
          <div class="file-name">
            <AppIcon
              class="file-type-icon"
              :name="getUploadIcon(upload)"
              :size="20"
              :stroke-width="1.9"
            />
            <span class="file-name-text" :title="upload.name">{{
              upload.name
            }}</span>
          </div>
          <div class="file-progress">
            <div
              v-bind:style="{
                width: (upload.sentBytes / upload.totalBytes) * 100 + '%',
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFileStore } from "@/stores/file";
import { useUploadStore } from "@/stores/upload";
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import buttons from "@/utils/buttons";
import { partial } from "filesize";
import AppIcon from "@/components/ui/AppIcon.vue";
import { getResourceIconName } from "@/utils/fileIcons";
const open = ref<boolean>(false);
const speed = ref<number>(0);
const eta = ref<number>(Infinity);

const fileStore = useFileStore();
const uploadStore = useUploadStore();

const getUploadIcon = (upload: Upload) =>
  getResourceIconName(upload.name, upload.type, upload.type === "dir");

const { sentBytes, totalBytes } = storeToRefs(uploadStore);

const byteToMbyte = partial({ exponent: 2 });
const byteToKbyte = partial({ exponent: 1 });

const sentPercent = computed(() =>
  ((uploadStore.sentBytes / uploadStore.totalBytes) * 100).toFixed(2)
);

const sentMbytes = computed(() => byteToMbyte(uploadStore.sentBytes));
const totalMbytes = computed(() => byteToMbyte(uploadStore.totalBytes));
const speedText = computed(() => {
  const bytes = speed.value;

  if (bytes < 1024 * 1024) {
    const kb = parseFloat(byteToKbyte(bytes));
    return `${kb.toFixed(2)} KB`;
  } else {
    const mb = parseFloat(byteToMbyte(bytes));
    return `${mb.toFixed(2)} MB`;
  }
});

let lastSpeedUpdate: number = 0;
let recentSpeeds: number[] = [];

let lastThrottleTime = 0;

const throttledCalculateSpeed = (sentBytes: number, oldSentBytes: number) => {
  const now = Date.now();
  if (now - lastThrottleTime < 100) {
    return;
  }

  lastThrottleTime = now;
  calculateSpeed(sentBytes, oldSentBytes);
};

const calculateSpeed = (sentBytes: number, oldSentBytes: number) => {
  // Reset the state when the uploads batch is complete
  if (sentBytes === 0) {
    lastSpeedUpdate = 0;
    recentSpeeds = [];

    eta.value = Infinity;
    speed.value = 0;

    return;
  }

  const elapsedTime = (Date.now() - (lastSpeedUpdate ?? 0)) / 1000;
  const bytesSinceLastUpdate = sentBytes - oldSentBytes;
  const currentSpeed = bytesSinceLastUpdate / elapsedTime;

  recentSpeeds.push(currentSpeed);
  if (recentSpeeds.length > 5) {
    recentSpeeds.shift();
  }

  const recentSpeedsAverage =
    recentSpeeds.reduce((acc, curr) => acc + curr) / recentSpeeds.length;

  // Use the current speed for the first update to avoid smoothing lag
  if (recentSpeeds.length === 1) {
    speed.value = currentSpeed;
  }

  speed.value = recentSpeedsAverage * 0.2 + speed.value * 0.8;

  lastSpeedUpdate = Date.now();

  calculateEta();
};

const calculateEta = () => {
  if (speed.value === 0) {
    eta.value = Infinity;

    return Infinity;
  }

  const remainingSize = uploadStore.totalBytes - uploadStore.sentBytes;
  const speedBytesPerSecond = speed.value;

  eta.value = remainingSize / speedBytesPerSecond;
};

watch(sentBytes, throttledCalculateSpeed);

watch(totalBytes, (totalBytes, oldTotalBytes) => {
  if (oldTotalBytes !== 0) {
    return;
  }

  // Mark the start time of a new upload batch
  lastSpeedUpdate = Date.now();
});

const formattedETA = computed(() => {
  if (!eta.value || eta.value === Infinity) {
    return "--:--:--";
  }

  let totalSeconds = eta.value;
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
});

const toggle = () => {
  open.value = !open.value;
};

const abortAll = () => {
  if (confirm("确定中止上传？")) {
    buttons.done("upload");
    open.value = false;
    uploadStore.abort();
    fileStore.reload = true; // Trigger reload in the file store
  }
};
</script>

<style scoped>
.upload-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, max-content));
  justify-content: end;
  gap: 0.18rem 0.85rem;
  min-width: 15rem;
  width: auto;
  text-align: right;
  font-size: 0.78rem;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.upload-info > div {
  white-space: nowrap;
}

.upload-info span {
  margin-right: 0.3rem;
  color: var(--secondary-text);
}

.upload-speed {
  font-weight: 700;
}

@media (max-width: 450px) {
  .upload-info {
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.15rem 0.5rem;
    font-size: 0.68rem;
  }

  .upload-info > div {
    text-align: right;
  }
}
</style>
