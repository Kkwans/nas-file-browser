<template>
  <errors v-if="error" :errorCode="error.status" />
  <div class="row" v-else-if="!layoutStore.loading">
    <div class="column">
      <div class="card">
        <div class="card-title">
          <h2>用户管理</h2>
          <router-link to="/settings/users/new"
            ><button class="button">新建</button></router-link
          >
        </div>

        <div class="card-content full">
          <table>
            <tr>
              <th>用户名</th>
              <th>管理员</th>
              <th>作用域</th>
              <th></th>
            </tr>

            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>
                <i v-if="user.perm.admin" class="material-icons">done</i
                ><i v-else class="material-icons">close</i>
              </td>
              <td>{{ user.scope }}</td>
              <td class="small">
                <router-link :to="'/settings/users/' + user.id"
                  ><i class="material-icons">mode_edit</i></router-link
                >
              </td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import { users as api } from "@/api";
import Errors from "@/views/Errors.vue";
import { onMounted, ref } from "vue";
import { StatusError } from "@/api/utils";
import type { IUser } from "@/types/user";
const error = ref<StatusError | null>(null);
const users = ref<IUser[]>([]);

const layoutStore = useLayoutStore();

onMounted(async () => {
  layoutStore.loading = true;

  try {
    users.value = await api.getAll();
  } catch (err) {
    if (err instanceof Error) {
      error.value = err;
    }
  } finally {
    layoutStore.loading = false;
  }
});
</script>
