export interface ContextBundle {
  reportType: string;
  dataRange: {
    from: string;
    to: string;
    sources: string[];
  };
  facts: Record<string, unknown>;
}

export interface LlmOutput {
  content: string;
  degraded: boolean;
}

export interface LlmProvider {
  generate(bundle: ContextBundle): Promise<LlmOutput>;
}

export interface AiReportContent {
  summary: string;
  items: string[];
  caveats: string[];
}