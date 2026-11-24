<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <el-input
            v-model="keyword"
            placeholder="按姓名搜索"
            style="width: 220px"
            clearable
            @keyup.enter="load"
          />
          <div>
            <el-button type="primary" @click="load">查询</el-button>
            <el-button v-if="canManage" type="primary" @click="openCreate">新增老人</el-button>
          </div>
        </div>
      </template>
      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">{{ row.gender === 'MALE' ? '男' : '女' }}</template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="bedLabel" label="床位" min-width="180" />
        <el-table-column prop="careLevel" label="护理等级" width="100">
          <template #default="{ row }">{{ 'L' + row.careLevel }}</template>
        </el-table-column>
        <el-table-column prop="mobility" label="行动能力" width="100">
          <template #default="{ row }">{{ mobilityLabel(row.mobility) }}</template>
        </el-table-column>
        <el-table-column prop="careNotes" label="照护要求" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row.id)">查看</el-button>
            <el-button v-if="canManage" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增老人' : '编辑老人'" width="520px">
      <el-form :model="dialog.form" label-width="100px">
        <el-form-item label="姓名">
          <el-input v-model="dialog.form.name" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="dialog.form.gender">
            <el-radio value="MALE">男</el-radio>
            <el-radio value="FEMALE">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="dialog.form.age" :min="0" :max="150" />
        </el-form-item>
        <el-form-item label="床位">
          <el-select v-model="dialog.form.bedLocationId" style="width: 100%">
            <el-option
              v-for="bed in beds"
              :key="bed.id"
              :label="bed.label"
              :value="bed.id"
              :disabled="bed.bedStatus === 'OCCUPIED' && bed.elderId !== dialog.form.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="护理等级">
          <el-select v-model="dialog.form.careLevel" style="width: 100%">
            <el-option label="L1 一般" :value="1" />
            <el-option label="L2 需协助" :value="2" />
            <el-option label="L3 全护理" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="行动能力">
          <el-select v-model="dialog.form.mobility" style="width: 100%">
            <el-option label="卧床" value="BEDRIDDEN" />
            <el-option label="行动受限" value="LIMITED" />
            <el-option label="可自主行动" value="MOBILE" />
          </el-select>
        </el-form-item>
        <el-form-item label="照护要求">
          <el-input v-model="dialog.form.careNotes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.loading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { UserRole } from '@carelink/shared-types';
import type { ElderDto } from '@carelink/shared-types';
import { http } from '@/api';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const canManage = computed(() => auth.user?.role === UserRole.ADM || auth.user?.role === UserRole.SUP);

const keyword = ref('');
const list = ref<ElderDto[]>([]);
const beds = ref<{ id: string; label: string; bedStatus: string; elderId: string | null }[]>([]);

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'edit',
  loading: false,
  form: {
    id: '',
    name: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    age: 70,
    bedLocationId: '',
    careLevel: 1,
    mobility: 'BEDRIDDEN' as 'BEDRIDDEN' | 'LIMITED' | 'MOBILE',
    careNotes: '',
  },
});

function mobilityLabel(mobility: string): string {
  switch (mobility) {
    case 'BEDRIDDEN':
      return '卧床';
    case 'LIMITED':
      return '行动受限';
    case 'MOBILE':
      return '可自主行动';
    default:
      return mobility;
  }
}

async function load() {
  const res = await http.get<ElderDto[]>('/v1/elders', {
    params: { keyword: keyword.value || undefined },
  });
  list.value = res.data;
}

async function loadBeds() {
  const res = await http.get<{ id: string; label: string; bedStatus: string; elderId: string | null }[]>(
    '/v1/locations/beds',
  );
  beds.value = res.data;
}

onMounted(() => {
  void load();
  void loadBeds();
});

function goDetail(id: string) {
  router.push(`/elder/${id}`);
}

function openCreate() {
  dialog.mode = 'create';
  dialog.form = {
    id: '',
    name: '',
    gender: 'MALE',
    age: 70,
    bedLocationId: '',
    careLevel: 1,
    mobility: 'BEDRIDDEN',
    careNotes: '',
  };
  dialog.visible = true;
}

function openEdit(row: ElderDto) {
  dialog.mode = 'edit';
  dialog.form = {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    bedLocationId: row.bedLocationId ?? '',
    careLevel: row.careLevel,
    mobility: row.mobility,
    careNotes: row.careNotes ?? '',
  };
  dialog.visible = true;
}

async function onSubmit() {
  dialog.loading = true;
  try {
    const payload = {
      name: dialog.form.name,
      gender: dialog.form.gender,
      age: dialog.form.age,
      bedLocationId: dialog.form.bedLocationId,
      careLevel: dialog.form.careLevel,
      mobility: dialog.form.mobility,
      careNotes: dialog.form.careNotes || undefined,
    };
    if (dialog.mode === 'create') {
      await http.post('/v1/elders', payload);
    } else {
      await http.put(`/v1/elders/${dialog.form.id}`, payload);
    }
    dialog.visible = false;
    await load();
    await loadBeds();
    ElMessage.success('操作成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    dialog.loading = false;
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>