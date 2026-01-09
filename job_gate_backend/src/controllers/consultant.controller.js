const {
  User,
  Consultant,
  PushNotification, 
  ConsultationRequest,
  ConsultationBooking,
  sequelize,
} = require("../models/index");
const { successResponse } = require("../utils/responseHandler");

const sendPushNotification = async (target_user_id, title, message) => {
  try {
    // 1. محاكاة إرسال إشعار الدفع الخارجي
    // في بيئة الإنتاج، يجب استبدال هذه السطور باستدعاء دالة إرسال حقيقية
    const isSent = true;

    // 2. تسجيل الإشعار في جدول PushNotification
    await PushNotification.create({
      user_id: target_user_id,
      title,
      message,
      is_sent: isSent,
      // يمكن إضافة sent_at إذا كان موجوداً في نموذج PushNotification
    });

    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
};

const requestConsultantUpgrade = async (req, res) => {
  const { user_id } = req.user;
  const {
    bio,
    expertise_fields,
    work_history_url,
    hourly_rate,
    clients_served,
  } = req.body;

  try {
    const user = await User.findByPk(user_id);

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
    if (user.upgrade_request_status === "Pending") {
      return res
        .status(400)
        .json({ message: "لديك طلب ترقية قيد المراجعة بالفعل." });
    }
    if (
      user.user_type === "consultant" ||
      user.upgrade_request_status === "Approved"
    ) {
      return res.status(400).json({ message: "أنت مسجل بالفعل كمستشار." });
    }

    // تحديث حالة طلب الترقية للمستخدم
    await user.update({ upgrade_request_status: "Pending" });

    // إرسال إشعار دفع للإداري للمراجعة (باستخدام الدالة الجديدة)
    await sendPushNotification(
      /* Admin User ID */ 1, // يجب استبداله بمعرف الإداري الفعلي
      "طلب ترقية جديد",
      `المستخدم ${user.full_name} (${user.email}) طلب ترقية إلى مستشار.`
    );

    return successResponse(
      res,
      { status: "Pending" },
      "تم إرسال طلب الترقية بنجاح. سيتم مراجعته من قبل الإدارة."
    );
  } catch (error) {
    console.error("Error requesting upgrade:", error);
    return res.status(500).json({ message: "فشل في إرسال طلب الترقية." });
  }
};

/**
 * @desc [Admin Only] مراجعة وقبول/رفض طلب ترقية
 * @route PUT /api/admin/upgrade/:user_id
 * @access Private (يتطلب Admin)
 */
const handleConsultantUpgrade = async (req, res) => {
  const { user_id } = req.params;
  const {
    action,
    bio,
    expertise_fields,
    work_history_url,
    hourly_rate,
    clients_served,
  } = req.body; // action: 'accept' or 'reject'

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(user_id, { transaction: t });
    if (!user || user.upgrade_request_status !== "Pending") {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "طلب الترقية غير موجود أو ليس قيد الانتظار." });
    }

    if (action === "accept") {
      // 1. تحديث حالة المستخدم ونوع الحساب
      await user.update(
        {
          upgrade_request_status: "Approved",
          user_type: "consultant",
        },
        { transaction: t }
      );

      // 2. إضافة سجل المستشار إلى جدول Consultants
      const consultant = await Consultant.create(
        {
          user_id,
          bio,
          expertise_fields,
          work_history_url,
          hourly_rate,
          clients_served,
        },
        { transaction: t }
      );

      // 3. إرسال إشعار دفع للمستخدم (باستخدام الدالة الجديدة)
      await sendPushNotification(
        user_id,
        "تهانينا! تمت الموافقة على ترقيتك",
        "تمت الموافقة على طلب ترقيتك وأصبحت الآن مستشاراً في المنصة."
      );

      await t.commit();
      return successResponse(
        res,
        consultant,
        "تم قبول الترقية بنجاح وتسجيل المستشار."
      );
    } else if (action === "reject") {
      // تحديث الحالة للرفض فقط
      await user.update(
        { upgrade_request_status: "Rejected" },
        { transaction: t }
      );

      // إرسال إشعار دفع للمستخدم (باستخدام الدالة الجديدة)
      await sendPushNotification(
        user_id,
        "تحديث طلب الترقية",
        "نعتذر، لم يتم قبول طلب ترقيتك إلى مستشار حالياً. يرجى مراجعة المتطلبات."
      );

      await t.commit();
      return successResponse(res, null, "تم رفض طلب الترقية.");
    } else {
      await t.rollback();
      return res.status(400).json({
        message: "الإجراء غير صالح (يجب أن يكون 'accept' أو 'reject').",
      });
    }
  } catch (error) {
    await t.rollback();
    console.error("Error handling upgrade request:", error);
    return res
      .status(500)
      .json({ message: "فشل في معالجة الطلب.", error: error.message });
  }
};

/**
 * @desc [Public/Admin/Company] عرض بروفايل المستشار
 * @route GET /api/consultants/:user_id
 * @access Public
 */
const getConsultantProfile = async (req, res) => {
  const { user_id } = req.params;

  try {
    const consultant = await Consultant.findOne({
      where: { user_id },
      include: [
        {
          model: User,
          // عرض بيانات التواصل (الإيميل والهاتف) للجميع (حسب طلبك)
          attributes: ["user_id", "full_name", "phone", "email"],
        },
      ],
      attributes: [
        "consultant_id",
        "bio",
        "expertise_fields",
        "work_history_url",
        "hourly_rate",
        "clients_served",
      ],
    });

    if (!consultant) {
      return res
        .status(404)
        .json({ message: "المستشار غير موجود أو لم يتم تفعيله." });
    }

    // يجب أن يكون المستشار مُفعلاً (أي لديه سجل في جدول Consultants)
    return successResponse(res, consultant);
  } catch (error) {
    console.error("Error getting consultant profile:", error);
    return res.status(500).json({ message: "فشل في جلب تفاصيل المستشار." });
  }
};

/**
 * @desc [Private Seeker/Company] طلب استشارة للمستشار وإرسال إشعار
 * @route POST /api/consultants/:user_id/request-consultation
 * @access Private (يتطلب authJwt)
 */
const requestConsultation = async (req, res) => {
  const { user_id: consultant_user_id } = req.params;
  const { user_id: requester_user_id } = req.user;
  const { message } = req.body;

  try {
    const consultant = await Consultant.findOne({
      where: { user_id: consultant_user_id },
    });

    if (!consultant) {
      return res
        .status(404)
        .json({ message: "المستشار غير موجود أو غير مُفعّل." });
    }

    const requesterUser = await User.findByPk(requester_user_id);
    if (!requesterUser) {
      return res.status(404).json({ message: "المستخدم الطالب غير موجود." });
    }

    // 1) حفظ طلب الاستشارة في DB
    const requestRecord = await ConsultationRequest.create({
      consultant_id: consultant.consultant_id,
      requester_user_id,
      message: message || null,
      status: "pending",
    });

    // 2) إرسال إشعار للمستشار
    const notificationTitle = `طلب استشارة جديد من ${requesterUser.full_name}`;
    const notificationMessage =
      `الرسالة: "${message || ""}"\n` +
      `بيانات التواصل: ${requesterUser.email} - ${requesterUser.phone}`;

    await sendPushNotification(
      consultant.user_id,
      notificationTitle,
      notificationMessage
    );

    // 3) رجّع بيانات المستشار للطالب (مثل القديم)
    const consultantUser = await User.findByPk(consultant_user_id, {
      attributes: ["email", "phone", "full_name"],
    });

    return successResponse(
      res,
      {
        request_id: requestRecord.request_id,
        status: requestRecord.status,
        consultant_info: {
          full_name: consultantUser.full_name,
          email: consultantUser.email,
          phone: consultantUser.phone,
        },
      },
      "تم إنشاء طلب الاستشارة وإرساله للمستشار."
    );
  } catch (error) {
    console.error("Error requesting consultation:", error);
    return res.status(500).json({ message: "فشل في إرسال طلب الاستشارة." });
  }
};

const getAllConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.findAll({
      include: [
        {
          model: User,
          // عرض بيانات التواصل (الإيميل والهاتف) للجميع (حسب طلبك)
          attributes: ["user_id", "full_name", "phone", "email"],
        },
      ],
      attributes: [
        "consultant_id",
        "bio",
        "expertise_fields",
        "work_history_url",
        "hourly_rate",
        "clients_served",
      ],
    });

    if (!consultants || consultants.length === 0) {
      return res.status(404).json({ message: "لا يوجد مستشارون مفعّلون." });
    }

    // يجب أن يكون المستشار مُفعلاً (أي لديه سجل في جدول Consultants)
    return successResponse(res, consultants);
  } catch (error) {
    console.error("Error getting consultant profile:", error);
    return res.status(500).json({ message: "فشل في جلب تفاصيل المستشار." });
  }
};
/**
 * @desc [Consultant] عرض كل طلبات الاستشارة التي وصلت للمستشار
 * @route GET /api/consultant/requests
 * @access Private (Consultant)
 */
const listIncomingConsultationRequests = async (req, res) => {
  const { user_id } = req.user;

  try {
    const consultant = await Consultant.findOne({ where: { user_id } });
    if (!consultant) {
      return res.status(403).json({ message: "أنت لست مستشاراً." });
    }

    const requests = await ConsultationRequest.findAll({
      where: { consultant_id: consultant.consultant_id },
      include: [
        {
          model: User,
          attributes: ["user_id", "full_name", "email", "phone"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return successResponse(res, requests);
  } catch (error) {
    console.error("Error listing incoming consultation requests:", error);
    return res.status(500).json({ message: "فشل في جلب طلبات الاستشارة." });
  }
};

/**
 * @desc [Consultant] قبول/رفض طلب استشارة
 * @route PUT /api/consultant/requests/:request_id
 * @access Private (Consultant)
 * body: { action: "accept" | "reject" }
 */
const respondToConsultationRequest = async (req, res) => {
  const { user_id } = req.user;
  const { request_id } = req.params;
  const { action } = req.body;

  try {
    const consultant = await Consultant.findOne({ where: { user_id } });
    if (!consultant) {
      return res.status(403).json({ message: "أنت لست مستشاراً." });
    }

    const requestRecord = await ConsultationRequest.findOne({
      where: { request_id, consultant_id: consultant.consultant_id },
    });

    if (!requestRecord) {
      return res.status(404).json({ message: "طلب الاستشارة غير موجود." });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "action يجب أن يكون accept أو reject" });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    await requestRecord.update({ status: newStatus });

    // إشعار للطالب
    await sendPushNotification(
      requestRecord.requester_user_id,
      "تحديث طلب الاستشارة",
      `تم ${newStatus === "accepted" ? "قبول" : "رفض"} طلب الاستشارة الخاص بك.`
    );

    return successResponse(res, requestRecord, "تم تحديث حالة طلب الاستشارة.");
  } catch (error) {
    console.error("Error responding to consultation request:", error);
    return res.status(500).json({ message: "فشل في تحديث الطلب." });
  }
};

/**
 * @desc [User/Seeker] حجز موعد استشارة
 * @route POST /api/consultant/bookings
 * @access Private
 * body: { consultant_user_id, start_time, end_time }
 */
const createConsultationBooking = async (req, res) => {
  const { user_id } = req.user;
  const { consultant_user_id, start_time, end_time } = req.body;

  try {
    if (!consultant_user_id || !start_time || !end_time) {
      return res.status(400).json({
        message: "consultant_user_id و start_time و end_time مطلوبة.",
      });
    }

    const consultant = await Consultant.findOne({
      where: { user_id: consultant_user_id },
    });

    if (!consultant) {
      return res.status(404).json({ message: "المستشار غير موجود." });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: "وقت غير صالح." });
    }

    // منع تداخل الحجوزات لنفس المستشار
    const conflict = await ConsultationBooking.findOne({
      where: {
        consultant_id: consultant.consultant_id,
        status: "booked",
        start_time: { [require("sequelize").Op.lt]: end },
        end_time: { [require("sequelize").Op.gt]: start },
      },
    });

    if (conflict) {
      return res.status(400).json({ message: "الموعد محجوز بالفعل." });
    }

    const booking = await ConsultationBooking.create({
      consultant_id: consultant.consultant_id,
      user_id,
      start_time: start,
      end_time: end,
      status: "booked",
    });

    // إشعار للمستشار
    await sendPushNotification(
      consultant.user_id,
      "حجز استشارة جديد",
      `تم حجز موعد استشارة من مستخدم رقم ${user_id} من ${start.toISOString()} إلى ${end.toISOString()}`
    );

    return successResponse(res, booking, "تم حجز الموعد بنجاح.", 201);
  } catch (error) {
    console.error("Error creating consultation booking:", error);
    return res.status(500).json({ message: "فشل في حجز الموعد.", error: error.message });
  }
};

/**
 * @desc [Consultant] عرض الحجوزات الخاصة بالمستشار
 * @route GET /api/consultant/bookings
 * @access Private (Consultant)
 */
const listConsultantBookings = async (req, res) => {
  const { user_id } = req.user;

  try {
    const consultant = await Consultant.findOne({ where: { user_id } });
    if (!consultant) {
      return res.status(403).json({ message: "أنت لست مستشاراً." });
    }

    const bookings = await ConsultationBooking.findAll({
      where: { consultant_id: consultant.consultant_id },
      include: [{ model: User, attributes: ["user_id", "full_name", "email", "phone"] }],
      order: [["start_time", "ASC"]],
    });

    return successResponse(res, bookings);
  } catch (error) {
    console.error("Error listing consultant bookings:", error);
    return res.status(500).json({ message: "فشل في جلب الحجوزات." });
  }
};

/**
 * @desc [User OR Consultant] إلغاء الحجز
 * @route DELETE /api/consultant/bookings/:booking_id
 * @access Private
 */
const cancelConsultationBooking = async (req, res) => {
  const { user_id } = req.user;
  const { booking_id } = req.params;

  try {
    const booking = await ConsultationBooking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود." });
    }

    // يسمح بالإلغاء للمستخدم صاحب الحجز أو المستشار صاحب الحجز
    const consultant = await Consultant.findOne({ where: { user_id } });
    const isConsultantOwner = consultant && consultant.consultant_id === booking.consultant_id;
    const isUserOwner = booking.user_id === user_id;

    if (!isConsultantOwner && !isUserOwner) {
      return res.status(403).json({ message: "ليس لديك صلاحية لإلغاء هذا الحجز." });
    }

    await booking.update({ status: "cancelled" });

    return successResponse(res, booking, "تم إلغاء الحجز بنجاح.");
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ message: "فشل في إلغاء الحجز." });
  }
};

module.exports = {
  sendPushNotification,
  requestConsultation,
  getConsultantProfile,
  handleConsultantUpgrade,
  requestConsultantUpgrade,
  getAllConsultants,
  listIncomingConsultationRequests,
  respondToConsultationRequest,
  createConsultationBooking,
  listConsultantBookings,
  cancelConsultationBooking,
};
