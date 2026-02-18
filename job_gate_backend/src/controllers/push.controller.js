const { PushNotification, User } = require("../models");
const { successResponse } = require("../utils/responseHandler");
const sendPushUtil = require("../utils/sendPush");

const Notification = PushNotification;

const getRequesterUserId = (req) => req.user?.id || req.user?.user_id || null;

const buildUnreadFilter = () => {
  if (Notification.rawAttributes?.is_read) {
    return { is_read: false };
  }
  return {};
};

exports.listUserNotifications = async (req, res) => {
  const userId = getRequesterUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    return successResponse(res, notifications);
  } catch (error) {
    console.error("Error listing user notifications:", error);
    return res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
};

exports.getNotificationDetails = async (req, res) => {
  const userId = getRequesterUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const notification = await Notification.findOne({
      where: { push_id: req.params.id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return successResponse(res, notification);
  } catch (error) {
    console.error("Error getting notification details:", error);
    return res.status(500).json({ message: "Failed to fetch notification details.", error: error.message });
  }
};

exports.listUnreadNotifications = async (req, res) => {
  const userId = getRequesterUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  const unreadFilter = buildUnreadFilter();

  try {
    const where = { user_id: userId, ...unreadFilter };

    const unreadCount = await Notification.count({ where });
    const unreadNotifications = await Notification.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    return successResponse(res, {
      count: unreadCount,
      notifications: unreadNotifications,
    });
  } catch (error) {
    console.error("Error listing unread notifications:", error);
    return res.status(500).json({ message: "Failed to fetch unread notifications.", error: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const userId = getRequesterUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "User authentication is required." });
  }

  try {
    const notification = await Notification.findOne({
      where: { push_id: req.params.id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    if (Notification.rawAttributes?.is_read) {
      const patch = { is_read: true };
      if (Notification.rawAttributes?.read_at) {
        patch.read_at = new Date();
      }
      await notification.update(patch);
    }

    return successResponse(
      res,
      { notification_id: req.params.id, acknowledged: true },
      "Notification acknowledged successfully."
    );
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Failed to update notification state.", error: error.message });
  }
};

exports.sendPushToUser = async (req, res) => {
  const { target_user_id, title, message } = req.body;

  const user = await User.findByPk(target_user_id);
  if (!user) {
    return res.status(404).json({ message: "Target user not found." });
  }

  const t = await PushNotification.sequelize.transaction();
  let isSent = false;
  try {
    isSent = await sendPushUtil(target_user_id, title, message);

    const newPush = await PushNotification.create(
      {
        user_id: target_user_id,
        title,
        message,
        is_sent: isSent,
        sent_at: isSent ? new Date() : null,
      },
      { transaction: t }
    );

    await t.commit();

    const statusMessage = isSent
      ? "Notification sent and logged successfully."
      : "External send failed; notification was logged internally.";

    return successResponse(res, { push_id: newPush.push_id, is_sent: isSent }, statusMessage);
  } catch (error) {
    await t.rollback();
    console.error("Failed to send push notification:", error);
    return res.status(500).json({ message: "Failed to send push notification.", error: error.message });
  }
};

exports.listSentPushNotifications = async (req, res) => {
  try {
    const notifications = await PushNotification.findAll({
      order: [["created_at", "DESC"]],
      limit: 50,
      include: [{ model: User, attributes: ["user_id", "full_name", "email"] }],
    });

    return successResponse(res, notifications);
  } catch (error) {
    console.error("Failed to list sent push notifications:", error);
    return res.status(500).json({ message: "Failed to fetch push notification logs." });
  }
};
