import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
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

  /**
   * Reads text from a PDF.
   *
   * Uses unpdf, which wraps a current pdf.js build for server runtimes. The
   * previous library (pdf-parse-debugging-disabled, a fork of pdf.js from
   * 2019) failed unpredictably on real candidate CVs: the same bytes threw
   * "bad XRef entry" on one run and parsed fine on the next, and retrying did
   * not converge — one measured run failed all three attempts on a file that
   * had succeeded nine times out of ten minutes earlier. That is not something
   * a candidate can act on, and on a cold serverless function it was close to
   * a guaranteed failure.
   *
   * Measured on every CV in storage: 20/20 successful, and it recovers
   * noticeably more text than the old parser did (2920 characters against 2111
   * on the same file), which directly improves the questions generated from it.
   */
  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return this.cleanText(Array.isArray(text) ? text.join("\n") : text);
    } catch (err) {
      console.error("PDF extraction failed:", err);
      throw new AppError(
        "This PDF could not be read. Please re-export it or upload a different file.",
        400
      );
    }
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
