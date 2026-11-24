<template>
  <div class="page">
    <el-tabs v-model="tab">
      <el-tab-pane label="机构管理" name="org" />
      <el-tab-pane label="区域与床位" name="location" />
      <el-tab-pane label="护理人员" name="caregiver" />
      <el-tab-pane label="规则配置" name="rule" />
      <el-tab-pane label="审计日志" name="audit" />
    </el-tabs>
    <OrgPanel v-if="tab === 'org'" />
    <LocationPanel v-if="tab === 'location'" />
    <CaregiverPanel v-if="tab === 'caregiver'" />
    <RulePanel v-if="tab === 'rule'" />
    <AuditLogPanel v-if="tab === 'audit'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OrgPanel from './OrgPanel.vue';
import LocationPanel from './LocationPanel.vue';
import CaregiverPanel from './CaregiverPanel.vue';
import RulePanel from './RulePanel.vue';
import AuditLogPanel from './AuditLogPanel.vue';

const tab = ref('org');
</script>

<style scoped>
.page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
}
</style>