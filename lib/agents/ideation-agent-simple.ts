import { BaseAgent } from './base-agent';
import { OpenAIClient } from '../openai-client';
import { supabaseAdmin } from '../supabase-admin';
import { ApiError } from '../error-handler';
import {
  BusinessIdea,
  MarketData,
  SessionContext
} from '../../types/memory';

export class IdeationAgentSimple extends BaseAgent {
  async generate(marketData: MarketData, context: SessionContext): Promise<BusinessIdea[]> {
    const sessionId = context.sessionId;
    
    try {
      console.log('[IdeationAgentSimple] Starting generation for session:', sessionId);
      
      // 1. ビジネスアイデアを1つだけ生成（テスト用）
      const prompt = `市場データに基づいて、革新的なビジネスアイデアを1個だけ生成してください。
市場規模1000億円以上、営業利益10億円達成可能な事業を提案してください。

出力形式（JSON）:
{
  "title": "事業名",
  "description": "事業概要",
  "target_market": "ターゲット市場",
  "market_size": 市場規模（億円）,
  "revenue_model": "収益モデル"
}`;

      console.log('[IdeationAgentSimple] Calling OpenAI...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new ApiError(`OpenAI API error: ${response.statusText}`, response.status);
      }

      const data = await response.json();
      const ideaText = data.choices[0].message.content;
      
      console.log('[IdeationAgentSimple] Received response:', ideaText.substring(0, 100) + '...');
      
      // JSONをパース
      const cleanedResponse = ideaText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      console.log('[IdeationAgentSimple] Cleaned response:', cleanedResponse.substring(0, 100) + '...');
      
      let ideaData;
      try {
        ideaData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('[IdeationAgentSimple] Parse error:', parseError);
        console.error('[IdeationAgentSimple] Original response:', ideaText);
        throw new Error('Failed to parse AI response');
      }
      
      // BusinessIdea形式に変換
      const idea: BusinessIdea = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        title: ideaData.title,
        description: ideaData.description,
        target_market: ideaData.target_market,
        market_size: ideaData.market_size,
        revenue_model: ideaData.revenue_model,
        initial_investment: ideaData.market_size * 0.1, // 市場規模の10%と仮定
        projected_profit: ideaData.market_size * 0.01, // 市場規模の1%と仮定
        timeline: '5-10年',
        mitsubishi_assets: [],
        capability_utilization: {},
        is_selected: false,
        created_at: new Date().toISOString()
      };
      
      console.log('[IdeationAgentSimple] Saving to database...');
      
      // Supabaseに保存
      const { data: savedIdea, error } = await supabaseAdmin
        .from('business_ideas')
        .insert({
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
        })
        .select()
        .single();
      
      if (error) {
        console.error('[IdeationAgentSimple] Save error:', error);
        throw new ApiError(`Failed to save idea: ${error.message}`);
      }
      
      console.log('[IdeationAgentSimple] Successfully saved idea:', savedIdea.id);
      
      return [savedIdea as BusinessIdea];
      
    } catch (error) {
      console.error('[IdeationAgentSimple] Error:', error);
      throw error;
    }
  }
}