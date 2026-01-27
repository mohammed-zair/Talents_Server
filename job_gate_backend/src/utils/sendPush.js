const admin = require("../config/firebase.config");
const { User } = require("../models"); 

const sendPush = async (user_id, title, message) => {
  try {
    if (!admin?.apps?.length) {
      console.warn("[FCM] Firebase not initialized. Skipping push send.");
      return false;
    }

    const user = await User.findByPk(user_id, {
      attributes: ["fcm_token"], 
    });

    if (!user || !user.fcm_token) {
      console.warn(
        `[FCM] فشل: لم يتم العثور على رمز FCM للمستخدم ID: ${user_id}`
      );
      return false;
    }

    const registrationToken = user.fcm_token;

    const payload = {
      notification: {
        title: title,
        body: message,
      },
      data: {
       
        type: "GENERAL_NOTIFICATION",
        user_id: String(user_id),
      },
    };

    const response = await admin
      .messaging()
      .sendToDevice(registrationToken, payload);

    if (response.failureCount > 0) {
      console.error(
        `[FCM] فشل الإرسال إلى ${user_id}. الأخطاء:`,
        response.results[0].error
      );
      return false;
    }

    console.log(`[FCM] تم الإرسال بنجاح إلى المستخدم ID: ${user_id}.`);
    return true;
  } catch (error) {
    console.error(`[FCM ERROR] فشل في إرسال الإشعار لـ ${user_id}:`, error);
    return false;
  }
};

module.exports = sendPush;
