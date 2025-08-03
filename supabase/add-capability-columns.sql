-- business_ideasテーブルにケイパビリティ関連のカラムを追加
ALTER TABLE business_ideas 
ADD COLUMN IF NOT EXISTS capability_scenario TEXT,
ADD COLUMN IF NOT EXISTS capability_categories TEXT[],
ADD COLUMN IF NOT EXISTS network_partners TEXT[];