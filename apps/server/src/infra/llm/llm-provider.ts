import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { ContextBundle, LlmOutput } from '@carelink/shared-types';

const DIAGNOSIS_BLACKLIST = [
  '诊断', '确诊', '疾病', '患病', '治疗', '用药', '处方', '感染',
  '糖尿病', '前列腺', '尿路感染', '肾炎', '失禁症',
];

const SYSTEM_PROMPT = `你是养老机构的照护记录助手。你必须遵守以下硬约束：
1. 只能基于所提供的真实数据生成内容，不得虚构任何护理记录或数据；
2. 不得输出任何诊断性、医学结论性内容（如疾病名称、治疗建议、用药建议）；
3. 数据不足时必须明确说明数据不足，不得编造规律；
4. 必须按给定的 JSON 结构输出：{"summary": string, "items": string[], "caveats": string[]}；
5. 输出语言为简体中文。`;

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

@Injectable()
export class LlmProvider {
  private readonly logger = new Logger(LlmProvider.name);

  private get config(): LlmConfig {
    return {
      baseUrl: process.env.LLM_BASE_URL as string,
      apiKey: process.env.LLM_API_KEY as string,
      model: process.env.LLM_MODEL as string,
    };
  }

  /**
   * FR-AI-011/012：受约束生成 → JSON 结构校验 + 诊断黑名单扫描（R025）
   * → 不通过重试 1 次 → 仍不通过降级为纯统计模板（degraded=true）。
   */
  async generate(bundle: ContextBundle, fallbackText: string): Promise<LlmOutput> {
    const userPrompt = this.buildUserPrompt(bundle);
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const content = await this.callChatCompletion(userPrompt);
        const parsed = this.parseAndValidate(content);
        if (parsed != null) {
          return { content: JSON.stringify(parsed), degraded: false };
        }
        this.logger.warn(`LLM 输出校验失败（第 ${attempt} 次），重试`);
      } catch (err) {
        this.logger.warn(`LLM 调用失败（第 ${attempt} 次）: ${(err as Error).message}`);
      }
    }
    // 降级：纯统计模板文本 + 降级标记（LLM 不可用时功能仍可用）
    return { content: JSON.stringify(this.fallbackContent(fallbackText)), degraded: true };
  }

  private buildUserPrompt(bundle: ContextBundle): string {
    return [
      `报告类型：${bundle.reportType}`,
      `数据范围：${bundle.dataRange.from} 至 ${bundle.dataRange.to}，来源：${bundle.dataRange.sources.join('、')}`,
      '以下是必须唯一依据的真实数据（JSON）：',
      JSON.stringify(bundle.facts, null, 2),
      '请基于且仅基于以上数据，按系统提示的 JSON 结构输出摘要。',
    ].join('\n');
  }

  private async callChatCompletion(userPrompt: string): Promise<string> {
    const { baseUrl, apiKey, model } = this.config;
    const res = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 30000,
      },
    );
    const content = res.data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('LLM 返回内容为空');
    }
    return content;
  }

  private parseAndValidate(content: string): { summary: string; items: string[]; caveats: string[] } | null {
    const jsonText = this.extractJson(content);
    if (!jsonText) return null;
    let parsed: { summary?: unknown; items?: unknown; caveats?: unknown };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return null;
    }
    if (typeof parsed.summary !== 'string' || parsed.summary.length === 0) return null;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.caveats)) return null;
    const allText = `${parsed.summary} ${(parsed.items as unknown[]).join(' ')}`;
    // R025：诊断性词汇黑名单扫描
    if (DIAGNOSIS_BLACKLIST.some((w) => allText.includes(w))) {
      this.logger.warn('LLM 输出命中诊断性词汇黑名单，判定校验不通过');
      return null;
    }
    return {
      summary: parsed.summary,
      items: (parsed.items as unknown[]).filter((i): i is string => typeof i === 'string'),
      caveats: (parsed.caveats as unknown[]).filter((i): i is string => typeof i === 'string'),
    };
  }

  private extractJson(content: string): string | null {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return content.slice(start, end + 1);
  }

  private fallbackContent(fallbackText: string): { summary: string; items: string[]; caveats: string[] } {
    return {
      summary: fallbackText,
      items: [],
      caveats: ['本摘要由确定性统计模板生成（LLM 服务不可用或输出未通过校验），内容与数据库记录一致（R021/R026）'],
    };
  }
}