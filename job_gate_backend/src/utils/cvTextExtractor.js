const fs = require("fs");
const path = require("path");

let pdfParse;
let mammoth;

try {
  pdfParse = require("pdf-parse");
} catch (err) {
  pdfParse = null;
}

try {
  mammoth = require("mammoth");
} catch (err) {
  mammoth = null;
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const normalizeText = (text) => String(text || "").replace(/\s+/g, " ").trim();

const extractEmailFromText = (text) => {
  const matches = normalizeText(text).match(EMAIL_REGEX);
  return matches && matches.length > 0 ? matches[0] : null;
};

const extractTextFromPdf = async (filePath) => {
  if (!pdfParse) {
    throw new Error("Missing dependency: pdf-parse. Run `npm install` first.");
  }
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  return result?.text || "";
};

const extractTextFromDocx = async (filePath) => {
  if (!mammoth) {
    throw new Error("Missing dependency: mammoth. Run `npm install` first.");
  }
  const result = await mammoth.extractRawText({ path: filePath });
  return result?.value || "";
};

const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return extractTextFromPdf(filePath);
  if (ext === ".docx") return extractTextFromDocx(filePath);
  throw new Error(`Unsupported file type: ${ext}`);
};

module.exports = {
  extractTextFromFile,
  extractEmailFromText,
};
