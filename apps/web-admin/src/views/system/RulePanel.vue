<template>
  <el-card shadow="never">
    <template #header>
      <div class="panel-header">
        <span>规则配置（阈值类配置修改后即时生效，无需重启）</span>
        <el-button type="primary" size="small" :loading="saving" @click="onSave">保存全部</el-button>
      </div>
    </template>
    <el-alert
      title="尿湿触发阈值为演示默认值，需在硬件实验校准后调整（R007）"
      type="warning"
      :closable="false"
      style="margin-bottom: 16px"
    />
    <el-table :data="rules" border>
      <el-table-column prop="ruleKey" label="配置项" width="200" />
      <el-table-column prop="description" label="说明" width="220" />
      <el-table-column label="配置值（JSON）">
        <template #default="{ row }">
          <el-input
            v-model="row.ruleValueText"
            type="textarea"
            :rows="Math.min(Math.max(JSON.stringify(row.ruleValue).length / 60, 1), 6)"
          />
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { http } from '@/api';

interface RuleRow {
  id: string;
  ruleKey: string;
  description: string | null;
  ruleValue: Record<string, unknown>;
  ruleValueText: string;
}

const rules = ref<RuleRow[]>([]);
const saving = ref(false);

onMounted(load);

async function load() {
  const res = await http.get<RuleRow[]>('/v1/rules');
  rules.value = res.data.map((r: RuleRow) => ({
    ...r,
    ruleValueText: JSON.stringify(r.ruleValue, null, 2),
  }));
}

async function onSave() {
  saving.value = true;
  try {
    for (const rule of rules.value) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rule.ruleValueText);
      } catch {
        ElMessage.error(`${rule.ruleKey} 的配置值不是合法 JSON`);
        return;
      }
      await http.put(`/v1/rules/${rule.id}`, { ruleValue: parsed });
    }
    ElMessage.success('保存成功，已即时生效');
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>