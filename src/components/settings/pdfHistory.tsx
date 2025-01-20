import React from 'react';
import { useEffect, useState } from 'react';
import settingsStore from '@/features/stores/settings';

interface PDFFile {
  name: string;
  uploadedAt: string;
  content: string;
  filePath?: string;
}

export const PDFHistory = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [activeFileIndexes, setActiveFileIndexes] = useState<number[]>([]);
  const systemPrompt = settingsStore((state) => state.systemPrompt);

  useEffect(() => {
    const loadPDFHistory = async () => {
      try {
        const response = await fetch('/api/pdf-history');
        if (response.ok) {
          const data = await response.json();
          setPdfFiles(data.files || []);
        }
      } catch (error) {
        console.error('Failed to load PDF history:', error);
      }
    };

    loadPDFHistory();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return '今';
      if (minutes < 60) return `${minutes}分前`;
      if (hours < 24) return `${hours}時間前`;
      if (days < 7) return `${days}日前`;

      return new Intl.DateTimeFormat('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return null;
    }
  };

  const handleDeletePDF = async (file: PDFFile) => {
    if (!confirm(`${file.name}を削除してもよろしいですか？`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/pdf-history?fileName=${encodeURIComponent(file.name)}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setPdfFiles(pdfFiles.filter((f) => f.name !== file.name));
      } else {
        throw new Error('Failed to delete PDF');
      }
    } catch (error) {
      console.error('Failed to delete PDF:', error);
      alert('PDFの削除に失敗しました。');
    }
  };

  const handleDeleteAllPDFs = async () => {
    if (!confirm('すべてのPDFを削除してもよろしいですか？')) {
      return;
    }

    try {
      for (const file of pdfFiles) {
        await fetch(
          `/api/pdf-history?fileName=${encodeURIComponent(file.name)}`,
          {
            method: 'DELETE',
          }
        );
      }
      setPdfFiles([]);
    } catch (error) {
      console.error('Failed to delete PDFs:', error);
      alert('PDFの削除に失敗しました。');
    }
  };

  const handleTogglePDF = (index: number, content: string) => {
    try {
      const isActive = activeFileIndexes.includes(index);
      let newPrompt = systemPrompt;

      if (isActive) {
        newPrompt = newPrompt.replace(content + '\n', '');
        setActiveFileIndexes(activeFileIndexes.filter((i) => i !== index));
      } else {
        if (!systemPrompt.includes('{{PDF_CONTENT}}')) {
          newPrompt = systemPrompt + '\n\n参考資料：\n{{PDF_CONTENT}}';
        }
        newPrompt = newPrompt.replace(
          '{{PDF_CONTENT}}',
          content + '\n{{PDF_CONTENT}}'
        );
        setActiveFileIndexes([...activeFileIndexes, index]);
      }

      if (newPrompt.endsWith('{{PDF_CONTENT}}')) {
        newPrompt = newPrompt.replace('\n{{PDF_CONTENT}}', '');
      }

      settingsStore.setState({ systemPrompt: newPrompt });
    } catch (error) {
      console.error('Failed to toggle PDF:', error);
      alert('PDFの適用/解除に失敗しました。');
    }
  };

  if (pdfFiles.length === 0) {
    return (
      <div className="mt-4 text-xs text-gray-400 text-center py-2">
        アップロード履歴はありません
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white/95 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-50 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                最近のPDF
              </h3>
              <button
                onClick={handleDeleteAllPDFs}
                className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-300 transition-all duration-200"
              >
                すべて削除
              </button>
            </div>
            <p className="text-sm font-medium text-gray-600 mt-0.5">
              {activeFileIndexes.length > 0 &&
                `${activeFileIndexes.length}件適用中 / `}
              {pdfFiles.length}件
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
        <div className="space-y-2.5">
          {pdfFiles.map((file, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl p-3.5 border border-gray-200 hover:border-blue-300 transition-all duration-200
                ${activeFileIndexes.includes(index) ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div
                    className={`p-2.5 rounded-xl mr-3.5 flex-shrink-0 border transition-all duration-200
                    ${
                      activeFileIndexes.includes(index)
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 group-hover:border-blue-200 group-hover:shadow-sm'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {file.name || 'Untitled PDF'}
                        </p>
                        {formatDate(file.uploadedAt) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {formatDate(file.uploadedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePDF(index, file.content)}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 flex-shrink-0
                      ${
                        activeFileIndexes.includes(index)
                          ? 'bg-gray-700 text-gray-50 hover:bg-gray-600 shadow-sm ring-1 ring-gray-900/10 font-bold'
                          : 'text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    {activeFileIndexes.includes(index) ? '解除' : '適用'}
                  </button>
                  <button
                    onClick={() => handleDeletePDF(file)}
                    className="px-3 py-1.5 text-sm font-semibold text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-300 transition-all duration-200"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
