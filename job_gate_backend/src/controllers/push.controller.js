// file: src/controllers/notification.controller.js (الملف المُدمج والنهائي)
// أضف sequelize هنا
const { PushNotification, User, sequelize } = require("../models");
const { successResponse } = require("../utils/responseHandler");

//   افترض وجود دالة خارجية لإرسال إشعارات الدفع
const sendPushUtil = require("../utils/sendPush");

//   دوال إشعارات المستخدم (User Notifications - Inbox)

/**
 * @desc [Private] عرض جميع إشعارات المستخدم الحالي
 * @route GET /api/user/notifications
 * @access Private (يتطلب authJwt)
 */
exports.listUserNotifications = async (req, res) => {
  const { user_id } = req.user;

  try {
    const notifications = await Notification.findAll({
      where: { user_id },
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    return successResponse(res, notifications);
  } catch (error) {
    console.error("Error listing user notifications:", error);
    return res
      .status(500)
      .json({ message: "فشل في جلب الإشعارات.", error: error.message });
  }
};

/**
 * @desc [Private] عرض تفاصيل إشعار محدد
 * @route GET /api/user/notifications/:id
 * @access Private (يتطلب authJwt)
 */
exports.getNotificationDetails = async (req, res) => {
  const { user_id } = req.user;
  const { id } = req.params;

  try {
    const notification = await Notification.findOne({
      where: { notification_id: id, user_id }, // التأكد من أن الإشعار يخص المستخدم
    });

    if (!notification) {
      return res.status(404).json({ message: "الإشعار غير موجود." });
    }

    return successResponse(res, notification);
  } catch (error) {
    console.error("Error getting notification details:", error);
    return res
      .status(500)
      .json({ message: "فشل في جلب تفاصيل الإشعار.", error: error.message });
  }
};

/**
 * @desc [Private] عرض الإشعارات غير المقروءة للمستخدم الحالي
 * @route GET /api/user/notifications/unread
 * @access Private (يتطلب authJwt)
 */
exports.listUnreadNotifications = async (req, res) => {
  const { user_id } = req.user;

  try {
    const unreadCount = await Notification.count({
      where: { user_id, is_read: false },
    });

    const unreadNotifications = await Notification.findAll({
      where: { user_id, is_read: false },
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    return successResponse(res, {
      count: unreadCount,
      notifications: unreadNotifications,
    });
  } catch (error) {
    console.error("Error listing unread notifications:", error);
    return res.status(500).json({
      message: "فشل في جلب الإشعارات غير المقروءة.",
      error: error.message,
    });
  }
};

/**
 * @desc [Private] تعليم إشعار محدد كمقروء
 * @route PUT /api/user/notifications/:id/read
 * @access Private (يتطلب authJwt)
 */
exports.markNotificationAsRead = async (req, res) => {
  const { user_id } = req.user;
  const { id } = req.params;

  try {
    const notification = await Notification.findOne({
      where: { notification_id: id, user_id, is_read: false }, // نبحث فقط عن غير المقروء
    });

    if (!notification) {
      // قد يكون غير موجود أو مقروء بالفعل
      return res
        .status(404)
        .json({ message: "الإشعار غير موجود أو مقروء مسبقاً." });
    }

    // تحديث حالة القراءة
    await notification.update({ is_read: true, read_at: new Date() });

    return successResponse(
      res,
      { notification_id: id, is_read: true },
      "تم وضع الإشعار كمقروء بنجاح."
    );
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res
      .status(500)
      .json({ message: "فشل في تحديث حالة الإشعار.", error: error.message });
  }
};

//   دوال إشعارات الدفع (Admin Push Notifications)

/**
 * @desc [Admin Only] يقوم بإنشاء سجل إشعار دفع وإرساله إلى مستخدم محدد.
 * @route POST /api/admin/push/send
 * @access Private (يتطلب Admin)
 */
exports.sendPushToUser = async (req, res) => {
  const { target_user_id, title, message } = req.body;

  const user = await User.findByPk(target_user_id);
  if (!user) {
    return res.status(404).json({ message: "المستخدم المستهدف غير موجود." });
  }

  // استخدام sequelize.transaction
  const t = await PushNotification.sequelize.transaction();
  let isSent = false;
  try {
    // 1. محاولة الإرسال الفعلي
    isSent = await sendPushUtil(target_user_id, title, message);

    // 2. تسجيل الإشعار في قاعدة البيانات
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
      ? "تم الإرسال والتسجيل بنجاح."
      : "فشل الإرسال الخارجي، تم التسجيل داخلياً.";
    return successResponse(
      res,
      { push_id: newPush.push_id, is_sent: isSent },
      statusMessage
    );
  } catch (error) {
    await t.rollback();
    console.error("فشل في إرسال إشعار الدفع:", error);
    return res.status(500).json({
      message: "فشل في عملية إرسال إشعار الدفع.",
      error: error.message,
    });
  }
};

/**
 * @desc [Admin Only] عرض سجلات إشعارات الدفع المرسلة.
 * @route GET /api/admin/push
 * @access Private (يتطلب Admin)
 */
exports.listSentPushNotifications = async (req, res) => {
  try {
    const notifications = await PushNotification.findAll({
      order: [["created_at", "DESC"]],
      limit: 50,
      include: [{ model: User, attributes: ["user_id", "full_name", "email"] }], // إضافة user_id
    });
    return successResponse(res, notifications);
  } catch (error) {
    console.error("فشل في جلب سجلات إشعارات الدفع:", error);
    return res.status(500).json({ message: "فشل في جلب السجلات." });
  }
};
