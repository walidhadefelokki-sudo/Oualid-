import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.status(200).json({ status: "success", data: notifications });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    const { id } = req.params;

    // Make sure the notification belongs to the requesting user before updating.
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!notification) return next(new AppError("Notification not found", 404));

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));

    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};