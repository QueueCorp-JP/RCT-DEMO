import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface PDFHistoryEntry {
  name: string;
  uploadedAt: string;
  content: string;
  filePath?: string;
}

const ensureDirectories = () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const pdfsDir = path.join(process.cwd(), 'public', 'pdfs');

  // 必要なディレクトリを作成
  [logsDir, pdfsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // ディレクトリの権限を設定
    fs.chmodSync(dir, 0o755);
  });

  return { logsDir, pdfsDir };
};

const readHistory = (historyPath: string): PDFHistoryEntry[] => {
  if (!fs.existsSync(historyPath)) {
    return [];
  }

  try {
    const historyData = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(historyData);
  } catch (e) {
    console.error('Failed to read history:', e);
    return [];
  }
};

const writeHistory = (historyPath: string, history: PDFHistoryEntry[]) => {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    fs.chmodSync(historyPath, 0o644);
  } catch (e) {
    console.error('Failed to write history:', e);
    throw e;
  }
};

const verifyPDFFile = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // ファイルの権限を確認して修正
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch {
      fs.chmodSync(filePath, 0o644);
    }

    return true;
  } catch (e) {
    console.error(`Failed to verify PDF file ${filePath}:`, e);
    return false;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { logsDir } = ensureDirectories();
  const historyPath = path.join(logsDir, 'pdf-history.json');

  if (req.method === 'GET') {
    try {
      let history = readHistory(historyPath);

      // 実際のPDFファイルが存在するエントリのみを返す
      history = history.filter(entry => {
        if (!entry.filePath) return false;
        const filePath = path.join(process.cwd(), 'public', entry.filePath);
        return verifyPDFFile(filePath);
      });

      // 履歴を更新
      writeHistory(historyPath, history);

      return res.status(200).json({ files: history });
    } catch (error) {
      console.error('Failed to read PDF history:', error);
      return res.status(500).json({ error: 'Failed to read PDF history' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { fileName } = req.query;
      if (typeof fileName !== 'string') {
        return res.status(400).json({ error: 'File name is required' });
      }

      let history = readHistory(historyPath);
      const entryToDelete = history.find(entry => entry.name === fileName);

      if (!entryToDelete) {
        return res.status(404).json({ error: 'File not found in history' });
      }

      // PDFファイルの削除
      if (entryToDelete.filePath) {
        const filePath = path.join(process.cwd(), 'public', entryToDelete.filePath);
        if (fs.existsSync(filePath)) {
          try {
            // ファイルの権限を変更して削除を試行
            fs.chmodSync(filePath, 0o666);
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error('Failed to delete PDF file:', error);
            return res.status(500).json({ error: 'Failed to delete PDF file' });
          }
        }
      }

      // 履歴から削除
      history = history.filter(entry => entry.name !== fileName);
      writeHistory(historyPath, history);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete PDF:', error);
      return res.status(500).json({ error: 'Failed to delete PDF' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}