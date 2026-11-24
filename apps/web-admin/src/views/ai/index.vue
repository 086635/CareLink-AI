<template>
  <div class="page">
    <el-card shadow="never">
      <template #header>
        <div class="panel-header">
          <span>个体化照护分析（L2 统计引擎，纯 SQL 确定性计算，FR-AI-012）</span>
          <div>
            <el-select v-model="elderId" filterable placeholder="选择老人" style="width: 220px">
              <el-option v-for="e in elders" :key="e.id" :label="`${e.name}（${e.bedLabel ?? '未分床'}）`" :value="e.id" />
            </el-select>
            <el-select v-model="days" style="width: 120px; margin-left: 8px">
              <el-option label="近 7 天" :value="7" />
              <el-option label="近 14 天" :value="14" />
              <el-option label="近 30 天" :value="30" />
            </el-select>
            <el-button type="primary" style="margin-left: 8px" @click="loadPatterns">分析</el-button>
            <el-button :loading="reportLoading" @click="generateReport">生成 AI 照护报告</el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="patterns?.insufficient"
        type="warning"
        :title="`数据不足，不生成规律结论：${patterns.insufficientReason}`"
        :closable="false"
        style="margin-bottom: 16px"
      />

      <template v-if="patterns && !patterns.insufficient">
        <el-row :gutter="12">
          <el-col :span="6">
            <el-statistic title="有效尿湿事件" :value="patterns.confirmedEventCount" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="日均更换次数" :value="patterns.changeFrequency.dailyAvg ?? 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均更换间隔(小时)" :value="patterns.changeFrequency.intervalAvgHours ?? 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="监测缺失时段" :value="patterns.offlineSpans.length" />
          </el-col>
        </el-row>

        <div ref="chartEl" style="height: 300px; margin-top: 20px" />

        <el-alert
          v-for="hint in patterns.anomalyHints"
          :key="hint.description"
          type="warning"
          :title="hint.description"
          :closable="false"
          style="margin-top: 8px"
        />

        <el-card shadow="never" style="margin-top: 16px" v-if="patterns.suggestions.length > 0">
          <template #header>检查时机建议（恒标"辅助建议"，R024/R027）</template>
          <div v-for="s in patterns.suggestions" :key="s.timeSlot" style="margin-bottom: 8px">
            <el-tag type="info">{{ s.timeSlot }} 时段</el-tag>
            <span style="margin-left: 8px">{{ s.basis }}</span>
          </div>
        </el-card>
      </template>
    </el-card>

    <el-card shadow="never" style="margin-top: 12px" v-if="report">
      <template #header>
        <div class="panel-header">
          <span>AI 照护报告</span>
          <el-tag type="warning" size="small">AI 生成 · 数据范围：{{ report.dataRange.description }}</el-tag>
        </div>
      </template>
      <p>{{ report.content.summary }}</p>
      <ul>
        <li v-for="item in report.content.items" :key="item">{{ item }}</li>
      </ul>
      <el-alert
        v-for="c in report.content.caveats"
        :key="c"
        type="info"
        :title="c"
        :closable="false"
      />
      <el-alert
        v-if="report.degradedFlag"
        type="warning"
        title="本报告由确定性统计模板降级生成（LLM 输出未通过校验或服务不可用）"
        :closable="false"
        style="margin-top: 8px"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { AiReportDto, ElderPatternDto, ElderDto } from '@carelink/shared-types';
import { http } from '@/api';

const elders = ref<ElderDto[]>([]);
const elderId = ref('');
const days = ref(14);
const patterns = ref<ElderPatternDto | null>(null);
const report = ref<AiReportDto | null>(null);
const reportLoading = ref(false);
const chartEl = ref<HTMLElement | null>(null);

async function loadPatterns() {
  if (!elderId.value) return;
  const res = await http.get<ElderPatternDto>(`/v1/ai/elders/${elderId.value}/patterns`, {
    params: { days: days.value },
  });
  patterns.value = res.data;
  if (!res.data.insufficient) {
    await nextTick();
    renderChart();
  }
}

function renderChart() {
  if (!chartEl.value || !patterns.value) return;
  const chart = echarts.init(chartEl.value);
  chart.setOption({
    title: { text: `尿湿相关事件时段分布（近 ${days.value} 天）` },
    tooltip: {},
    xAxis: { type: 'category', data: patterns.value.hourlyDistribution.map((s) => s.slot) },
    yAxis: { type: 'value', name: '已确认次数' },
    series: [{ type: 'bar', data: patterns.value.hourlyDistribution.map((s) => s.count), barMaxWidth: 40 }],
  });
}

async function generateReport() {
  if (!elderId.value) return;
  reportLoading.value = true;
  try {
    const res = await http.post<AiReportDto>(`/v1/ai/elders/${elderId.value}/reports`, {
      days: days.value,
    });
    report.value = res.data;
  } finally {
    reportLoading.value = false;
  }
}

onMounted(async () => {
  const res = await http.get<ElderDto[]>('/v1/elders');
  elders.value = res.data;
  if (res.data.length > 0) {
    elderId.value = res.data[0].id;
    await loadPatterns();
  }
});

watch(days, () => {
  void loadPatterns();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>