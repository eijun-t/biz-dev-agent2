// トレンド収集のための12カテゴリ定義

export interface TrendCategory {
  id: string
  name: string
  description: string
  keywords: string[] // 検索キーワード
  focusAreas: string[] // 注目分野
}

export const TREND_CATEGORIES: TrendCategory[] = [
  {
    id: 'proptech',
    name: 'PropTech（不動産テック）',
    description: '不動産業界のデジタル化・テクノロジー活用',
    keywords: ['PropTech', '不動産テック', 'スマートビルディング', 'IoT不動産'],
    focusAreas: ['スマートビルディング', 'VR内覧', 'AI査定', 'ブロックチェーン不動産']
  },
  {
    id: 'smartcity',
    name: 'スマートシティ',
    description: '都市のデジタル化・持続可能な街づくり',
    keywords: ['スマートシティ', 'スマートコミュニティ', '都市OS', 'MaaS'],
    focusAreas: ['都市OS', 'エネルギー管理', 'モビリティ', 'デジタルツイン']
  },
  {
    id: 'fintech',
    name: 'FinTech（金融テック）',
    description: '不動産金融・投資のデジタル化',
    keywords: ['不動産FinTech', 'REIT', '不動産クラウドファンディング', '不動産投資'],
    focusAreas: ['不動産投資プラットフォーム', 'デジタル証券', 'AI投資判断', 'ブロックチェーン金融']
  },
  {
    id: 'sustainability',
    name: 'サステナビリティ',
    description: '環境配慮型不動産・グリーンビルディング',
    keywords: ['グリーンビルディング', 'カーボンニュートラル', 'ESG不動産', 'LEED認証'],
    focusAreas: ['脱炭素建築', '再生可能エネルギー', 'サーキュラーエコノミー', 'グリーンファイナンス']
  },
  {
    id: 'healthtech',
    name: 'ヘルスケア・ウェルネス',
    description: '健康・ウェルビーイング重視の不動産',
    keywords: ['ウェルネス不動産', 'ヘルスケア施設', 'WELL認証', 'バイオフィリックデザイン'],
    focusAreas: ['健康経営オフィス', 'メディカルモール', 'シニアリビング', 'フィットネス施設']
  },
  {
    id: 'retailtech',
    name: 'リテールテック',
    description: '小売・商業施設のデジタル化',
    keywords: ['リテールテック', 'OMO', '体験型商業施設', 'スマートストア'],
    focusAreas: ['無人店舗', '体験型施設', 'デジタルサイネージ', 'ECと実店舗融合']
  },
  {
    id: 'logistics',
    name: '物流・ロジスティクス',
    description: '物流施設の高度化・自動化',
    keywords: ['物流不動産', 'ロジスティクス4.0', '自動倉庫', 'ラストワンマイル'],
    focusAreas: ['自動化倉庫', 'コールドチェーン', 'ドローン配送', 'マルチテナント型物流']
  },
  {
    id: 'workspace',
    name: 'ワークスペース革新',
    description: '新しい働き方に対応したオフィス空間',
    keywords: ['フレキシブルオフィス', 'コワーキング', 'ハイブリッドワーク', 'スマートオフィス'],
    focusAreas: ['ABW（Activity Based Working）', 'サテライトオフィス', 'バーチャルオフィス', 'ウェルビーイングオフィス']
  },
  {
    id: 'entertainment',
    name: 'エンターテイメント・体験',
    description: 'エンタメ・体験型施設の新展開',
    keywords: ['エンターテイメント施設', 'テーマパーク', 'eスポーツ', 'イマーシブ体験'],
    focusAreas: ['VR/AR施設', 'eスポーツアリーナ', 'イマーシブシアター', 'デジタルアート']
  },
  {
    id: 'mobility',
    name: 'モビリティ・交通',
    description: '新しい移動手段と不動産の融合',
    keywords: ['モビリティハブ', 'EV充電', '自動運転', 'MaaS'],
    focusAreas: ['EV充電インフラ', 'モビリティステーション', '空飛ぶクルマ', 'シェアモビリティ']
  },
  {
    id: 'education',
    name: '教育・人材育成',
    description: '教育施設・人材育成空間の革新',
    keywords: ['EdTech', '教育施設', 'STEAM教育', 'リカレント教育'],
    focusAreas: ['デジタル教育施設', 'イノベーションセンター', '産学連携施設', 'スキルアップ施設']
  },
  {
    id: 'datatech',
    name: 'データ・AI活用',
    description: 'ビッグデータ・AIの不動産活用',
    keywords: ['不動産AI', 'ビッグデータ', '予測分析', 'デジタルツイン'],
    focusAreas: ['AI価格査定', '需要予測', '最適化アルゴリズム', 'IoTデータ活用']
  }
]

// カテゴリIDからカテゴリ情報を取得
export function getCategoryById(id: string): TrendCategory | undefined {
  return TREND_CATEGORIES.find(cat => cat.id === id)
}

// 全カテゴリIDのリストを取得
export function getAllCategoryIds(): string[] {
  return TREND_CATEGORIES.map(cat => cat.id)
}