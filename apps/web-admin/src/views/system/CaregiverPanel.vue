<template>
  <el-card shadow="never">
    <template #header>
      <div class="panel-header">
        <span>护理人员管理</span>
        <el-button type="primary" size="small" @click="openCreate">新增人员</el-button>
      </div>
    </template>
    <el-table :data="list" border stripe>
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="联系方式" width="150" />
      <el-table-column prop="account" label="账号" width="140" />
      <el-table-column prop="role" label="角色" width="110">
        <template #default="{ row }">{{ roleLabel(row.role) }}</template>
      </el-table-column>
      <el-table-column prop="areaName" label="责任区域" width="120" />
      <el-table-column label="状态" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'DISABLED'" type="danger" size="small">已停用</el-tag>
          <el-tag v-else-if="row.onDuty" type="success" size="small">在岗</el-tag>
          <el-tag v-else type="info" size="small">离岗</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="200">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'ACTIVE'"
            link type="primary" size="small"
            @click="toggleDuty(row)"
          >{{ row.onDuty ? '设为离岗' : '设为在岗' }}</el-button>
          <el-button link type="primary" size="small" @click="toggleStatus(row)">
            {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" title="新增护理人员" width="480px">
      <el-form :model="dialog.form" label-width="90px">
        <el-form-item label="姓名">
          <el-input v-model="dialog.form.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="dialog.form.phone" />
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input v-model="dialog.form.account" />
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="dialog.form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="dialog.form.role" style="width: 100%">
            <el-option label="护理员" value="CG" />
            <el-option label="护理主管" value="SUP" />
            <el-option label="机构管理者" value="ADM" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.loading" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { CaregiverDto } from '@carelink/shared-types';
import { http } from '@/api';

const list = ref<CaregiverDto[]>([]);

const dialog = reactive({
  visible: false,
  loading: false,
  form: { name: '', phone: '', account: '', password: '', role: 'CG' as CaregiverDto['role'] },
});

function roleLabel(role: string): string {
  switch (role) {
    case 'ADM':
      return '机构管理者';
    case 'SUP':
      return '护理主管';
    case 'CG':
      return '护理员';
    default:
      return role;
  }
}

async function load() {
  const res = await http.get<CaregiverDto[]>('/v1/caregivers');
  list.value = res.data;
}

onMounted(load);

function openCreate() {
  dialog.form = { name: '', phone: '', account: '', password: '', role: 'CG' as CaregiverDto['role'] };
  dialog.visible = true;
}

async function onCreate() {
  dialog.loading = true;
  try {
    await http.post('/v1/caregivers', dialog.form);
    dialog.visible = false;
    await load();
    ElMessage.success('创建成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    dialog.loading = false;
  }
}

async function toggleDuty(row: CaregiverDto) {
  try {
    await http.put(`/v1/caregivers/${row.id}/duty`, { onDuty: !row.onDuty });
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

async function toggleStatus(row: CaregiverDto) {
  try {
    await http.put(`/v1/caregivers/${row.id}`, {
      status: row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    });
    await load();
  } catch (err) {
    ElMessage.error((err as Error).message);
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