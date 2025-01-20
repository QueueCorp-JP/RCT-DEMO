import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'logs', 'chat-history.json');

interface ChatLog {
  question: string;
  answer: string;
  timestamp: string;
  type: 'normal' | 'improvement';
  category?: 'UI/UX' | 'feature' | 'performance' | 'other';
  status?: 'pending' | 'accepted' | 'rejected';
  priority?: 'high' | 'medium' | 'low';
}

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(path.dirname(HISTORY_FILE))) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
}

// ファイルが存在しない場合は作成
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const {
        question,
        answer,
        type = 'normal',
        category,
        status,
        priority,
      } = req.body;
      const newLog: ChatLog = {
        question,
        answer,
        timestamp: new Date().toISOString(),
        type,
        ...(type === 'improvement' && {
          category: category || 'other',
          status: status || 'pending',
          priority: priority || 'medium',
        }),
      };

      const currentLogs = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      currentLogs.push(newLog);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(currentLogs, null, 2));

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save chat log' });
    }
  } else if (req.method === 'GET') {
    try {
      const logs = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      res.status(200).json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read chat logs' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
