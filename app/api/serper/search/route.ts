import { NextRequest, NextResponse } from 'next/server';
import { SerperClient } from '@/lib/serper-client';
import { ErrorHandler } from '@/lib/error-handler';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（一時的に無効化）
    // TODO: 認証の問題を解決後、有効化する
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: {
    //         code: 'UNAUTHORIZED',
    //         message: '認証が必要です',
    //       },
    //     },
    //     { status: 401 }
    //   );
    // }

    // リクエストボディの解析
    const body = await request.json();
    const {
      query,
      queries, // バッチ検索用
      num,
      lang,
      location,
      type,
      sessionId,
    } = body;

    // 単一検索かバッチ検索かを判定
    if (queries && Array.isArray(queries)) {
      // バッチ検索
      if (queries.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '検索クエリの配列が空です',
            },
          },
          { status: 400 }
        );
      }

      if (queries.length > 10) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: 'バッチ検索は最大10クエリまでです',
            },
          },
          { status: 400 }
        );
      }

      const serper = new SerperClient();
      const results = await serper.batchSearch(queries, {
        num,
        lang,
        location,
        type,
      });

      // Map を Object に変換
      const resultsObject: Record<string, any> = {};
      results.forEach((value, key) => {
        resultsObject[key] = value;
      });

      return NextResponse.json({
        success: true,
        data: {
          results: resultsObject,
          totalQueries: queries.length,
          successfulQueries: results.size,
        },
      });
    } else {
      // 単一検索
      if (!query) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '検索クエリが必要です',
            },
          },
          { status: 400 }
        );
      }

      const serper = new SerperClient();
      const searchResult = await serper.search({
        query,
        num,
        lang,
        location,
        type,
      });

      return NextResponse.json({
        success: true,
        data: searchResult,
      });
    }
  } catch (error) {
    console.error('SERPER search error:', error);
    const errorResponse = ErrorHandler.createErrorResponse(error as Error);
    
    // ステータスコードの決定
    const statusCode = 
      errorResponse.error.statusCode || 
      (errorResponse.error.code === 'UNAUTHORIZED' ? 401 : 500);

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}