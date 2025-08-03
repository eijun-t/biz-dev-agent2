// 三菱地所のケイパビリティ定義
export interface MitsubishiCapability {
  category: string;
  name: string;
  description: string;
  assets: string[];
  networks: string[];
  strengths: string[];
}

export const MITSUBISHI_CAPABILITIES: MitsubishiCapability[] = [
  {
    category: '都市開発力',
    name: '大規模複合開発',
    description: '丸の内・みなとみらい等の大規模都市開発の実績とノウハウ',
    assets: [
      '丸の内エリア（東京駅前の日本最大級ビジネス地区）',
      'みなとみらい21（横浜の複合都市開発）',
      '大手町（金融・ビジネスの中枢）'
    ],
    networks: [
      '大手企業本社（丸の内に集積する約4,300社）',
      '金融機関（メガバンク・証券会社）',
      '外資系企業'
    ],
    strengths: [
      '長期的な街づくりビジョン',
      '行政との強固な連携',
      'エリアマネジメント能力'
    ]
  },
  {
    category: '商業施設運営力',
    name: 'リテール・商業施設運営',
    description: 'アウトレット・商業施設の開発・運営ノウハウ',
    assets: [
      'プレミアム・アウトレット（国内9施設）',
      '丸の内仲通り（高級ブランド街）',
      'アクアシティお台場'
    ],
    networks: [
      'テナント企業（アパレル・飲食・物販）',
      '高級ブランド',
      'エンターテインメント企業'
    ],
    strengths: [
      'テナントリーシング力',
      'マーケティング・販促力',
      '顧客データ分析力'
    ]
  },
  {
    category: '住宅事業力',
    name: '住宅開発・管理',
    description: '高品質な住宅開発と管理サービス',
    assets: [
      'ザ・パークハウスシリーズ（高級マンション）',
      'パークホームズ（ファミリー向けマンション）',
      '賃貸マンション'
    ],
    networks: [
      '三菱地所レジデンス',
      '三菱地所コミュニティ（管理会社）',
      '建設会社・設計事務所'
    ],
    strengths: [
      'ブランド力',
      '品質管理能力',
      'アフターサービス体制'
    ]
  },
  {
    category: '国際事業力',
    name: 'グローバル展開',
    description: '海外不動産開発・投資の実績',
    assets: [
      '米国オフィスビル',
      'アジア商業施設',
      '欧州不動産投資'
    ],
    networks: [
      '海外デベロッパー',
      '国際投資家',
      'グローバル企業'
    ],
    strengths: [
      '国際的な資金調達力',
      'クロスボーダー取引経験',
      '現地パートナーシップ'
    ]
  },
  {
    category: 'イノベーション力',
    name: '新事業・テクノロジー',
    description: 'PropTech・スマートシティへの取り組み',
    assets: [
      'TMIPスマートシティプラットフォーム',
      'Mec Industry DXセンター',
      'スタートアップ支援施設'
    ],
    networks: [
      'スタートアップ企業',
      'テクノロジー企業',
      '大学・研究機関'
    ],
    strengths: [
      'オープンイノベーション推進力',
      'デジタル技術活用力',
      '実証実験フィールド提供'
    ]
  },
  {
    category: '金融・投資力',
    name: '不動産金融・投資',
    description: 'REIT・ファンド運営等の金融ノウハウ',
    assets: [
      '日本リテールファンド投資法人',
      '産業ファンド投資法人',
      'プライベートREIT'
    ],
    networks: [
      '機関投資家',
      '金融機関',
      '三菱グループ各社'
    ],
    strengths: [
      'アセットマネジメント力',
      '資金調達力',
      'リスク管理能力'
    ]
  }
];

// ビジネスアイデアに最適なケイパビリティを選択する関数
export function selectRelevantCapabilities(
  businessIdea: any,
  maxCapabilities: number = 3
): MitsubishiCapability[] {
  // ビジネスアイデアのキーワードに基づいて関連性をスコアリング
  const scores = MITSUBISHI_CAPABILITIES.map(capability => {
    let score = 0;
    const ideaText = `${businessIdea.title} ${businessIdea.description} ${businessIdea.target_market}`.toLowerCase();
    
    // カテゴリーマッチング
    if (ideaText.includes('スマート') || ideaText.includes('iot') || ideaText.includes('ai')) {
      if (capability.category === 'イノベーション力') score += 3;
    }
    if (ideaText.includes('商業') || ideaText.includes('店舗') || ideaText.includes('リテール')) {
      if (capability.category === '商業施設運営力') score += 3;
    }
    if (ideaText.includes('オフィス') || ideaText.includes('ビジネス') || ideaText.includes('企業')) {
      if (capability.category === '都市開発力') score += 3;
    }
    if (ideaText.includes('住宅') || ideaText.includes('住まい') || ideaText.includes('マンション')) {
      if (capability.category === '住宅事業力') score += 3;
    }
    if (ideaText.includes('グローバル') || ideaText.includes('海外') || ideaText.includes('国際')) {
      if (capability.category === '国際事業力') score += 3;
    }
    if (ideaText.includes('投資') || ideaText.includes('ファンド') || ideaText.includes('金融')) {
      if (capability.category === '金融・投資力') score += 3;
    }
    
    // 汎用的なマッチング
    if (capability.category === '都市開発力') score += 1; // 基本的に関連性あり
    if (capability.category === 'イノベーション力') score += 1; // 新事業は基本的に関連
    
    return { capability, score };
  });
  
  // スコアの高い順にソートして上位を返す
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCapabilities)
    .map(item => item.capability);
}