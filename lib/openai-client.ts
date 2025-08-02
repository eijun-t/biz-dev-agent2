// OpenAI APIクライアント
import OpenAI from 'openai'
import { ApiError } from './error-handler'

// OpenAIクライアントのシングルトンインスタンス
let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new ApiError(
        'OPENAI_API_KEY is not configured',
        'MISSING_API_KEY',
        500
      )
    }

    openaiClient = new OpenAI({
      apiKey,
      // タイムアウト設定
      timeout: 60000, // 60秒
      maxRetries: 2
    })
  }

  return openaiClient
}

// OpenAI API呼び出しのラッパー関数
export async function callOpenAI(
  messages: OpenAI.ChatCompletionMessageParam[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    responseFormat?: { type: 'json_object' } | { type: 'text' }
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 4000,
    responseFormat
  } = options

  try {
    const client = getOpenAIClient()
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat
    })

    const content = completion.choices[0]?.message?.content
    
    if (!content) {
      throw new ApiError(
        'No response content from OpenAI',
        'EMPTY_RESPONSE',
        500
      )
    }

    return content
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new ApiError(
        `OpenAI API error: ${error.message}`,
        'OPENAI_API_ERROR',
        error.status || 500,
        {
          type: error.type,
          code: error.code
        }
      )
    }
    
    throw error
  }
}

// JSON形式でレスポンスを取得
export async function callOpenAIForJSON<T = any>(
  messages: OpenAI.ChatCompletionMessageParam[],
  options: Omit<Parameters<typeof callOpenAI>[1], 'responseFormat'> = {}
): Promise<T> {
  const response = await callOpenAI(messages, {
    ...options,
    responseFormat: { type: 'json_object' }
  })

  try {
    return JSON.parse(response) as T
  } catch (error) {
    throw new ApiError(
      'Failed to parse OpenAI JSON response',
      'JSON_PARSE_ERROR',
      500,
      { response }
    )
  }
}

// ストリーミングレスポンス用の関数
export async function* streamOpenAI(
  messages: OpenAI.ChatCompletionMessageParam[],
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = 'gpt-4-turbo-preview',
    temperature = 0.7,
    maxTokens = 4000
  } = options

  try {
    const client = getOpenAIClient()
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new ApiError(
        `OpenAI streaming error: ${error.message}`,
        'OPENAI_STREAM_ERROR',
        error.status || 500
      )
    }
    
    throw error
  }
}