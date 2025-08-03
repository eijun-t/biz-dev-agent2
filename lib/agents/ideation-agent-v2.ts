import { BaseAgent } from './base-agent';
import { OpenAIClient } from '../openai-client';
import { supabaseAdmin } from '../supabase-admin';
import { ApiError } from '../error-handler';
import {
  BusinessIdea,
  MarketData,
  SessionContext
} from '../../types/memory';
import { MITSUBISHI_CAPABILITIES } from '../mitsubishi-capabilities';

export class IdeationAgentV2 extends BaseAgent {
  async generate(marketData: MarketData, context: SessionContext): Promise<BusinessIdea[]> {
    const sessionId = context.sessionId;
    
    try {
      await this.updateProgress(sessionId, 'ideation_agent_v2', 0, 'アイディエーション開始', 'started');
      
      // 1. ビジネスアイデアを生成（制約なく自由に）
      await this.updateProgress(sessionId, 'ideation_agent_v2', 20, 'ビジネスアイデア生成中');
      const ideas = await this.generateBusinessIdeas(marketData, context);
      
      // 2. 各アイデアに最適なケイパビリティを選択し、活用シナリオを生成
      await this.updateProgress(sessionId, 'ideation_agent_v2', 50, 'ケイパビリティ活用シナリオ作成中');
      const enhancedIdeas = await this.enhanceWithCapabilityScenarios(ideas, context);
      
      // 3. 簡易的な収益性評価
      await this.updateProgress(sessionId, 'ideation_agent_v2', 70, '収益性評価中');
      const evaluatedIdeas = await this.evaluateProfitability(enhancedIdeas);
      
      // 4. Supabaseに保存
      await this.updateProgress(sessionId, 'ideation_agent_v2', 90, 'データ保存中');
      const savedIdeas = await this.saveIdeasToDatabase(evaluatedIdeas, sessionId);
      
      // 保存後にケイパビリティ情報を再度マージ（DBには保存されないため）
      const finalIdeas = savedIdeas.map((savedIdea, index) => ({
        ...savedIdea,
        capability_scenario: (evaluatedIdeas[index] as any).capability_scenario || '',
        capability_categories: (evaluatedIdeas[index] as any).capability_categories || [],
        network_partners: (evaluatedIdeas[index] as any).network_partners || []
      }));
      
      await this.updateProgress(sessionId, 'ideation_agent_v2', 100, 'アイディエーション完了', 'completed');
      
      return finalIdeas;
    } catch (error) {
      await this.updateProgress(sessionId, 'ideation_agent_v2', 0, 'エラーが発生しました', 'error');
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
          () => OpenAIClient.generateBusinessIdeas(marketData, 5) // 5つのアイデアを生成（本番版）
        );
        
        try {
          const cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const ideas = JSON.parse(cleanedResponse);
          
          return ideas.map((idea: any, index: number) => ({
            id: `temp-${Date.now()}-${index}`,
            session_id: context.sessionId,
            title: idea.title || 'アイデア名未設定',
            description: idea.description || '',
            target_market: idea.target_market || '',
            market_size: idea.market_size || 0,
            revenue_model: idea.revenue_model || '',
            initial_investment: 0,
            projected_profit: 0,
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
          throw new Error(`アイデア解析エラー: ${(error as Error).message}`);
        }
      },
      'ビジネスアイデア生成',
      context.sessionId
    );
  }
  
  private async enhanceWithCapabilityScenarios(
    ideas: BusinessIdea[],
    context: SessionContext
  ): Promise<BusinessIdea[]> {
    return this.executeWithErrorHandling(
      async () => {
        // LLMを使って各アイデアに最適なケイパビリティを選択
        console.log('[V2] Selecting capabilities using LLM...');
        const selectionResponse = await OpenAIClient.withRetry(
          () => OpenAIClient.selectCapabilitiesForIdeas(ideas, MITSUBISHI_CAPABILITIES)
        );
        
        const cleanedSelectionResponse = selectionResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const capabilitySelections = JSON.parse(cleanedSelectionResponse);
        console.log('[V2] Capability selections:', JSON.stringify(capabilitySelections, null, 2));
        
        // 選択されたケイパビリティをアイデアに追加
        const ideasWithCapabilities = ideas.map((idea, index) => {
          const selection = capabilitySelections.find((sel: any) => sel.idea_index === index);
          const selectedCapabilities = selection?.selected_capabilities || ['都市開発力', 'イノベーション力'];
          return {
            ...idea,
            selectedCapabilities: selectedCapabilities.map((cat: string) => 
              MITSUBISHI_CAPABILITIES.find(cap => cap.category === cat)
            ).filter(Boolean)
          };
        });
        
        // OpenAI APIで活用シナリオを生成
        const response = await OpenAIClient.withRetry(
          () => OpenAIClient.enhanceWithCapabilities(
            ideasWithCapabilities,
            MITSUBISHI_CAPABILITIES
          )
        );
        
        try {
          console.log('[V2] OpenAI Response:', response.substring(0, 200) + '...');
          const cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const enhancedIdeas = JSON.parse(cleanedResponse);
          console.log('[V2] Enhanced Ideas:', JSON.stringify(enhancedIdeas, null, 2).substring(0, 500) + '...');
          
          // 配列の長さを確認
          if (!Array.isArray(enhancedIdeas)) {
            console.warn('OpenAIレスポンスが配列ではありません');
            return ideas;
          }
          
          if (enhancedIdeas.length !== ideas.length) {
            console.warn('OpenAIレスポンスの配列長が一致しません:', {
              expected: ideas.length,
              actual: enhancedIdeas.length
            });
            // 配列長が異なる場合でも処理を続行（利用可能な分だけマッピング）
          }
          
          return ideas.map((idea, index) => {
            const enhanced = enhancedIdeas[index];
            const scenario = enhanced?.capability_scenario || '';
            
            return {
              ...idea,
              capability_categories: enhanced?.capability_categories || [],
              capability_scenario: scenario,
              // アセットとネットワークの情報も統合
              mitsubishi_assets: this.extractAssetsFromScenario(scenario),
              network_partners: this.extractNetworkFromScenario(scenario)
            };
          });
        } catch (error) {
          console.warn('ケイパビリティシナリオの生成に失敗しました:', error);
          return ideas;
        }
      },
      'ケイパビリティシナリオ生成',
      context.sessionId
    );
  }
  
  private extractAssetsFromScenario(scenario: string): string[] {
    // シナリオテキストから主要なアセット名を抽出
    const assets: string[] = [];
    const assetKeywords = ['丸の内', 'みなとみらい', '大手町', 'アウトレット', 'パークハウス'];
    
    assetKeywords.forEach(keyword => {
      if (scenario.includes(keyword)) {
        assets.push(keyword);
      }
    });
    
    return assets;
  }
  
  private extractNetworkFromScenario(scenario: string): string[] {
    // シナリオテキストから主要なネットワーク要素を抽出
    const networks: string[] = [];
    const networkKeywords = ['テナント企業', '三菱グループ', 'スタートアップ', '大手企業', '金融機関'];
    
    networkKeywords.forEach(keyword => {
      if (scenario.includes(keyword)) {
        networks.push(keyword);
      }
    });
    
    return networks;
  }
  
  private async evaluateProfitability(
    ideas: BusinessIdea[]
  ): Promise<BusinessIdea[]> {
    return ideas.map(idea => {
      // 簡易的な収益性評価（TAM/SAM/SOM × 利益率）
      const som = idea.som || idea.market_size * 0.01;
      const profitMargin = idea.estimated_profit_margin || 10;
      const estimatedAnnualRevenue = som * 0.1;
      const estimatedAnnualProfit = estimatedAnnualRevenue * (profitMargin / 100);
      
      return {
        ...idea,
        projected_profit: Math.round(estimatedAnnualProfit * 10) / 10,
        initial_investment: Math.round(estimatedAnnualRevenue * 2),
        profitability_score: estimatedAnnualProfit >= 10 ? 'high' : 
                            estimatedAnnualProfit >= 5 ? 'medium' : 'low'
      };
    });
  }
  
  private async saveIdeasToDatabase(
    ideas: BusinessIdea[],
    sessionId: string
  ): Promise<BusinessIdea[]> {
    // ケイパビリティ情報を含む完全なデータを作成
    const enhancedIdeas = ideas.map(idea => {
      const ideaWithCapability = idea as any;
      return {
        ...idea,
        capability_scenario: ideaWithCapability.capability_scenario || '',
        capability_categories: ideaWithCapability.capability_categories || [],
        network_partners: ideaWithCapability.network_partners || []
      };
    });
    
    // Supabaseに保存するデータ（既存カラムのみ）
    const ideasToSave = enhancedIdeas.map(idea => ({
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
      capability_utilization: {},
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