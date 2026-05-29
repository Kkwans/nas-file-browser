<template>
  <div class="card floating" id="share">
    <div class="card-title">
      <h2>{{ $t("buttons.share") }}</h2>
    </div>

    <template v-if="listing">
      <div class="card-content">
        <table>
          <tr>
            <th>#</th>
            <th>{{ $t("settings.shareDuration") }}</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>

          <tr v-for="link in links" :key="link.hash">
            <td>{{ link.hash }}</td>
            <td>
              <template v-if="link.expire !== 0">{{
                humanTime(link.expire)
              }}</template>
              <template v-else>{{ $t("permanent") }}</template>
            </td>
            <td class="small">
              <button
                class="action"
                :aria-label="$t('buttons.copyToClipboard')"
                :title="$t('buttons.copyToClipboard')"
                @click="copyToClipboard(buildLink(link))"
              >
                <i class="material-icons">content_paste</i>
              </button>
            </td>
            <td class="small">
              <button
                class="action"
                :aria-label="$t('buttons.copyDownloadLinkToClipboard')"
                :title="$t('buttons.copyDownloadLinkToClipboard')"
                :disabled="!!link.password_hash"
                @click="copyToClipboard(buildDownloadLink(link))"
              >
                <i class="material-icons">content_paste_go</i>
              </button>
            </td>
            <td class="small">
              <button
                class="action"
                @click="deleteLink($event, link)"
                :aria-label="$t('buttons.delete')"
                :title="$t('buttons.delete')"
              >
                <i class="material-icons">delete</i>
              </button>
            </td>
          </tr>
        </table>
      </div>

      <div class="card-action">
        <button
          class="button button--flat button--grey"
          @click="closeHovers"
          :aria-label="$t('buttons.close')"
          :title="$t('buttons.close')"
          tabindex="2"
        >
          {{ $t("buttons.close") }}
        </button>
        <button
          id="focus-prompt"
          class="button button--flat button--blue"
          @click="switchListing"
          :aria-label="$t('buttons.new')"
          :title="$t('buttons.new')"
          tabindex="1"
        >
          {{ $t("buttons.new") }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="card-content">
        <p>{{ $t("settings.shareDuration") }}</p>
        <div class="input-group input">
          <vue-number-input
            center
            controls
            size="small"
            :max="2147483647"
            :min="0"
            @keyup.enter="submit"
            v-model="time"
            tabindex="1"
          />
          <select
            class="right"
            v-model="unit"
            :aria-label="$t('time.unit')"
            tabindex="2"
          >
            <option value="seconds">{{ $t("time.seconds") }}</option>
            <option value="minutes">{{ $t("time.minutes") }}</option>
            <option value="hours">{{ $t("time.hours") }}</option>
            <option value="days">{{ $t("time.days") }}</option>
          </select>
        </div>
        <p>{{ $t("prompts.optionalPassword") }}</p>
        <input
          class="input input--block"
          type="password"
          v-model.trim="password"
          tabindex="3"
        />
      </div>

      <div class="card-action">
        <button
          class="button button--flat button--grey"
          @click="switchListing"
          :aria-label="$t('buttons.cancel')"
          :title="$t('buttons.cancel')"
          tabindex="5"
        >
          {{ $t("buttons.cancel") }}
        </button>
        <button
          id="focus-prompt"
          class="button button--flat button--blue"
          @click="submit"
          :aria-label="$t('buttons.share')"
          :title="$t('buttons.share')"
          tabindex="4"
        >
          {{ $t("buttons.share") }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeMount, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import * as api from "@/api/index";
import dayjs from "dayjs";
import type { Share } from "@/types/api";
import type { Resource } from "@/types/file";
import { copy } from "@/utils/clipboard";

const { t } = useI18n();
const route = useRoute();

const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<(msg: string) => void>("$showSuccess")!;

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers } = layoutStore;

const { req, selected, selectedCount, isListing } = storeToRefs(fileStore);

const time = ref(0);
const unit = ref("hours");
const links = ref<Share[]>([]);
const password = ref("");
const listing = ref(true);

const url = computed(() => {
  if (!isListing.value) {
    return route.path;
  }
  if (selectedCount.value === 0 || selectedCount.value > 1) {
    return undefined;
  }
  return req.value!.items[selected.value[0]].url;
});

onBeforeMount(async () => {
  try {
    const result = await api.share.get(url.value!);
    links.value = Array.isArray(result) ? result : [result];
    sortLinks();

    if (links.value.length === 0) {
      listing.value = false;
    }
  } catch (e: any) {
    $showError(e);
  }
});

const copyToClipboard = (text: string) => {
  copy({ text }).then(
    () => $showSuccess(t("success.linkCopied")),
    () => {
      copy({ text }, { permission: true }).then(
        () => $showSuccess(t("success.linkCopied")),
        (e: any) => $showError(e)
      );
    }
  );
};

const submit = async () => {
  try {
    let res = null;

    if (!time.value) {
      res = await api.share.create(url.value!, password.value);
    } else {
      res = await api.share.create(
        url.value!,
        password.value,
        String(time.value),
        unit.value
      );
    }

    links.value.push(res as unknown as Share);
    sortLinks();

    time.value = 0;
    unit.value = "hours";
    password.value = "";

    listing.value = true;
  } catch (e: any) {
    $showError(e);
  }
};

const deleteLink = async (event: Event, link: Share) => {
  event.preventDefault();
  try {
    await api.share.remove(link.hash);
    links.value = links.value.filter((item) => item.hash !== link.hash);

    if (links.value.length === 0) {
      listing.value = false;
    }
  } catch (e: any) {
    $showError(e);
  }
};

const humanTime = (time: number | string) =>
  dayjs(Number(time) * 1000).fromNow();

const buildLink = (share: Share) => api.share.getShareURL(share);

const buildDownloadLink = (share: Share) =>
  api.pub.getDownloadURL(
    { hash: share.hash, path: "", items: [], numDirs: 0, numFiles: 0, sorting: { by: "", asc: true } } as Resource,
    true
  );

const sortLinks = () => {
  links.value = links.value.sort((a: Share, b: Share) => {
    if (a.expire === 0) return -1;
    if (b.expire === 0) return 1;
    return new Date(a.expire).getTime() - new Date(b.expire).getTime();
  });
};

const switchListing = () => {
  if (links.value.length === 0 && !listing.value) {
    closeHovers();
  }
  listing.value = !listing.value;
};
</script>
