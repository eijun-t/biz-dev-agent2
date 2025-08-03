// OpenAI API用のヘルパー関数（Research Agent用）
import { OpenAIClient } from './openai-client';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIOptions {
  maxTokens?: number;
  temperature?: number;
}

// 通常のテキスト応答を取得
export async function callOpenAI(
  messages: Message[],
  options: OpenAIOptions = {}
): Promise<string> {
  const response = await OpenAIClient.generateBusinessIdeas(
    messages.map(m => m.content).join('\n\n'),
    1
  );
  
  // 最初のアイデアのタイトルと説明を結合して返す
  if (response && response.length > 0) {
    const idea = response[0];
    return `${idea.title}\n${idea.description}`;
  }
  
  throw new Error('No response from OpenAI');
}

// JSON形式の応答を取得
export async function callOpenAIForJSON<T = any>(
  messages: Message[]
): Promise<T> {
  const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const fullPrompt = `${prompt}\n\nRespond with valid JSON only.`;
  
  const response = await OpenAIClient.generateBusinessIdeas(fullPrompt, 1);
  
  if (response && response.length > 0) {
    try {
      // descriptionにJSONが含まれている場合を想定
      const jsonStr = response[0].description;
      return JSON.parse(jsonStr);
    } catch (error) {
      // フォールバック: 応答全体をJSONとして解析
      return response[0] as any as T;
    }
  }
  
  throw new Error('No JSON response from OpenAI');
}