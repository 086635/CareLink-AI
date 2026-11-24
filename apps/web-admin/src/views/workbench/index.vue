<template>
  <div class="page">
    <el-tabs v-model="tab">
      <el-tab-pane label="事件中心" name="events" />
      <el-tab-pane label="任务列表" name="tasks" />
      <el-tab-pane label="交接班" name="handover" />
    </el-tabs>
    <EventCenter ref="eventCenter" v-if="tab === 'events'" />
    <TaskList ref="taskList" v-if="tab === 'tasks'" />
    <HandoverPanel v-if="tab === 'handover'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createSocket, type ServerSocket } from '@carelink/api-client';
import EventCenter from './EventCenter.vue';
import TaskList from './TaskList.vue';
import HandoverPanel from './HandoverPanel.vue';
import { useAuthStore } from '@/stores/auth';

const tab = ref('events');
const eventCenter = ref<InstanceType<typeof EventCenter> | null>(null);
const taskList = ref<InstanceType<typeof TaskList> | null>(null);
const auth = useAuthStore();
let socket: ServerSocket | null = null;

onMounted(() => {
  socket = createSocket(() => auth.token);
  socket.on('event:created', () => {
    eventCenter.value?.load();
  });
  socket.on('task:assigned', () => {
    taskList.value?.load();
  });
  socket.on('task:transferred', () => {
    taskList.value?.load();
  });
  socket.on('task:timeout', () => {
    taskList.value?.load();
  });
  socket.connect();
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>

<style scoped>
.page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
}
</style>