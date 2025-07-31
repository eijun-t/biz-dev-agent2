'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ErrorDisplayProps {
  error: {
    type: 'api' | 'data_quality' | 'timeout' | 'system';
    message: string;
    code?: string;
    details?: any;
    statusCode?: number;
    canRetry?: boolean;
  };
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const getErrorMessage = () => {
    // 技術的詳細を含むエラーメッセージを表示
    let message = '';
    
    switch (error.type) {
      case 'api':
        message = `API接続エラー: ${error.message}`;
        if (error.statusCode) {
          message += ` (ステータスコード: ${error.statusCode})`;
        }
        if (error.code) {
          message += ` [${error.code}]`;
        }
        break;
      case 'data_quality':
        message = `データ品質エラー: ${error.message}`;
        break;
      case 'timeout':
        message = `タイムアウトエラー: ${error.message}`;
        break;
      case 'system':
        message = `システムエラー: ${error.message}`;
        break;
      default:
        message = `エラー: ${error.message}`;
    }
    
    return message;
  };

  const getErrorTypeLabel = () => {
    switch (error.type) {
      case 'api':
        return 'API エラー';
      case 'data_quality':
        return 'データ品質エラー';
      case 'timeout':
        return 'タイムアウト';
      case 'system':
        return 'システムエラー';
      default:
        return 'エラー';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'timeout':
        return 'yellow';
      case 'data_quality':
        return 'orange';
      default:
        return 'red';
    }
  };

  const color = getErrorColor();

  return (
    <div className={`error-display bg-${color}-50 border border-${color}-200 rounded-md p-4 my-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className={`h-5 w-5 text-${color}-400`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium text-${color}-800`}>
            {getErrorTypeLabel()}
          </h3>
          <div className={`mt-2 text-sm text-${color}-700`}>
            <p>{getErrorMessage()}</p>
            
            {/* 技術的詳細の表示 */}
            {error.details && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">
                  技術的詳細を表示
                </summary>
                <pre className={`mt-1 text-xs bg-${color}-100 p-2 rounded overflow-x-auto`}>
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          {/* 再試行ボタン */}
          {error.canRetry && onRetry && (
            <div className="mt-4">
              <button
                type="button"
                className={`bg-${color}-100 px-3 py-2 rounded-md text-sm font-medium text-${color}-800 hover:bg-${color}-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`}
                onClick={onRetry}
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tailwind CSSの動的クラス名のための文字列
// これにより、PurgeCSSがこれらのクラスを削除しないようにする
const colorClasses = [
  'bg-red-50', 'border-red-200', 'text-red-400', 'text-red-800', 'text-red-700', 'bg-red-100', 'hover:bg-red-200', 'focus:ring-red-500',
  'bg-yellow-50', 'border-yellow-200', 'text-yellow-400', 'text-yellow-800', 'text-yellow-700', 'bg-yellow-100', 'hover:bg-yellow-200', 'focus:ring-yellow-500',
  'bg-orange-50', 'border-orange-200', 'text-orange-400', 'text-orange-800', 'text-orange-700', 'bg-orange-100', 'hover:bg-orange-200', 'focus:ring-orange-500',
];