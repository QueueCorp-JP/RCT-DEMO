import { useCallback, useState } from 'react';
import settingsStore from '@/features/stores/settings';

export const PdfUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const systemPrompt = settingsStore((state) => state.systemPrompt);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      await handleFileUpload(file);
    } else {
      alert('PDFファイルを選択してください。');
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました');
      }

      if (!data.text) {
        throw new Error('PDFの内容を読み取れませんでした');
      }

      // PDFの内容を保存
      const pdfEntry = {
        name: file.name,
        content: data.text,
        uploadedAt: new Date().toISOString(),
      };

      // システムプロンプトを更新
      let newPrompt = systemPrompt;
      const pdfContent = `参考資料（製品説明用）：\n${data.text}\n\n※この資料は製品説明のみに使用し、改善提案は行わないでください。`;

      if (!systemPrompt.includes('参考資料（製品説明用）：')) {
        newPrompt = systemPrompt + '\n\n' + pdfContent;
      } else {
        // 既存の参考資料部分を置き換え
        const regex = /参考資料（製品説明用）：[\s\S]*?(?=\n\n|$)/;
        newPrompt = systemPrompt.replace(
          regex,
          `参考資料（製品説明用）：\n${data.text}`
        );
      }

      // 状態を更新
      settingsStore.setState({
        systemPrompt: newPrompt,
        pdfSettings: {
          pdfContent: data.text,
          lastUploadedPDF: file.name,
          pdfHistory: [
            pdfEntry,
            ...settingsStore.getState().pdfSettings.pdfHistory,
          ],
        },
      });

      alert('PDFがアップロードされ、内容が反映されました。');
    } catch (error) {
      console.error('PDF upload error:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'PDFのアップロードに失敗しました。'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileUpload(file);
        // 同じファイルを再度選択できるようにする
        event.target.value = '';
      }
    },
    []
  );

  return (
    <div className="relative">
      <label
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full h-40 px-4
          transition duration-300 ease-in-out
          border-2 border-dashed rounded-xl
          cursor-pointer bg-white/95
          ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="relative mb-4">
            <div
              className={`
              absolute inset-0 rounded-full transition-opacity duration-300
              ${dragActive ? 'opacity-40' : 'opacity-0 group-hover:opacity-30'}
              bg-gradient-to-r from-blue-600 to-blue-500 blur-lg
            `}
            ></div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="relative w-12 h-12 text-blue-600 transition-transform duration-300 transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="mb-2 text-sm text-gray-800 font-medium">
            <span className="text-blue-600 font-bold">
              クリックしてアップロード
            </span>{' '}
            または drag & drop
          </p>
          <p className="text-xs font-medium text-gray-600">PDF形式のみ対応</p>
        </div>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
          <div className="bg-white shadow-xl rounded-2xl px-8 py-5">
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1.5">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse [animation-delay:0.4s]"></div>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                アップロード中...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
