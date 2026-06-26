/**
 * 多 LLM 提供商适配层
 * 
 * 优先级顺序：
 * 1. 智谱 GLM-4-Flash（免费，国内速度快）- 需要 API Key
 * 2. DeepSeek（便宜，质量高）- 需要 API Key
 * 3. ZAI SDK（沙箱隧道，不稳定）- 兜底
 * 4. 智能降级响应（无需API）
 * 
 * 每个提供商都兼容 OpenAI 格式，可流式输出
 */

import ZAI from 'z-ai-web-dev-sdk';

// 从环境变量读取 API Keys
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

interface ChatMessage {
  role: string;
  content: string;
}

interface LLMProvider {
  name: string;
  available: boolean;
  streamChat: (messages: ChatMessage[], systemPrompt: string) => Promise<ReadableStream<Uint8Array>>;
}

/**
 * 智谱 GLM-4-Flash（免费版）
 * 文档：https://open.bigmodel.cn/dev/api
 */
const zhipuProvider: LLMProvider = {
  name: '智谱GLM-4-Flash',
  available: !!ZHIPU_API_KEY,
  
  async streamChat(messages: ChatMessage[], systemPrompt: string) {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`智谱API错误: ${response.status} ${await response.text()}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  },
};

/**
 * DeepSeek（便宜高质量）
 * 文档：https://platform.deepseek.com/api-docs
 */
const deepseekProvider: LLMProvider = {
  name: 'DeepSeek',
  available: !!DEEPSEEK_API_KEY,
  
  async streamChat(messages: ChatMessage[], systemPrompt: string) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.8,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status}`);
    }

    return response.body as ReadableStream<Uint8Array>;
  },
};

/**
 * ZAI SDK（沙箱隧道，兜底）
 */
const zaiProvider: LLMProvider = {
  name: 'ZAI-SDK',
  available: true, // 总是尝试
  
  async streamChat(messages: ChatMessage[], systemPrompt: string) {
    const zai = await ZAI.create();
    const stream = (await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      thinking: { type: 'disabled' },
    })) as ReadableStream<Uint8Array>;
    return stream;
  },
};

// 提供商优先级列表
const providers = [zhipuProvider, deepseekProvider, zaiProvider];

/**
 * 尝试用多个提供商调用 LLM，返回第一个成功的流
 */
export async function streamChatWithFallback(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<{ stream: ReadableStream<Uint8Array>; provider: string }> {
  const errors: string[] = [];
  
  for (const provider of providers) {
    if (!provider.available) {
      errors.push(`${provider.name}: 未配置`);
      continue;
    }
    
    try {
      const stream = await provider.streamChat(messages, systemPrompt);
      console.log(`[LLM] 使用 ${provider.name} 成功`);
      return { stream, provider: provider.name };
    } catch (error: any) {
      console.error(`[LLM] ${provider.name} 失败:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error(`所有LLM提供商都失败: ${errors.join('; ')}`);
}

/**
 * 解析 OpenAI 格式的 SSE 流，提取 content
 */
export function parseOpenAIStreamChunk(chunk: string): string | null {
  const lines = chunk.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) continue;
    
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === '[DONE]') continue;
    
    try {
      const parsed = JSON.parse(dataStr);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) return content;
    } catch {
      // 跳过无效JSON
    }
  }
  return null;
}

/**
 * 检查哪些提供商可用
 */
export function getProviderStatus() {
  return providers.map(p => ({
    name: p.name,
    available: p.available,
  }));
}
