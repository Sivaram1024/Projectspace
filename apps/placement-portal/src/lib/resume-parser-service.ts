import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Extracts plain text content from PDF, DOCX, DOC, or TXT file.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const ext = fileName.substring(fileName.lastIndexOf('.'));

  if (ext === '.pdf') {
    return extractTextFromPdf(file);
  }

  if (ext === '.docx') {
    return extractTextFromDocx(file);
  }

  if (ext === '.doc') {
    // For legacy binary .doc files, try reading as text or fallback gracefully
    try {
      return await extractTextFromDocx(file);
    } catch {
      return readAsPlainText(file);
    }
  }

  return readAsPlainText(file);
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    const trimmed = fullText.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
    return `[Resume Content Extracted from ${file.name}]\nUnable to extract readable text layer from scanned PDF.`;
  } catch (error: any) {
    console.warn('PDF text extraction error:', error?.message);
    return readAsPlainText(file);
  }
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    if (text) {
      return text;
    }
    return `[Resume Content Extracted from ${file.name}]`;
  } catch (error: any) {
    console.warn('DOCX text extraction error:', error?.message);
    return readAsPlainText(file);
  }
}

function readAsPlainText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      // Clean non-printable binary characters if legacy file
      const cleaned = text.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').trim();
      resolve(cleaned || `Resume uploaded: ${file.name}`);
    };
    reader.onerror = () => {
      resolve(`Resume uploaded: ${file.name}`);
    };
    reader.readAsText(file);
  });
}
