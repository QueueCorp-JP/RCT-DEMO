import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import homeStore from '@/features/stores/home';
import settingsStore from '@/features/stores/settings';
import { Message } from '@/features/messages/messages';

interface TimeAnalysis {
  hour: number;
  count: number;
}

interface QuestionAnalysis {
  question: string;
  count: number;
  category?: string;
}

interface CategoryAnalysis {
  category: string;
  count: number;
  percentage: number;
}

type CategoryType = '製品情報' | '価格・料金' | 'サポート' | '技術的質問' | '会社情報' | '不適切/不明' | 'その他';

// 質問カテゴリーの定義
const CATEGORIES: Record<string, CategoryType> = {
  PRODUCT: '製品情報',
  PRICE: '価格・料金',
  SUPPORT: 'サポート',
  TECHNICAL: '技術的質問',
  COMPANY: '会社情報',
  IRRELEVANT: '不適切/不明',
  OTHER: 'その他'
};

// カテゴリーの色定義
const CATEGORY_COLORS: Record<CategoryType, string> = {
  '製品情報': 'bg-blue-100 text-blue-800 border-blue-200',
  '価格・料金': 'bg-green-100 text-green-800 border-green-200',
  'サポート': 'bg-purple-100 text-purple-800 border-purple-200',
  '技術的質問': 'bg-orange-100 text-orange-800 border-orange-200',
  '会社情報': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  '不適切/不明': 'bg-red-100 text-red-800 border-red-200',
  'その他': 'bg-gray-100 text-gray-800 border-gray-200'
};

// キーワードベースのカテゴリー判定
const categorizeQuestion = (question: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes('値段') || q.includes('料金') || q.includes('価格') || q.includes('コスト')) {
    return CATEGORIES.PRICE;
  }
  // サービス関連のキーワードを拡充
  if (q.includes('製品') || q.includes('商品') || q.includes('サービス') || q.includes('機能') ||
      q.includes('使い方') || q.includes('使用') || q.includes('利用') || q.includes('できる') ||
      q.includes('方法') || q.includes('やり方') || q.includes('使える') || q.includes('対応')) {
    return CATEGORIES.PRODUCT;
  }
  if (q.includes('サポート') || q.includes('問い合わせ') || q.includes('連絡')) {
    return CATEGORIES.SUPPORT;
  }
  if (q.includes('技術') || q.includes('仕様') || q.includes('スペック') || q.includes('設定')) {
    return CATEGORIES.TECHNICAL;
  }
  if (q.includes('会社') || q.includes('企業') || q.includes('採用')) {
    return CATEGORIES.COMPANY;
  }
  if (q.includes('遊び') || q.includes('ゲーム') || q.includes('関係') || q.includes('意味')) {
    return CATEGORIES.IRRELEVANT;
  }
  
  return CATEGORIES.OTHER;
};

const ChatHistory: React.FC = () => {
  const { t } = useTranslation();
  const characterName = settingsStore((s) => s.characterName);
  const messages = homeStore((s) => s.chatLog);
  const [activeTab, setActiveTab] = useState<'history' | 'analysis'>('history');

  // メッセージを処理する関数
  const processMessages = (messages: Message[]): Message[] => {
    return messages.filter((message): boolean => {
      if (!message.content) return false;
      return (
        typeof message.content === 'string' || Array.isArray(message.content)
      );
    });
  };

  const processedMessages = processMessages(messages);

  // カテゴリー別の質問分析
  const categoryAnalysis = useMemo((): CategoryAnalysis[] => {
    const categoryCounts: Record<string, number> = {};
    let totalQuestions = 0;

    processedMessages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        const content = typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || '';
        const category = categorizeQuestion(content);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        totalQuestions++;
      }
    });

    return Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalQuestions) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [processedMessages]);

  // よくある質問の分析（カテゴリー付き）
  const frequentQuestions = useMemo((): QuestionAnalysis[] => {
    const questionCounts: Record<string, number> = {};
    const questionCategories: Record<string, string> = {};

    // アスタリスクを除去する処理
    const cleanContent = (text: string) => {
      return text.replace(/\*+/g, '').trim();
    };

    processedMessages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        const rawContent = typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || '';
        const content = cleanContent(rawContent);
        if (content) { // 空文字列でない場合のみ処理
          if (questionCounts[content]) {
            questionCounts[content]++;
          } else {
            questionCounts[content] = 1;
            questionCategories[content] = categorizeQuestion(content);
          }
        }
      }
    });

    return Object.entries(questionCounts)
      .map(([question, count]) => ({
        question,
        count,
        category: questionCategories[question]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [processedMessages]);

  // 時間帯分析
  const timeAnalysis = useMemo((): TimeAnalysis[] => {
    const hourCounts = new Array(24).fill(0);
    processedMessages.forEach(msg => {
      if (msg.timestamp) {
        const hour = new Date(msg.timestamp).getHours();
        hourCounts[hour]++;
      }
    });
    return hourCounts.map((count, hour) => ({ hour, count }));
  }, [processedMessages]);

  // 利用時間帯のピーク
  const peakHours = useMemo(() => {
    return timeAnalysis
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ hour, count }) => ({
        hour,
        count,
        percentage: Math.round((count / processedMessages.length) * 100)
      }));
  }, [timeAnalysis, processedMessages]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'history'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          会話履歴
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200
            ${activeTab === 'analysis'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          分析結果
        </button>
      </div>

      {activeTab === 'analysis' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* カテゴリー分析 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">質問カテゴリー分析</h3>
            <div className="space-y-3">
              {categoryAnalysis.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${CATEGORY_COLORS[cat.category as CategoryType]}`}>
                      {cat.category}
                    </span>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 ml-4">
                    {cat.percentage}% ({cat.count}件)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* よくある質問 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">よくある質問</h3>
            <div className="space-y-3">
              {frequentQuestions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 truncate flex-1">{q.question}</div>
                    <div className="text-sm font-medium text-gray-900 ml-4">{q.count}回</div>
                  </div>
                  {q.category && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${CATEGORY_COLORS[q.category as CategoryType]}`}>
                      {q.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 利用時間帯の分析 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">利用時間帯の分析</h3>
            <div className="space-y-3">
              {peakHours.map(({ hour, count, percentage }, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">{hour}:00 - {hour + 1}:00</div>
                  <div className="text-sm font-medium text-gray-900">{percentage}% ({count}件)</div>
                </div>
              ))}
            </div>
          </div>

          {/* サービス改善提案 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">サービス改善提案</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <p>質問内容の分析結果から、以下の改善が推奨されます：</p>
              
              {categoryAnalysis.map((cat, index) => {
                const category = cat.category as CategoryType;
                let suggestions: string[] = [];
                
                if (category === '製品情報') {
                  suggestions = [
                    '製品カテゴリー別のFAQページの作成と定期的な更新',
                    'サービス説明資料のビジュアル化と充実',
                    '利用事例やケーススタディの追加'
                  ];
                } else if (category === '技術的質問') {
                  suggestions = [
                    '技術的な質問への詳細な説明パターンの追加',
                    'トラブルシューティングガイドの作成',
                    '技術サポート体制の強化'
                  ];
                } else if (category === '価格・料金') {
                  suggestions = [
                    '料金プランの明確化と比較表の作成',
                    '導入効果と費用対効果の具体例提示',
                    '価格シミュレーターの提供'
                  ];
                } else if (category === 'サポート') {
                  suggestions = [
                    'サポート窓口の拡充と応答時間の短縮',
                    'セルフサービスポータルの強化',
                    'カスタマーサポートの品質向上'
                  ];
                }

                if (suggestions.length > 0) {
                  return (
                    <div key={index} className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md border ${CATEGORY_COLORS[category]}`}>
                          {category}
                        </span>
                        <span className="text-gray-600">
                          関連の質問が{cat.percentage}%を占めています
                        </span>
                      </div>
                      <ul className="list-disc pl-5 space-y-1">
                        {suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })}
              
              <div className="text-xs text-gray-500 mt-4">
                ※ これらの提案は、直近の質問内容と、ユーザーとの対話パターンの分析に基づいています。
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
          {processedMessages.map((msg, index) => {
            if (!msg.content) return null;

            // アスタリスクを除去する処理を追加
            const cleanContent = (text: string) => {
              return text.replace(/\*+/g, '').trim();
            };

            const content = typeof msg.content === 'string'
              ? cleanContent(msg.content)
              : cleanContent(msg.content[0]?.text || '');

            return (
              <div
                key={index}
                className={`mx-auto my-4 ${msg.role === 'user' ? 'pl-4' : 'pr-4'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`px-5 py-2 rounded-full font-medium tracking-wider ${
                      msg.role !== 'user' 
                        ? 'bg-purple-600/90' 
                        : 'bg-blue-600/90'
                    } font-noto-sans-jp text-gray-900 text-sm`}
                  >
                    {msg.role !== 'user' ? characterName || 'CHARACTER' : 'クライアント'}
                  </div>
                  {msg.timestamp && (
                    <div className="text-xs text-gray-500 font-noto-sans-jp tracking-wider">
                      {new Date(msg.timestamp).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="px-5 py-4">
                    <div className="text-gray-900 font-noto-sans-jp leading-relaxed tracking-wide">
                      {content.split('\n').map((line, i) => {
                        const isList = line.trim().startsWith('・');
                        const isEmpty = line.trim() === '';
                        return (
                          <div
                            key={i}
                            className={`
                              ${isEmpty ? 'h-4' : ''}
                              ${isList ? 'pl-4' : ''}
                              ${i > 0 ? 'mt-2' : ''}
                            `}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {processedMessages.length === 0 && (
            <div className="text-center text-gray-900 font-noto-sans-jp tracking-wider">
              {t('NoLogsYet')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHistory;