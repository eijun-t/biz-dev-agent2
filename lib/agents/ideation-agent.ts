import { BaseAgent } from './base-agent';
import { OpenAIClient } from '../openai-client';
import { supabaseAdmin } from '../supabase-admin';
import { ApiError, DataQualityError } from '../error-handler';
import {
  BusinessIdea,
  MarketData,
  MitsubishiAssets,
  NetworkConnections,
  SessionContext,
  AssetDetails
} from '../../types/memory';

export class IdeationAgent extends BaseAgent {
  async generate(marketData: MarketData, context: SessionContext): Promise<BusinessIdea[]> {
    const sessionId = context.sessionId;
    
    try {
      await this.updateProgress(sessionId, 'ideation_agent', 0, 'アイディエーション開始', 'started');
      
      // 三菱地所アセットとネットワークデータの取得
      const mitsubishiAssets = await this.fetchMitsubishiAssets();
      const networkData = await this.fetchNetworkData();
      
      // 制約なく自由にアイディエーション
      await this.updateProgress(sessionId, 'ideation_agent', 20, 'ビジネスアイデア生成中');
      const ideas = await this.generateBusinessIdeas(marketData, context);
      
      // 簡易的なアセット・ネットワーク活用の追加
      await this.updateProgress(sessionId, 'ideation_agent', 40, '既存アセットとの組み合わせ検討中');
      const enhancedIdeas = await this.addSimpleAssetUtilization(ideas, mitsubishiAssets, context);
      
      await this.updateProgress(sessionId, 'ideation_agent', 60, '企業ネットワーク連携シナリオ作成中');
      const finalIdeas = await this.addSimpleNetworkScenarios(enhancedIdeas, networkData, context);
      
      // 簡易的な収益性評価
      await this.updateProgress(sessionId, 'ideation_agent', 80, '収益性評価中');
      const evaluatedIdeas = await this.evaluateProfitability(finalIdeas, marketData, context);
      
      // Supabaseに保存
      await this.updateProgress(sessionId, 'ideation_agent', 90, 'データ保存中');
      const savedIdeas = await this.saveIdeasToDatabase(evaluatedIdeas, sessionId);
      
      await this.updateProgress(sessionId, 'ideation_agent', 100, 'アイディエーション完了', 'completed');
      
      return savedIdeas;
    } catch (error) {
      await this.updateProgress(sessionId, 'ideation_agent', 0, 'エラーが発生しました', 'error');
      throw error;
    }
  }
  
  private async generateBusinessIdeas(
    marketData: MarketData,
    context: SessionContext
  ): Promise<BusinessIdea[]> {
    return this.executeWithErrorHandling(
      async () => {
        const response = await OpenAIClient.withRetry(
          () => OpenAIClient.generateBusinessIdeas(marketData, 5)
        );
        
        try {
          // JSONコードブロックマーカーを除去
          const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const ideas = JSON.parse(cleanedResponse);
          
          if (!Array.isArray(ideas) || ideas.length === 0) {
            throw new DataQualityError('生成されたアイデアが無効な形式です');
          }
          
          // 基本的なバリデーション
          return ideas.map((idea: any, index: number) => ({
            id: `temp-${Date.now()}-${index}`,
            session_id: context.sessionId,
            title: idea.title || 'アイデア名未設定',
            description: idea.description || '',
            target_market: idea.target_market || '',
            market_size: idea.market_size || 0,
            revenue_model: idea.revenue_model || '',
            initial_investment: 0, // 後で詳細化
            projected_profit: 0, // 後で計算
            timeline: '5-10年',
            mitsubishi_assets: [],
            capability_utilization: {},
            is_selected: false,
            created_at: new Date().toISOString(),
            tam: idea.tam || 0,
            sam: idea.sam || 0,
            som: idea.som || 0,
            estimated_profit_margin: idea.estimated_profit_margin || 10
          }));
        } catch (error) {
          throw new DataQualityError(`アイデア解析エラー: ${(error as Error).message}`);
        }
      },
      'ビジネスアイデア生成',
      context.sessionId
    );
  }
  
  private async addSimpleAssetUtilization(
    ideas: BusinessIdea[],
    assets: MitsubishiAssets,
    context: SessionContext
  ): Promise<BusinessIdea[]> {
    return this.executeWithErrorHandling(
      async () => {
        const response = await OpenAIClient.withRetry(
          () => OpenAIClient.enhanceWithAssets(ideas, assets)
        );
        
        try {
          // JSONコードブロックマーカーを除去
          const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const enhancedIdeas = JSON.parse(cleanedResponse);
          
          return ideas.map((idea, index) => ({
            ...idea,
            mitsubishi_assets: enhancedIdeas[index]?.asset_utilization || [],
            asset_synergy: enhancedIdeas[index]?.asset_synergy || ''
          }));
        } catch (error) {
          console.warn('アセット活用の追加に失敗しました:', error);
          return ideas; // エラー時は元のアイデアを返す
        }
      },
      'アセット活用追加',
      context.sessionId
    );
  }
  
  private async addSimpleNetworkScenarios(
    ideas: BusinessIdea[],
    network: NetworkConnections,
    context: SessionContext
  ): Promise<BusinessIdea[]> {
    return this.executeWithErrorHandling(
      async () => {
        const response = await OpenAIClient.withRetry(
          () => OpenAIClient.addNetworkScenarios(ideas, network)
        );
        
        try {
          // JSONコードブロックマーカーを除去
          const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const enhancedIdeas = JSON.parse(cleanedResponse);
          
          return ideas.map((idea, index) => ({
            ...idea,
            network_partners: enhancedIdeas[index]?.network_partners || [],
            network_scenario: enhancedIdeas[index]?.network_scenario || ''
          }));
        } catch (error) {
          console.warn('ネットワークシナリオの追加に失敗しました:', error);
          return ideas; // エラー時は元のアイデアを返す
        }
      },
      'ネットワークシナリオ追加',
      context.sessionId
    );
  }
  
  private async evaluateProfitability(
    ideas: BusinessIdea[],
    marketData: MarketData,
    context: SessionContext
  ): Promise<BusinessIdea[]> {
    return ideas.map(idea => {
      // 簡易的な収益性評価（TAM/SAM/SOM × 利益率）
      const som = idea.som || idea.market_size * 0.01; // SOMがない場合は市場規模の1%と仮定
      const profitMargin = idea.estimated_profit_margin || 10; // デフォルト10%
      const estimatedAnnualRevenue = som * 0.1; // SOMの10%を年間売上と仮定
      const estimatedAnnualProfit = estimatedAnnualRevenue * (profitMargin / 100);
      
      return {
        ...idea,
        projected_profit: Math.round(estimatedAnnualProfit * 10) / 10, // 億円単位で四捨五入
        initial_investment: Math.round(estimatedAnnualRevenue * 2), // 年間売上の2倍を初期投資と仮定
        profitability_score: estimatedAnnualProfit >= 10 ? 'high' : 
                            estimatedAnnualProfit >= 5 ? 'medium' : 'low'
      };
    });
  }
  
  private async fetchMitsubishiAssets(): Promise<MitsubishiAssets> {
    const { data, error } = await supabaseAdmin
      .from('mitsubishi_assets')
      .select('*');
    
    if (error) {
      console.warn('三菱地所アセットの取得に失敗しました:', error);
      // デフォルトデータを返す
      return {
        marunouchi: {
          id: 'default-marunouchi',
          name: '丸の内エリア',
          type: 'urban_development',
          description: '東京駅前の大規模オフィス街区',
          capabilities: {},
          location: '東京都千代田区'
        },
        minatomirai: {
          id: 'default-minatomirai',
          name: 'みなとみらいエリア',
          type: 'urban_development',
          description: '横浜の複合都市開発',
          capabilities: {},
          location: '神奈川県横浜市'
        },
        outlets: [],
        residential: []
      };
    }
    
    // データを構造化して返す
    const assets: MitsubishiAssets = {
      marunouchi: data?.find(a => a.name.includes('丸の内')) || {} as AssetDetails,
      minatomirai: data?.find(a => a.name.includes('みなとみらい')) || {} as AssetDetails,
      outlets: data?.filter(a => a.asset_type === 'retail_facilities') || [],
      residential: data?.filter(a => a.asset_type === 'residential') || []
    };
    
    return assets;
  }
  
  private async fetchNetworkData(): Promise<NetworkConnections> {
    const { data, error } = await supabaseAdmin
      .from('network_companies')
      .select('*');
    
    if (error) {
      console.warn('ネットワーク企業の取得に失敗しました:', error);
      // デフォルトデータを返す
      return {
        tenant_companies: [],
        mitsubishi_group: [],
        partners: []
      };
    }
    
    return {
      tenant_companies: data?.filter(c => c.company_type === 'tenant') || [],
      mitsubishi_group: data?.filter(c => c.company_type === 'mitsubishi_group') || [],
      partners: data?.filter(c => c.company_type === 'partner') || []
    };
  }
  
  private async saveIdeasToDatabase(
    ideas: BusinessIdea[],
    sessionId: string
  ): Promise<BusinessIdea[]> {
    const ideasToSave = ideas.map(idea => ({
      session_id: sessionId,
      title: idea.title,
      description: idea.description,
      target_market: idea.target_market,
      market_size: idea.market_size,
      revenue_model: idea.revenue_model,
      initial_investment: idea.initial_investment,
      projected_profit: idea.projected_profit,
      timeline: idea.timeline,
      mitsubishi_assets: idea.mitsubishi_assets,
      capability_utilization: idea.capability_utilization,
      is_selected: false
    }));
    
    const { data, error } = await supabaseAdmin
      .from('business_ideas')
      .insert(ideasToSave)
      .select();
    
    if (error) {
      throw new ApiError(`アイデアの保存に失敗しました: ${error.message}`);
    }
    
    return data as BusinessIdea[];
  }
}