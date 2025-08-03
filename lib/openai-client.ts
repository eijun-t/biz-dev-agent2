import { ApiError } from './error-handler';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIRequestOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
}

export class OpenAIClient {
  private static async makeRequest(
    messages: Array<{ role: string; content: string }>,
    options: OpenAIRequestOptions = {}
  ): Promise<any> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new ApiError('OpenAI API key is not configured');
    }

    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      max_tokens = 4000,
      system_prompt
    } = options;

    const finalMessages = system_prompt
      ? [{ role: 'system', content: system_prompt }, ...messages]
      : messages;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        temperature,
        max_tokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        `OpenAI API error: ${errorData.error?.message || response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  static async generateBusinessIdeas(
    marketData: any,
    count: number = 5,
    options: OpenAIRequestOptions = {}
  ): Promise<string> {
    const prompt = `市場データに基づいて、革新的なビジネスアイデアを${count}個生成してください。
    
市場データ:
${JSON.stringify(marketData, null, 2)}

要件:
- 市場規模1000億円以上のビジネスチャンス
- 5-10年で営業利益10億円達成可能な事業
- 制約なく自由にアイディエーション
- 各アイデアにTAM/SAM/SOMの簡易推定を含める

出力形式（JSON配列）:
[
  {
    "title": "事業名",
    "description": "事業概要",
    "target_market": "ターゲット市場",
    "market_size": 市場規模（億円）,
    "revenue_model": "収益モデル",
    "tam": TAM推定値（億円）,
    "sam": SAM推定値（億円）,
    "som": SOM推定値（億円）,
    "estimated_profit_margin": 想定利益率（%）
  }
]`;

    const messages = [{ role: 'user', content: prompt }];
    
    const result = await this.makeRequest(messages, {
      ...options,
      temperature: 0.8 // より創造的なアイデア生成のため高めに設定
    });
    
    return result;
  }

  static async selectCapabilitiesForIdeas(
    ideas: any[],
    capabilities: any[],
    options: OpenAIRequestOptions = {}
  ): Promise<string> {
    const prompt = `以下のビジネスアイデアそれぞれに最も適した三菱地所のケイパビリティを選択してください。

ビジネスアイデア:
${JSON.stringify(ideas.map(idea => ({
  title: idea.title,
  description: idea.description,
  target_market: idea.target_market
})), null, 2)}

三菱地所のケイパビリティ一覧:
${JSON.stringify(capabilities.map(cap => ({
  category: cap.category,
  name: cap.name,
  description: cap.description,
  assets: cap.assets,
  networks: cap.networks,
  strengths: cap.strengths
})), null, 2)}

要件:
- 各ビジネスアイデアの内容を深く理解し、最も相乗効果が期待できるケイパビリティを2つ選択
- なぜそのケイパビリティが適しているかの理由も含める

出力形式（JSON配列）:
[
  {
    "idea_index": 0,
    "selected_capabilities": ["都市開発力", "イノベーション力"],
    "selection_rationale": "スマートビル管理プラットフォームは、三菱地所の都市開発で保有する多数のビル群を実証フィールドとして活用でき、イノベーション力によりテクノロジー企業との連携も期待できるため"
  }
]`;

    const messages = [{ role: 'user', content: prompt }];
    return this.makeRequest(messages, options);
  }

  static async enhanceWithCapabilities(
    ideasWithSelectedCapabilities: any[],
    capabilities: any[],
    options: OpenAIRequestOptions = {}
  ): Promise<string> {
    const prompt = `以下のビジネスアイデアと選択されたケイパビリティに基づいて、具体的な活用シナリオを作成してください。

ビジネスアイデアと選択されたケイパビリティ:
${JSON.stringify(ideasWithSelectedCapabilities.map(idea => ({
  title: idea.title,
  description: idea.description,
  selected_capabilities: idea.selectedCapabilities
})), null, 2)}

三菱地所のケイパビリティ詳細:
${JSON.stringify(capabilities, null, 2)}

要件:
- 選択されたケイパビリティを活用した具体的なビジネス加速シナリオを作成
- "三菱地所の○○力を活かして、具体的には○○アセットや○○ネットワークを活用し、○○を実現してビジネスを加速できる"という形式
- 実在のアセット名（丸の内、みなとみらい等）や具体的なネットワーク（テナント企業、三菱グループ等）を含める

出力形式（JSON配列）:
[
  {
    "capability_categories": ["都市開発力", "イノベーション力"],
    "capability_scenario": "三菱地所の都市開発力を活かして、具体的には丸の内エリアの主要ビルを実証フィールドとして活用し、数千社のテナント企業と連携してスマートビル技術を導入・検証することでビジネスを加速できる。さらにイノベーション力により、TMIPやMec Industry DXセンターを通じてスタートアップ企業や大学との共同開発を推進し、最先端技術の実装を加速する"
  }
]`;

    const messages = [{ role: 'user', content: prompt }];
    
    const result = await this.makeRequest(messages, options);
    return result;
  }

  // 指数バックオフによる再試行メカニズム
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}