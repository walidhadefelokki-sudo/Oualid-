import axios from "axios";
import pdfParse from "pdf-parse-debugging-disabled";
import mammoth from "mammoth";
import { AppError } from "../middleware/error.middleware";

/**
 * Extract plain text from a CV file.
 * Supports:
 * - PDF
 * - DOCX
 */
class CVExtractionService {

  async extractTextFromCV(fileUrl: string): Promise<string> {

    if (!fileUrl) {
      throw new AppError("CV URL is missing.", 400);
    }

    // Download file
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data);

    const extension = this.getExtension(fileUrl);

    switch (extension) {

      case "pdf":
        return this.extractPdf(buffer);

      case "docx":
        return this.extractDocx(buffer);

      default:
        throw new AppError(
          `Unsupported CV format: ${extension}`,
          400
        );
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractPdf(buffer: Buffer): Promise<string> {

    const result = await pdfParse(buffer);

    return this.cleanText(result.text);

  }

  /**
   * Extract text from DOCX
   */
  private async extractDocx(buffer: Buffer): Promise<string> {

    const result = await mammoth.extractRawText({
      buffer,
    });

    return this.cleanText(result.value);

  }

  /**
   * Get extension
   */
  private getExtension(url: string): string {

    const clean = url.split("?")[0];

    return clean
      .split(".")
      .pop()
      ?.toLowerCase() || "";

  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {

    return text
      .replace(/\r/g, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

  }

}

export default new CVExtractionService();