import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export const config = {
  api: {
    bodyParser: false
  }
};

const ensureDirectories = () => {
  const dirs = {
    logs: path.join(process.env.VERCEL ? "/tmp" : process.cwd(), "logs"),
    pdfs: path.join(process.cwd(), "public", "pdfs")
  };

  Object.entries(dirs).forEach(([key, dir]) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create directory ${key}:`, error);
    }
  });

  return dirs;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { logs: logsDir, pdfs: pdfStorageDir } = ensureDirectories();
    const historyPath = path.join(logsDir, "pdf-history.json");

    const form = formidable({
      uploadDir: process.env.VERCEL ? "/tmp" : logsDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024
    });

    const [fields, files] = await form.parse(req);
    const file = files.pdf?.[0];

    if (!file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    try {
      const buffer = fs.readFileSync(file.filepath);
      const data = await pdf(buffer);

      const text = data.text
        .split(/\n{2}/)
        .filter(Boolean)
        .join("\n\n")
        .trim();

      let history: any[] = [];
      try {
        if (fs.existsSync(historyPath)) {
          const historyData = fs.readFileSync(historyPath, "utf-8");
          history = JSON.parse(historyData);
        }
      } catch (e) {
        console.error("Failed to read history:", e);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const originalName = file.originalFilename || "unnamed.pdf";
      const fileName = `${timestamp}_${originalName}`;
      const storagePath = path.join(pdfStorageDir, fileName);

      try {
        fs.copyFileSync(file.filepath, storagePath);

        const newEntry = {
          name: fileName,
          uploadedAt: new Date().toISOString(),
          content: text,
          filePath: `/pdfs/${fileName}`
        };

        history.unshift(newEntry);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

        fs.unlinkSync(file.filepath);

        return res.status(200).json({
          text,
          pageCount: data.numpages,
          info: data.info
        });
      } catch (error) {
        console.error("Error during file processing:", error);
        if (fs.existsSync(file.filepath)) {
          try {
            fs.unlinkSync(file.filepath);
          } catch (e) {
            console.error("Failed to delete temporary file:", e);
          }
        }
        throw error;
      }
    } catch (pdfError) {
      console.error("PDF processing error:", pdfError);
      if (fs.existsSync(file.filepath)) {
        try {
          fs.unlinkSync(file.filepath);
        } catch (e) {
          console.error("Failed to delete temporary file:", e);
        }
      }
      return res.status(400).json({ error: "Invalid PDF file" });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to process upload" });
  }
}
