<template>
  <el-card shadow="never">
    <template #header>机构信息</template>
    <el-form :model="form" label-width="100px" style="max-width: 480px">
      <el-form-item label="机构名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="地址">
        <el-input v-model="form.address" />
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input v-model="form.contact" />
      </el-form-item>
      <el-form-item label="状态">
        <el-tag :type="org?.status === 'ENABLED' ? 'success' : 'danger'">
          {{ org?.status === 'ENABLED' ? '启用中' : '已停用' }}
        </el-tag>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="onSave">保存修改</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { OrgDto } from '@carelink/shared-types';
import { http } from '@/api';

const org = ref<OrgDto | null>(null);
const saving = ref(false);
const form = reactive({ name: '', address: '', contact: '' });

onMounted(async () => {
  const res = await http.get<OrgDto>('/v1/orgs/me');
  org.value = res.data;
  form.name = res.data.name;
  form.address = res.data.address ?? '';
  form.contact = res.data.contact ?? '';
});

async function onSave() {
  saving.value = true;
  try {
    await http.put(`/v1/orgs/${org.value?.id}`, form);
    ElMessage.success('保存成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>