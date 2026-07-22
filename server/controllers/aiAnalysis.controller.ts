import { Request, Response, NextFunction } from "express";
import aiAnalysisService from "../services/aiAnalysis.service";

class AIAnalysisController {

  // ============================================================
  // Analyze Application
  // ============================================================

  async analyzeApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const { applicationId } = req.params;

      const analysis =
        await aiAnalysisService.analyzeApplication(
          applicationId
        );

      res.status(200).json({
        success: true,
        message:
          "AI analysis completed successfully.",
        data: analysis,
      });

    } catch (error) {
      next(error);
    }

  }

  // ============================================================
  // Get One Analysis
  // ============================================================

  async getAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const { applicationId } = req.params;

      const analysis =
        await aiAnalysisService.getAnalysis(
          applicationId
        );

      res.status(200).json({
        success: true,
        data: analysis,
      });

    } catch (error) {
      next(error);
    }

  }

  // ============================================================
  // Recruiter Dashboard
  // ============================================================

  async getRecruiterAnalyses(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const recruiterUserId =
        req.user!.id;

      const page =
        Number(req.query.page) || 1;

      const limit =
        Number(req.query.limit) || 10;

      const result =
        await aiAnalysisService.getRecruiterAnalyses(
          recruiterUserId,
          page,
          limit
        );

      res.status(200).json({
        success: true,
        ...result,
      });

    } catch (error) {
      next(error);
    }

  }

  // ============================================================
  // Recruiter Statistics
  // ============================================================

  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const recruiterUserId =
        req.user!.id;

      const stats =
        await aiAnalysisService.getStatistics(
          recruiterUserId
        );

      res.status(200).json({
        success: true,
        data: stats,
      });

    } catch (error) {
      next(error);
    }

  }

  // ============================================================
  // Recalculate Analysis
  // ============================================================

  async recalculate(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const { applicationId } =
        req.params;

      const analysis =
        await aiAnalysisService.recalculate(
          applicationId
        );

      res.status(200).json({
        success: true,
        message:
          "AI analysis recalculated successfully.",
        data: analysis,
      });

    } catch (error) {
      next(error);
    }

  }

  // ============================================================
  // Delete Analysis
  // ============================================================

  async deleteAnalysis(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    try {

      const { applicationId } =
        req.params;

      const result =
        await aiAnalysisService.deleteAnalysis(
          applicationId
        );

      res.status(200).json(result);

    } catch (error) {
      next(error);
    }

  }

}

export default new AIAnalysisController();