-- ================================================
-- ビジネス提案エージェント データベーススキーマ
-- ================================================

-- 既存のテーブルがある場合は削除（開発環境用）
-- 本番環境では使用しないこと
-- DROP TABLE IF EXISTS capabilities CASCADE;
-- DROP TABLE IF EXISTS network_companies CASCADE;
-- DROP TABLE IF EXISTS mitsubishi_assets CASCADE;
-- DROP TABLE IF EXISTS final_reports CASCADE;
-- DROP TABLE IF EXISTS progress_tracking CASCADE;
-- DROP TABLE IF EXISTS evaluation_results CASCADE;
-- DROP TABLE IF EXISTS business_ideas CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- ================================================
-- 基本テーブル
-- ================================================

-- ユーザー拡張情報
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッション管理
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_input TEXT,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ビジネスアイデア
CREATE TABLE business_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_market TEXT,
  market_size DECIMAL(15,0), -- 1000億円以上の市場規模
  revenue_model TEXT,
  initial_investment DECIMAL(15,0),
  projected_profit DECIMAL(15,0), -- 営業利益10億円目標
  timeline TEXT,
  mitsubishi_assets JSONB DEFAULT '[]'::JSONB,
  capability_utilization JSONB DEFAULT '{}'::JSONB,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アイデア評価結果
CREATE TABLE evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES business_ideas(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  originality_score DECIMAL(3,1) CHECK (originality_score >= 0 AND originality_score <= 10),
  feasibility_score DECIMAL(3,1) CHECK (feasibility_score >= 0 AND feasibility_score <= 10),
  market_potential_score DECIMAL(3,1) CHECK (market_potential_score >= 0 AND market_potential_score <= 10),
  synergy_score DECIMAL(3,1) CHECK (synergy_score >= 0 AND synergy_score <= 10),
  competitive_advantage_score DECIMAL(3,1) CHECK (competitive_advantage_score >= 0 AND competitive_advantage_score <= 10),
  risk_balance_score DECIMAL(3,1) CHECK (risk_balance_score >= 0 AND risk_balance_score <= 10),
  total_score DECIMAL(3,1),
  selection_rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 進捗追跡
CREATE TABLE progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'error')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 最終レポート（完全版保存）
CREATE TABLE final_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  selected_idea_id UUID REFERENCES business_ideas(id),
  report_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 三菱地所固有データテーブル
-- ================================================

-- 三菱地所資産マスタ
CREATE TABLE mitsubishi_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('urban_development', 'retail_facilities', 'residential', 'international')),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  scale TEXT,
  key_features JSONB DEFAULT '[]'::JSONB,
  synergy_potential INTEGER CHECK (synergy_potential >= 1 AND synergy_potential <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ネットワーク企業マスタ
CREATE TABLE network_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_type TEXT NOT NULL CHECK (company_type IN ('tenant', 'mitsubishi_group', 'partner')),
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  relationship_depth TEXT,
  business_potential JSONB DEFAULT '[]'::JSONB,
  contact_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ケイパビリティマスタ
CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  capability_name TEXT NOT NULL,
  description TEXT,
  strength_level INTEGER CHECK (strength_level >= 1 AND strength_level <= 10),
  specific_skills JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- インデックス作成
-- ================================================

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_business_ideas_session_id ON business_ideas(session_id);
CREATE INDEX idx_business_ideas_is_selected ON business_ideas(is_selected);
CREATE INDEX idx_evaluation_results_idea_id ON evaluation_results(idea_id);
CREATE INDEX idx_evaluation_results_session_id ON evaluation_results(session_id);
CREATE INDEX idx_progress_tracking_session_id ON progress_tracking(session_id);
CREATE INDEX idx_final_reports_session_id ON final_reports(session_id);
CREATE INDEX idx_mitsubishi_assets_asset_type ON mitsubishi_assets(asset_type);
CREATE INDEX idx_network_companies_company_type ON network_companies(company_type);
CREATE INDEX idx_capabilities_category ON capabilities(category);

-- ================================================
-- Row Level Security (RLS) ポリシー
-- ================================================

-- RLSを有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_reports ENABLE ROW LEVEL SECURITY;

-- user_profiles ポリシー
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- sessions ポリシー
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- business_ideas ポリシー
CREATE POLICY "Users can view own business ideas" ON business_ideas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = business_ideas.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create business ideas for own sessions" ON business_ideas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = business_ideas.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update business ideas for own sessions" ON business_ideas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = business_ideas.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- evaluation_results ポリシー
CREATE POLICY "Users can view own evaluation results" ON evaluation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = evaluation_results.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create evaluation results for own sessions" ON evaluation_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = evaluation_results.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- progress_tracking ポリシー
CREATE POLICY "Users can view own progress" ON progress_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = progress_tracking.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create progress for own sessions" ON progress_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = progress_tracking.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- final_reports ポリシー
CREATE POLICY "Users can view own reports" ON final_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = final_reports.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports for own sessions" ON final_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = final_reports.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- ================================================
-- トリガー関数
-- ================================================

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガーの作成
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitsubishi_assets_updated_at BEFORE UPDATE ON mitsubishi_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_companies_updated_at BEFORE UPDATE ON network_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 初期データ投入
-- ================================================

-- 三菱地所資産データ
INSERT INTO mitsubishi_assets (asset_type, name, description, location, scale, key_features, synergy_potential) VALUES
('urban_development', '丸の内エリア開発', '東京駅前の日本最大級ビジネス地区', '東京都千代田区', '約30棟のビル、延床面積約400万㎡', '["日本最高級立地", "大手企業本社集積", "国際的ブランド力", "最新インフラ"]'::JSONB, 10),
('urban_development', 'みなとみらい21開発', '横浜の現代的ビジネス・商業・居住複合地区', '神奈川県横浜市', '複数の超高層ビル、商業施設、ホテル', '["先進的都市デザイン", "国際会議場", "臨海立地", "スマートシティ実証"]'::JSONB, 9),
('retail_facilities', 'プレミアム・アウトレット', '全国展開するプレミアムアウトレットモール', '全国8箇所', '大規模アウトレットモール', '["高級ブランド集積", "広域集客力", "観光・レジャー要素"]'::JSONB, 8),
('residential', 'ザ・パークハウス', '高級分譲マンションブランド', '首都圏・関西圏中心', '累計約700棟、約8万戸供給実績', '["高品質住宅ブランド", "富裕層顧客基盤", "長期管理ノウハウ"]'::JSONB, 7),
('international', '海外不動産開発', '海外市場での不動産開発・投資', 'アジア・米国・欧州', '主要都市での開発プロジェクト', '["現地パートナーシップ", "国際基準対応", "クロスボーダー投資"]'::JSONB, 7);

-- ケイパビリティデータ（一部抜粋）
INSERT INTO capabilities (category, sub_category, capability_name, description, strength_level, specific_skills) VALUES
('不動産開発力', '設計業務ノウハウ', '都市計画・マスタープラン', '都市計画マスタープラン、地区計画、まちづくり計画', 10, '["都市計画法対応", "地区計画策定", "交通計画", "インフラ計画", "景観計画"]'::JSONB),
('不動産開発力', 'プロジェクトマネジメント力', 'スケジュール管理', '開発スケジュール策定・進捗管理・調整', 9, '["工程計画", "クリティカルパス管理", "リスク対応", "関係者調整"]'::JSONB),
('不動産運営・管理力', 'テナントリレーション', 'リーシング・営業', 'テナント誘致、契約交渉、営業活動', 9, '["テナント開拓", "提案営業", "契約条件交渉", "クロージング"]'::JSONB),
('金融・投資力', '資金調達力', 'プロジェクトファイナンス', '大規模開発プロジェクトの資金調達', 9, '["ストラクチャー構築", "金融機関交渉", "リスク分担", "担保設定"]'::JSONB),
('事業創造・イノベーション力', 'デジタル変革・DX推進', 'PropTech導入・活用', '不動産テクノロジーの導入・事業化', 7, '["PropTech評価", "パイロット実行", "スケール展開", "効果測定"]'::JSONB);

-- サンプルネットワーク企業データ
INSERT INTO network_companies (company_type, name, industry, description, relationship_depth, business_potential) VALUES
('tenant', '大手金融機関A社', '金融', '丸の内エリアに本社を構える大手銀行', '20年以上の長期賃貸契約', '["FinTech連携", "不動産金融商品開発", "顧客紹介"]'::JSONB),
('tenant', 'グローバルIT企業B社', 'IT', '丸の内エリアに日本本社を置くグローバルIT企業', '戦略的パートナーシップ', '["スマートビル技術", "デジタルツイン", "データ分析"]'::JSONB),
('mitsubishi_group', '三菱商事', '総合商社', '三菱グループ中核企業', '資本関係・事業連携', '["グローバルネットワーク", "新規事業開発", "投資連携"]'::JSONB),
('partner', '大手建設会社C社', '建設', '長年の建設パートナー', '優先発注関係', '["建設技術革新", "コスト最適化", "品質保証"]'::JSONB);

-- ================================================
-- 権限設定
-- ================================================

-- service_role以外のロールに対してマスタデータの参照権限を付与
GRANT SELECT ON mitsubishi_assets TO authenticated;
GRANT SELECT ON network_companies TO authenticated;
GRANT SELECT ON capabilities TO authenticated;