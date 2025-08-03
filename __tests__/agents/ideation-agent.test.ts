import { IdeationAgent } from '@/lib/agents/ideation-agent';
import { OpenAIClient } from '@/lib/openai-client';
import { supabase } from '@/lib/supabase';
import { MarketData, SessionContext } from '@/types/memory';

// モック設定
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('@/lib/openai-client', () => ({
  OpenAIClient: {
    withRetry: jest.fn(),
    generateBusinessIdeas: jest.fn(),
    enhanceWithAssets: jest.fn(),
    addNetworkScenarios: jest.fn()
  }
}));

describe('IdeationAgent', () => {
  let ideationAgent: IdeationAgent;
  let mockContext: SessionContext;
  let mockMarketData: MarketData;

  beforeEach(() => {
    ideationAgent = new IdeationAgent();
    
    mockContext = {
      sessionId: 'test-session-123',
      userInput: null,
      marketData: undefined
    };

    mockMarketData = {
      trends: [
        {
          category: 'AI/ML',
          trend_name: 'テストトレンド',
          description: 'テスト説明',
          market_size: 5000,
          growth_rate: 30,
          relevance_score: 8
        }
      ],
      technologies: [],
      regulations: [],
      opportunities: []
    };

    // Supabaseモックのリセット
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'progress_tracking') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      } else if (table === 'mitsubishi_assets') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'test-asset-1',
                name: '丸の内ビル',
                asset_type: 'urban_development',
                description: 'テストアセット'
              }
            ],
            error: null
          })
        };
      } else if (table === 'network_companies') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'test-company-1',
                name: 'テスト企業',
                company_type: 'tenant'
              }
            ],
            error: null
          })
        };
      } else if (table === 'business_ideas') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'saved-idea-1',
                  title: '保存されたアイデア',
                  description: 'テスト',
                  market_size: 2000
                }
              ],
              error: null
            })
          })
        };
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('市場データに基づいてビジネスアイデアを生成できること', async () => {
      // OpenAI APIのモック設定
      const mockIdeas = [
        {
          title: 'AIビル管理システム',
          description: 'AIを活用したスマートビル管理',
          target_market: '不動産管理会社',
          market_size: 3000,
          revenue_model: 'SaaS',
          tam: 5000,
          sam: 1000,
          som: 100,
          estimated_profit_margin: 15
        }
      ];

      (OpenAIClient.withRetry as jest.Mock).mockImplementation((fn) => fn());
      (OpenAIClient.generateBusinessIdeas as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas)
      );
      (OpenAIClient.enhanceWithAssets as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas.map((idea, i) => ({
          ...idea,
          asset_utilization: ['丸の内ビル'],
          asset_synergy: 'ビル管理の実証実験場として活用'
        })))
      );
      (OpenAIClient.addNetworkScenarios as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas.map((idea, i) => ({
          ...idea,
          network_partners: ['テスト企業'],
          network_scenario: 'テナント企業との協業'
        })))
      );

      // テスト実行
      const result = await ideationAgent.generate(mockMarketData, mockContext);

      // 検証
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'AIビル管理システム',
        market_size: 3000,
        projected_profit: expect.any(Number)
      });

      // OpenAI APIが呼ばれたことを確認
      expect(OpenAIClient.generateBusinessIdeas).toHaveBeenCalledWith(mockMarketData, 5);
      
      // Supabaseに保存されたことを確認
      expect(supabase.from).toHaveBeenCalledWith('business_ideas');
    });

    it('市場規模1000億円以上のアイデアのみ生成すること', async () => {
      const mockIdeas = [
        {
          title: '大規模AIプラットフォーム',
          description: 'エンタープライズ向けAI基盤',
          target_market: '大企業',
          market_size: 1500, // 1000億円以上
          revenue_model: 'ライセンス',
          tam: 3000,
          sam: 500,
          som: 50,
          estimated_profit_margin: 20
        }
      ];

      (OpenAIClient.withRetry as jest.Mock).mockImplementation((fn) => fn());
      (OpenAIClient.generateBusinessIdeas as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas)
      );

      const result = await ideationAgent.generate(mockMarketData, mockContext);

      expect(result[0].market_size).toBeGreaterThanOrEqual(1000);
    });

    it('簡易的な収益性評価を行うこと', async () => {
      const mockIdeas = [
        {
          title: 'テストアイデア',
          description: 'テスト',
          market_size: 2000,
          tam: 5000,
          sam: 1000,
          som: 100,
          estimated_profit_margin: 10
        }
      ];

      (OpenAIClient.withRetry as jest.Mock).mockImplementation((fn) => fn());
      (OpenAIClient.generateBusinessIdeas as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas)
      );

      const result = await ideationAgent.generate(mockMarketData, mockContext);

      // 収益性評価が行われていることを確認
      expect(result[0].projected_profit).toBeDefined();
      expect(result[0].projected_profit).toBeGreaterThan(0);
      expect(result[0].initial_investment).toBeDefined();
    });

    it('エラーが発生した場合、エラーを隠蔽せずに投げること', async () => {
      // OpenAI APIエラーをシミュレート
      (OpenAIClient.withRetry as jest.Mock).mockRejectedValue(
        new Error('OpenAI API error')
      );

      await expect(
        ideationAgent.generate(mockMarketData, mockContext)
      ).rejects.toThrow('ビジネスアイデア生成で予期しないエラーが発生しました');

      // エラートラッキングが記録されていることを確認
      expect(supabase.from).toHaveBeenCalledWith('progress_tracking');
    });

    it('進捗状況を適切に更新すること', async () => {
      const mockIdeas = [{ title: 'テスト', market_size: 1000 }];
      (OpenAIClient.withRetry as jest.Mock).mockImplementation((fn) => fn());
      (OpenAIClient.generateBusinessIdeas as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas)
      );

      await ideationAgent.generate(mockMarketData, mockContext);

      // 進捗更新が複数回呼ばれていることを確認
      const progressCalls = (supabase.from as jest.Mock).mock.calls
        .filter(call => call[0] === 'progress_tracking');
      
      expect(progressCalls.length).toBeGreaterThan(5); // 開始、各ステップ、完了
    });
  });

  describe('fetchMitsubishiAssets', () => {
    it('アセット取得に失敗した場合、デフォルトデータを返すこと', async () => {
      // Supabaseエラーをシミュレート
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'mitsubishi_assets') {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          };
        }
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      });

      const mockIdeas = [{ title: 'テスト', market_size: 1000 }];
      (OpenAIClient.withRetry as jest.Mock).mockImplementation((fn) => fn());
      (OpenAIClient.generateBusinessIdeas as jest.Mock).mockResolvedValue(
        JSON.stringify(mockIdeas)
      );

      // エラーでも処理が継続することを確認
      const result = await ideationAgent.generate(mockMarketData, mockContext);
      expect(result).toBeDefined();
    });
  });
});