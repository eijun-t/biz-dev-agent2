import { ApiError, ErrorHandler } from './error-handler';

interface OpenAIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private defaultModel = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    this.apiKey = apiKey;
  }

  /**
   * テキスト生成
   */
  async generate(
    prompt: string,
    options: OpenAIRequestOptions = {}
  ): Promise<OpenAIResponse> {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2000,
      systemPrompt,
      responseFormat = 'text',
    } = options;

    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    // JSON形式のレスポンスを要求する場合
    if (responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
      // JSONレスポンスを要求する場合は、プロンプトにもその旨を含める
      const lastMessage = messages[messages.length - 1];
      lastMessage.content += '\n\nPlease respond in valid JSON format.';
    }

    try {
      const response = await ErrorHandler.withRetry(
        async () => {
          const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new ApiError(
              `OpenAI API error: ${res.statusText}`,
              res.status,
              errorData.error?.code || 'OPENAI_ERROR',
              errorData
            );
          }

          return res.json();
        },
        2, // 最大2回まで再試行
        1000 // 初期遅延1秒
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ApiError(
          'No content in OpenAI response',
          500,
          'NO_CONTENT',
          response
        );
      }

      return {
        content,
        usage: response.usage,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `OpenAI API request failed: ${(error as Error).message}`,
        500,
        'REQUEST_FAILED',
        error
      );
    }
  }

  /**
   * データ分析用の構造化された応答を生成
   */
  async analyze(
    data: any,
    analysisPrompt: string,
    options: OpenAIRequestOptions = {}
  ): Promise<any> {
    const systemPrompt = options.systemPrompt || 
      'You are a data analyst. Analyze the provided data and respond with structured insights in JSON format.';

    const prompt = `
Data to analyze:
${JSON.stringify(data, null, 2)}

Analysis request:
${analysisPrompt}

Provide a structured analysis in JSON format.`;

    const response = await this.generate(prompt, {
      ...options,
      systemPrompt,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      throw new ApiError(
        'Failed to parse OpenAI JSON response',
        500,
        'JSON_PARSE_ERROR',
        { content: response.content, error: (error as Error).message }
      );
    }
  }

  /**
   * トークン数の推定（簡易版）
   */
  estimateTokens(text: string): number {
    // 簡易的な推定: 4文字 ≈ 1トークン（英語）、2文字 ≈ 1トークン（日本語）
    const japaneseChars = (text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g) || []).length;
    const otherChars = text.length - japaneseChars;
    return Math.ceil(japaneseChars / 2 + otherChars / 4);
  }
}