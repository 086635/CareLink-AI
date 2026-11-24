<template>
  <el-card shadow="never">
    <template #header>操作审计日志</template>
    <el-form inline style="margin-bottom: 12px">
      <el-form-item label="对象类型">
        <el-select v-model="query.objectType" clearable placeholder="全部" style="width: 160px">
          <el-option v-for="t in objectTypes" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="rows" border stripe>
      <el-table-column prop="createdAt" label="时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="operatorId" label="操作人ID" width="120" />
      <el-table-column prop="objectType" label="对象类型" width="140" />
      <el-table-column prop="objectId" label="对象ID" width="120" />
      <el-table-column prop="action" label="操作" width="90" />
      <el-table-column prop="summary" label="变更摘要（已脱敏）" min-width="260" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="130" />
    </el-table>
    <el-pagination
      v-model:current-page="query.page"
      :page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 12px; justify-content: flex-end"
      @current-change="load"
    />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { http } from '@/api';

const objectTypes = [
  'ORG', 'LOCATION', 'CAREGIVER', 'ELDER', 'DEVICE', 'DEVICE_BINDING',
  'CARE_EVENT', 'CARE_TASK', 'CARE_RECORD', 'HANDOVER', 'RULE_CONFIG', 'SIMULATOR',
];

const query = reactive({ page: 1, pageSize: 20, objectType: '' });
const rows = ref<Record<string, unknown>[]>([]);
const total = ref(0);

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN');
}

async function load() {
  const res = await http.get<{ list: Record<string, unknown>[]; total: number }>('/v1/audit-logs', {
    params: { page: query.page, pageSize: query.pageSize, objectType: query.objectType || undefined },
  });
  rows.value = res.data.list;
  total.value = res.data.total;
}

onMounted(load);
</script>