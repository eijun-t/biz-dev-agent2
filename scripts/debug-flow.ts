#!/usr/bin/env tsx
// 統合フローデバッグツール - 各エージェントの入出力を可視化

import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import chalk from 'chalk'

// 環境変数の読み込み
config({ path: path.resolve(__dirname, '../.env.local') })

const API_URL = 'http://localhost:3005/api'
const DEBUG_OUTPUT_DIR = path.resolve(__dirname, '../debug-output')

// デバッグ情報の型定義
interface DebugStep {
  step: number
  agent: string
  timestamp: string
  duration?: number
  input: any
  output: any
  error?: any
  status: 'success' | 'error' | 'skipped'
}

interface FlowSummary {
  sessionId: string
  startTime: string
  endTime?: string
  totalDuration?: number
  steps: DebugStep[]
  finalStatus: 'completed' | 'failed' | 'partial'
}

class FlowDebugger {
  private sessionId: string = ''
  private outputDir: string = ''
  private flowSummary: FlowSummary
  private currentStep: number = 0

  constructor() {
    this.flowSummary = {
      sessionId: '',
      startTime: new Date().toISOString(),
      steps: [],
      finalStatus: 'failed'
    }
  }

  // デバッグ出力ディレクトリの作成
  private async setupOutputDir(sessionId: string) {
    this.sessionId = sessionId
    this.outputDir = path.join(DEBUG_OUTPUT_DIR, `session-${sessionId}`)
    await fs.mkdir(this.outputDir, { recursive: true })
    
    this.flowSummary.sessionId = sessionId
    console.log(chalk.gray(`📁 Debug output directory: ${this.outputDir}`))
  }

  // ステップ情報の記録
  private async recordStep(
    agent: string,
    input: any,
    output: any,
    status: 'success' | 'error' | 'skipped' = 'success',
    error?: any,
    duration?: number
  ) {
    this.currentStep++
    
    const step: DebugStep = {
      step: this.currentStep,
      agent,
      timestamp: new Date().toISOString(),
      duration,
      input,
      output,
      status,
      error
    }

    this.flowSummary.steps.push(step)

    // 個別ファイルに保存
    const stepFileName = `${String(this.currentStep).padStart(2, '0')}-${agent.toLowerCase().replace(/\s+/g, '-')}`
    await fs.writeFile(
      path.join(this.outputDir, `${stepFileName}-input.json`),
      JSON.stringify(input, null, 2)
    )
    await fs.writeFile(
      path.join(this.outputDir, `${stepFileName}-output.json`),
      JSON.stringify(output, null, 2)
    )

    // コンソール表示
    this.displayStep(step)
  }

  // ステップ情報の表示
  private displayStep(step: DebugStep) {
    const statusIcon = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏭️'
    const statusColor = step.status === 'success' ? chalk.green : step.status === 'error' ? chalk.red : chalk.yellow

    console.log('\n' + chalk.gray('─'.repeat(80)))
    console.log(`${statusIcon} ${chalk.bold(`Step ${step.step}: ${step.agent}`)}`)
    console.log(chalk.gray(`Timestamp: ${step.timestamp}`))
    
    if (step.duration) {
      console.log(chalk.gray(`Duration: ${(step.duration / 1000).toFixed(2)}s`))
    }

    console.log(statusColor(`Status: ${step.status}`))

    // 入力の概要
    console.log(chalk.cyan('\n📥 Input:'))
    this.displayDataSummary(step.input)

    // 出力の概要
    console.log(chalk.magenta('\n📤 Output:'))
    this.displayDataSummary(step.output)

    if (step.error) {
      console.log(chalk.red('\n⚠️ Error:'))
      console.log(chalk.red(JSON.stringify(step.error, null, 2)))
    }
  }

  // データの概要表示
  private displayDataSummary(data: any) {
    if (!data) {
      console.log(chalk.gray('  (empty)'))
      return
    }

    if (typeof data === 'string') {
      console.log(chalk.gray(`  String: "${data.substring(0, 100)}${data.length > 100 ? '...' : ''}"`))
    } else if (Array.isArray(data)) {
      console.log(chalk.gray(`  Array[${data.length}]`))
      data.slice(0, 3).forEach((item, i) => {
        console.log(chalk.gray(`    [${i}]: ${JSON.stringify(item).substring(0, 80)}...`))
      })
      if (data.length > 3) {
        console.log(chalk.gray(`    ... and ${data.length - 3} more items`))
      }
    } else if (typeof data === 'object') {
      const keys = Object.keys(data)
      console.log(chalk.gray(`  Object with ${keys.length} keys:`))
      keys.slice(0, 5).forEach(key => {
        const value = data[key]
        const valueStr = typeof value === 'object' 
          ? `${Array.isArray(value) ? `Array[${value.length}]` : 'Object'}`
          : String(value).substring(0, 50)
        console.log(chalk.gray(`    ${key}: ${valueStr}`))
      })
      if (keys.length > 5) {
        console.log(chalk.gray(`    ... and ${keys.length - 5} more keys`))
      }
    }
  }

  // セッション作成
  async createSession(userInput: string): Promise<string> {
    const startTime = Date.now()
    
    const input = { user_input: userInput }
    
    try {
      const response = await fetch(`${API_URL}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`)
      }

      const output = await response.json()
      const duration = Date.now() - startTime

      await this.setupOutputDir(output.sessionId)
      await this.recordStep('Session Creation', input, output, 'success', undefined, duration)

      return output.sessionId
    } catch (error) {
      await this.recordStep('Session Creation', input, null, 'error', error, Date.now() - startTime)
      throw error
    }
  }

  // Research Agent実行
  async runResearchAgent(sessionId: string): Promise<any> {
    const startTime = Date.now()
    const input = { sessionId }

    try {
      const response = await fetch(`${API_URL}/agents/information-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Research Agent failed: ${JSON.stringify(error, null, 2)}`)
      }

      const output = await response.json()
      const duration = Date.now() - startTime

      await this.recordStep('Research Agent', input, output, 'success', undefined, duration)
      return output.data
    } catch (error) {
      await this.recordStep('Research Agent', input, null, 'error', error, Date.now() - startTime)
      throw error
    }
  }

  // データ変換
  async convertToMarketData(researchData: any): Promise<any> {
    const startTime = Date.now()
    
    try {
      // 変換ロジック（既存のものを流用）
      const marketData = {
        trends: [],
        technologies: [],
        regulations: [],
        opportunities: []
      } as any

      if (researchData.categoryTrends) {
        for (const categoryTrend of researchData.categoryTrends) {
          if (categoryTrend.trends && categoryTrend.trends.length > 0) {
            const avgMarketSize = categoryTrend.trends
              .map((t: any) => t.marketSize?.value || 0)
              .reduce((a: number, b: number) => a + b, 0) / categoryTrend.trends.length

            marketData.trends.push({
              category: categoryTrend.category.name,
              trend_name: categoryTrend.category.name + 'トレンド',
              description: categoryTrend.summary || categoryTrend.trends[0].description,
              market_size: Math.max(avgMarketSize || 1000, 1000),
              growth_rate: 20,
              relevance_score: categoryTrend.relevanceScore || 0.7
            })

            if (categoryTrend.businessOpportunity) {
              marketData.opportunities.push({
                opportunity_name: categoryTrend.category.name + '関連事業',
                description: categoryTrend.businessOpportunity,
                target_market: '大手企業',
                estimated_market_size: Math.max(avgMarketSize || 1500, 1500),
                competitive_landscape: '競合増加中'
              })
            }
          }
        }
      }

      marketData.technologies.push({
        technology_name: 'IoTセンサー',
        description: '環境データのリアルタイム収集',
        maturity_level: 'growth',
        adoption_rate: 40,
        impact_potential: 8
      })

      const duration = Date.now() - startTime
      await this.recordStep('Data Conversion', researchData, marketData, 'success', undefined, duration)
      
      return marketData
    } catch (error) {
      await this.recordStep('Data Conversion', researchData, null, 'error', error, Date.now() - startTime)
      throw error
    }
  }

  // Ideation Agent実行
  async runIdeationAgent(sessionId: string, marketData: any): Promise<any> {
    const startTime = Date.now()
    const input = { sessionId, marketData }

    try {
      const response = await fetch(`${API_URL}/agents/ideation-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Ideation Agent failed: ${JSON.stringify(error, null, 2)}`)
      }

      const output = await response.json()
      const duration = Date.now() - startTime

      await this.recordStep('Ideation Agent V2', input, output, 'success', undefined, duration)
      return output
    } catch (error) {
      await this.recordStep('Ideation Agent V2', input, null, 'error', error, Date.now() - startTime)
      throw error
    }
  }

  // フロー完了
  async finalize(status: 'completed' | 'failed' | 'partial') {
    this.flowSummary.endTime = new Date().toISOString()
    this.flowSummary.finalStatus = status
    
    if (this.flowSummary.startTime && this.flowSummary.endTime) {
      this.flowSummary.totalDuration = 
        new Date(this.flowSummary.endTime).getTime() - 
        new Date(this.flowSummary.startTime).getTime()
    }

    // サマリーファイルの保存
    await fs.writeFile(
      path.join(this.outputDir, 'flow-summary.json'),
      JSON.stringify(this.flowSummary, null, 2)
    )

    // 最終レポート表示
    this.displayFinalReport()
  }

  // 最終レポート表示
  private displayFinalReport() {
    console.log('\n' + chalk.bold.blue('=' * 80))
    console.log(chalk.bold.blue('FLOW EXECUTION SUMMARY'))
    console.log(chalk.bold.blue('=' * 80))

    console.log(chalk.white(`\nSession ID: ${this.flowSummary.sessionId}`))
    console.log(chalk.white(`Start Time: ${this.flowSummary.startTime}`))
    console.log(chalk.white(`End Time: ${this.flowSummary.endTime}`))
    
    if (this.flowSummary.totalDuration) {
      console.log(chalk.white(`Total Duration: ${(this.flowSummary.totalDuration / 1000).toFixed(2)}s`))
    }

    const statusColor = this.flowSummary.finalStatus === 'completed' ? chalk.green :
                       this.flowSummary.finalStatus === 'failed' ? chalk.red : chalk.yellow
    console.log(statusColor(`\nFinal Status: ${this.flowSummary.finalStatus.toUpperCase()}`))

    console.log(chalk.white('\nSteps Summary:'))
    this.flowSummary.steps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏭️'
      const duration = step.duration ? ` (${(step.duration / 1000).toFixed(2)}s)` : ''
      console.log(`  ${icon} Step ${step.step}: ${step.agent}${duration}`)
    })

    console.log(chalk.gray(`\n📁 Full debug output saved to: ${this.outputDir}`))
  }
}

// メイン実行関数
async function main() {
  const flowDebugger = new FlowDebugger()
  
  try {
    console.log(chalk.bold.cyan('🔍 Business Proposal Agent Flow Debugger\n'))
    
    // 1. セッション作成
    console.log(chalk.bold('PHASE 1: Session Creation'))
    const sessionId = await flowDebugger.createSession('スマートシティとIoT技術を活用した新規事業')
    
    // 2. Research Agent
    console.log(chalk.bold('\nPHASE 2: Research Agent'))
    const researchData = await flowDebugger.runResearchAgent(sessionId)
    
    // 3. データ変換
    console.log(chalk.bold('\nPHASE 3: Data Conversion'))
    const marketData = await flowDebugger.convertToMarketData(researchData)
    
    // 4. Ideation Agent
    console.log(chalk.bold('\nPHASE 4: Ideation Agent'))
    const ideationResult = await flowDebugger.runIdeationAgent(sessionId, marketData)
    
    // 完了
    await flowDebugger.finalize('completed')
    
  } catch (error) {
    console.error(chalk.red('\n❌ Flow execution failed:'), error)
    await flowDebugger.finalize('failed')
    process.exit(1)
  }
}

// 実行
main()