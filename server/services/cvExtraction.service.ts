import pdfParse from "pdf-parse-debugging-disabled";
import mammoth from "mammoth";
import { FileAsset } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { getCvBuffer, getCvExtension } from "./cvFile.service";

type CvAsset = Pick<
  FileAsset,
  "provider" | "publicId" | "url" | "extension"
>;

/**
 * Extract plain text from a stored CV.
 *
 * Supports PDF and DOCX. Legacy .doc (the pre-2007 OLE2 binary format) is
 * accepted for upload and download but has no text extractor here — parsing it
 * needs a heavyweight converter, and candidates who want AI features can
 * re-export as PDF. The error below says so rather than failing vaguely.
 */
class CVExtractionService {
  async extractTextFromAsset(asset: CvAsset): Promise<string> {
    const extension = getCvExtension(asset);

    // Fetched through cvFile.service, so a privately stored CV is read with
    // the service-role client rather than an HTTP GET that would 401.
    const buffer = await getCvBuffer(asset);

    switch (extension) {
      case "pdf":
        return this.extractPdf(buffer);

      case "docx":
        return this.extractDocx(buffer);

      case "doc":
        throw new AppError(
          "Text cannot be read from a .doc file. Please upload your CV as a PDF or DOCX to use this feature.",
          400
        );

      default:
        throw new AppError(`Unsupported CV format: ${extension}`, 400);
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return this.cleanText(result.text);
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return this.cleanText(result.value);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r/g, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }
}

export default new CVExtractionService();
