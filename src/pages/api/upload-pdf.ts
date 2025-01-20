import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ensureDirectories = () => {
  const dirs = {
    logs: path.join(process.cwd(), 'logs'),
    pdfs: path.join(process.cwd(), 'public', 'pdfs'),
  };

  Object.values(dirs).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.chmodSync(dir, 0o755);
  });

  return dirs;
};

const verifyAndFixPermissions = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o644);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Permission error for ${filePath}:`, error);
    return false;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { logs: logsDir, pdfs: pdfStorageDir } = ensureDirectories();
    const historyPath = path.join(logsDir, 'pdf-history.json');

    const form = formidable({
      uploadDir: logsDir,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = files.pdf?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
      // PDFファイルを読み込む
      const buffer = fs.readFileSync(file.filepath);
      const data = await pdf(buffer);

      // テキストを整形し、改善提案部分を除外
      const text = data.text
        .split(/\n{2,}/) // 空行で分割
        .filter((section) => {
          // 改善提案関連のセクションを除外
          const excludePatterns = [
            '改善提案',
            '分析結果',
            'サービス改善',
            '質問内容の分析',
            '改善が推奨',
            '以下の改善',
            '占めています',
          ];
          return !excludePatterns.some((pattern) => section.includes(pattern));
        })
        .join('\n\n')
        .replace(/\n{3,}/g, '\n\n') // 3行以上の改行を2行に
        .trim();

      // 既存の履歴を読み込む
      let history: Array<{
        name: string;
        uploadedAt: string;
        content: string;
        filePath?: string;
      }> = [];

      if (fs.existsSync(historyPath)) {
        try {
          const historyData = fs.readFileSync(historyPath, 'utf-8');
          history = JSON.parse(historyData);
        } catch (e) {
          console.error('Failed to parse history:', e);
        }
      }

      // 既存のファイルの権限を確認・修正
      fs.readdirSync(pdfStorageDir).forEach((existingFile) => {
        const filePath = path.join(pdfStorageDir, existingFile);
        verifyAndFixPermissions(filePath);
      });

      // タイムスタンプを含むユニークなファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const originalName = file.originalFilename || 'unnamed.pdf';
      const fileName = `${timestamp}_${originalName}`;
      const storagePath = path.join(pdfStorageDir, fileName);

      // ファイルの保存処理
      try {
        // コピー前に既存ファイルの確認と削除
        if (fs.existsSync(storagePath)) {
          fs.unlinkSync(storagePath);
        }

        // ファイルをコピー
        fs.copyFileSync(file.filepath, storagePath);

        // 適切な権限を設定
        fs.chmodSync(storagePath, 0o644);

        // ファイルが正しくコピーされたか確認
        if (!fs.existsSync(storagePath)) {
          throw new Error('File was not copied successfully');
        }

        // ファイルサイズを確認
        const stats = fs.statSync(storagePath);
        if (stats.size === 0) {
          throw new Error('Copied file is empty');
        }

        // 新しいエントリを追加
        const newEntry = {
          name: fileName,
          uploadedAt: new Date().toISOString(),
          content: text,
          filePath: `/pdfs/${fileName}`,
        };

        // 履歴を更新（制限なし）
        history.unshift(newEntry);

        // 履歴を保存
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        fs.chmodSync(historyPath, 0o644);

        // 一時ファイルを削除
        fs.unlinkSync(file.filepath);

        return res.status(200).json({
          text,
          pageCount: data.numpages,
          info: data.info,
        });
      } catch (error) {
        console.error('Error during file processing:', error);
        // エラー時は一時ファイルを削除
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        throw error;
      }
    } catch (pdfError) {
      console.error('PDF processing error:', pdfError);
      // 一時ファイルを削除
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({ error: 'Invalid PDF file' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
}
