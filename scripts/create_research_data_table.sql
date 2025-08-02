-- research_dataテーブルの作成
-- 情報収集エージェントが収集した市場調査データを保存

CREATE TABLE IF NOT EXISTS public.research_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('market_trend', 'technology', 'regulation', 'capability_affinity', 'competitor', 'general')),
    subcategory TEXT, -- PropTech, SmartCity, FinTech等のサブカテゴリ
    data_type TEXT NOT NULL, -- trend, market_size, analysis等
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- 構造化されたデータ
    source_url TEXT,
    reliability_score DECIMAL(3,2) CHECK (reliability_score >= 0 AND reliability_score <= 1), -- 0-1の信頼性スコア
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_research_data_session_id ON public.research_data(session_id);
CREATE INDEX idx_research_data_category ON public.research_data(category);
CREATE INDEX idx_research_data_subcategory ON public.research_data(subcategory);
CREATE INDEX idx_research_data_created_at ON public.research_data(created_at);

-- Row Level Security (RLS) の有効化
ALTER TABLE public.research_data ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- 認証されたユーザーは自分のセッションのデータを読み書きできる
CREATE POLICY "Users can view their session research data" ON public.research_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = research_data.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert research data for their sessions" ON public.research_data
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = research_data.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their session research data" ON public.research_data
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sessions 
            WHERE sessions.id = research_data.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_data_updated_at
    BEFORE UPDATE ON public.research_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- サンプルコメント
COMMENT ON TABLE public.research_data IS '情報収集エージェントが収集した市場調査データ';
COMMENT ON COLUMN public.research_data.category IS '調査カテゴリ（market_trend, technology, regulation等）';
COMMENT ON COLUMN public.research_data.subcategory IS 'サブカテゴリ（PropTech, SmartCity, FinTech等）';
COMMENT ON COLUMN public.research_data.content IS '構造化された調査データ（JSON形式）';
COMMENT ON COLUMN public.research_data.reliability_score IS 'データの信頼性スコア（0-1）';