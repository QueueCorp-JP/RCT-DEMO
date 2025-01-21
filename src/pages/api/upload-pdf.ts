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

const saveFile = async (file: formidable.File, uploadDir: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const originalName = file.originalFilename || 'unnamed.pdf';
  const fileName = `${timestamp}_${originalName}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    await fs.promises.copyFile(file.filepath, filePath);
    await fs.promises.unlink(file.filepath);
    return { fileName, filePath };
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
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
    const uploadDir = path.join(process.cwd(), 'public', 'pdfs');
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(req);
    const file = files.pdf?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    try {
      const buffer = await fs.promises.readFile(file.filepath);
      const data = await pdf(buffer);

      const { fileName } = await saveFile(file, uploadDir);

      return res.status(200).json({
        text: data.text,
        pageCount: data.numpages,
        info: data.info,
        filePath: `/pdfs/${fileName}`,
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      if (fs.existsSync(file.filepath)) {
        await fs.promises.unlink(file.filepath);
      }
      return res.status(400).json({ error: 'Invalid PDF file' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to process upload' });
  }
}
