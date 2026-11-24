<template>
  <el-card shadow="never">
    <template #header>
      <div class="panel-header">
        <span>区域与床位层级（楼栋 → 楼层 → 房间 → 床位）</span>
        <el-button type="primary" size="small" @click="openCreate(null)">新增楼栋</el-button>
      </div>
    </template>
    <el-tree :data="treeData" node-key="id" default-expand-all>
      <template #default="{ data }">
        <div class="tree-node">
          <span>{{ levelLabel(data.level) }} · {{ data.name }}</span>
          <span v-if="data.level === 'BED'" class="bed-status">
            <el-tag v-if="data.bedStatus === 'OCCUPIED'" type="success" size="small">在护：{{ data.currentElderName }}</el-tag>
            <el-tag v-else type="info" size="small">空闲</el-tag>
          </span>
          <span class="node-actions">
            <el-button
              v-if="data.level !== 'BED'"
              link type="primary" size="small"
              @click.stop="openCreate(data)"
            >新增下级</el-button>
            <el-button link type="primary" size="small" @click.stop="openRename(data)">重命名</el-button>
          </span>
        </div>
      </template>
    </el-tree>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="420px">
      <el-form @submit.prevent="onSubmit">
        <el-form-item label="名称">
          <el-input v-model="dialog.name" placeholder="如：A栋 / 2层 / 203房 / 03床" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.loading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { LocationLevel } from '@carelink/shared-types';
import type { LocationDto } from '@carelink/shared-types';
import { http } from '@/api';

const treeData = ref<LocationDto[]>([]);

const dialog = reactive({
  visible: false,
  mode: 'create' as 'create' | 'rename',
  title: '',
  name: '',
  parentId: null as string | null,
  level: LocationLevel.BUILDING,
  editId: '',
  loading: false,
});

const CHILD_LEVEL: Record<string, LocationLevel> = {
  BUILDING: LocationLevel.FLOOR,
  FLOOR: LocationLevel.ROOM,
  ROOM: LocationLevel.BED,
};

const LEVEL_LABEL: Record<string, string> = {
  BUILDING: '楼栋',
  FLOOR: '楼层',
  ROOM: '房间',
  BED: '床位',
};

function levelLabel(level: string): string {
  return LEVEL_LABEL[level] ?? level;
}

async function loadTree() {
  const res = await http.get<LocationDto[]>('/v1/locations/tree');
  treeData.value = res.data;
}

onMounted(loadTree);

function openCreate(parent: LocationDto | null) {
  dialog.mode = 'create';
  dialog.name = '';
  if (parent) {
    dialog.title = `新增下级（${levelLabel(CHILD_LEVEL[parent.level])}）`;
    dialog.parentId = parent.id;
    dialog.level = CHILD_LEVEL[parent.level];
  } else {
    dialog.title = '新增楼栋';
    dialog.parentId = null;
    dialog.level = LocationLevel.BUILDING;
  }
  dialog.visible = true;
}

function openRename(node: LocationDto) {
  dialog.mode = 'rename';
  dialog.title = '重命名';
  dialog.name = node.name;
  dialog.editId = node.id;
  dialog.visible = true;
}

async function onSubmit() {
  if (!dialog.name) {
    ElMessage.warning('请输入名称');
    return;
  }
  dialog.loading = true;
  try {
    if (dialog.mode === 'create') {
      await http.post('/v1/locations', {
        parentId: dialog.parentId ?? undefined,
        level: dialog.level,
        name: dialog.name,
      });
    } else {
      await http.put(`/v1/locations/${dialog.editId}`, { name: dialog.name });
    }
    dialog.visible = false;
    await loadTree();
    ElMessage.success('操作成功');
  } catch (err) {
    ElMessage.error((err as Error).message);
  } finally {
    dialog.loading = false;
  }
}
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.node-actions {
  margin-left: auto;
}
</style>