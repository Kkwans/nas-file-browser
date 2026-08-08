<template>
  <div id="recent-page" class="activity-page">
    <header-bar show-menu show-logo>
      <div class="activity-header-title">
        <i class="material-icons" aria-hidden="true">schedule</i>
        <div>
          <strong>最近访问</strong>
          <span>最近 {{ recentStore.items.length }} 项</span>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="activity-header-action"
          :disabled="recentStore.loading"
          @click="load"
        >
          <i class="material-icons" aria-hidden="true">refresh</i>
          刷新
        </button>
      </template>
    </header-bar>

    <main class="activity-workspace">
      <section class="activity-intro" aria-labelledby="recent-title">
        <div
          class="activity-intro-mark activity-intro-mark--recent"
          aria-hidden="true"
        >
          <span>100</span>
          <small>MAX</small>
        </div>
        <div>
          <h1 id="recent-title">回到刚刚处理的内容</h1>
          <p>
            只记录成功进入的目录，以及成功打开或预览的文件；同一路径只保留最新一次。
          </p>
        </div>
        <span class="activity-private-state">
          <i class="material-icons" aria-hidden="true">lock_outline</i>
          用户私有
        </span>
      </section>

      <section
        v-if="recentStore.error"
        class="activity-state activity-state--error"
      >
        <i class="material-icons" aria-hidden="true">cloud_off</i>
        <div>
          <strong>无法读取最近访问</strong>
          <p>{{ recentStore.error }}</p>
        </div>
        <button type="button" @click="load">重试</button>
      </section>

      <section
        v-else-if="recentStore.loading && !recentStore.loaded"
        class="activity-list activity-list--loading"
        aria-label="正在加载最近访问"
      >
        <div
          v-for="index in 6"
          :key="index"
          class="activity-skeleton activity-skeleton--slim"
        ></div>
      </section>

      <section
        v-else-if="recentStore.items.length === 0"
        class="activity-empty"
      >
        <div aria-hidden="true"><i class="material-icons">schedule</i></div>
        <h2>还没有最近访问</h2>
        <p>成功进入目录或打开文件后，会出现在这里。</p>
        <router-link to="/files/">浏览文件</router-link>
      </section>

      <section v-else class="recent-list" aria-label="最近访问列表">
        <router-link
          v-for="entry in recentStore.items"
          :key="entry.id"
          :to="entryRoute(entry)"
          class="recent-entry"
        >
          <span class="recent-entry-icon" :class="{ folder: entry.isDir }">
            <i class="material-icons" aria-hidden="true">{{
              entry.isDir ? "folder" : getFileIcon(entry.name)
            }}</i>
          </span>
          <span class="recent-entry-copy">
            <strong :title="entry.name">{{ entry.name }}</strong>
            <small :title="entry.path">{{ entry.path }}</small>
          </span>
          <time :datetime="new Date(entry.accessedAt).toISOString()">
            {{ dayjs(entry.accessedAt).fromNow() }}
          </time>
          <i class="material-icons recent-entry-arrow" aria-hidden="true"
            >chevron_right</i
          >
        </router-link>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted } from "vue";
import HeaderBar from "@/components/header/HeaderBar.vue";
import type { RecentEntry } from "@/api/recent";
import { useRecentStore } from "@/stores/recent";
import dayjs from "@/utils/date";
import { getFileIcon } from "@/utils/fileIcons";
import { encodePath } from "@/utils/url";
import { resourceOpenRoute } from "@/utils/archivePath";

const recentStore = useRecentStore();
const $showError = inject<IToastError>("$showError")!;

async function load() {
  try {
    await recentStore.load();
  } catch (error) {
    $showError(error as Error, false);
  }
}

function entryRoute(entry: RecentEntry) {
  const suffix = entry.isDir && entry.path !== "/" ? "/" : "";
  return resourceOpenRoute({
    isDir: entry.isDir,
    path: entry.path,
    url: `/files${encodePath(entry.path)}${suffix}`,
  });
}

onMounted(load);
</script>
