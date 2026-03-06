require("dotenv").config(); // لتحميل JWT_SECRET و DB_CONFIG
const bcrypt = require("bcryptjs");
const { User, Admin, sequelize } = require("../src/models"); // تأكد من صحة المسار لمجلد models

const createAdminFromTerminal = async () => {
  // استقبال البيانات: node create-admin.js "الاسم" "الإيميل" "الباسورد" "الهاتف"
  const [, , full_name, email, password, phone] = process.argv;

  if (!full_name || !email || !password) {
    console.log("\n❌ عذراً، يجب إدخال البيانات المطلوبة:");
    console.log(
      '💡 الاستخدام: node create-admin.js "Full Name" "email@example.com" "password123" "012345678"\n'
    );
    process.exit(1);
  }

  const t = await sequelize.transaction();

  try {
    // 1. التحقق من وجود المستخدم
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error("❌ خطأ: هذا البريد الإلكتروني مسجل مسبقاً.");
      process.exit(1);
    }

    // 2. تشفير كلمة المرور
    const hashed_password = await bcrypt.hash(password, 10);

    // 3. إنشاء السجل في جدول User بنوع admin
    const user = await User.create(
      {
        full_name,
        email,
        hashed_password,
        phone: phone || null,
        user_type: "admin",
        is_active: true,
        profile_completed: true,
      },
      { transaction: t }
    );

    // 4. إنشاء السجل في جدول Admin المرتبط
    await Admin.create(
      {
        admin_id: user.user_id, // ربط الـ ID إذا كان موديل Admin يتبع للـ User
        full_name,
        email,
        hashed_password,
      },
      { transaction: t }
    );

    // تأكيد العملية
    await t.commit();
    console.log("\n✅ تم إنشاء حساب الأدمن بنجاح!");
    console.log("---------------------------");
    console.log(`👤 الاسم: ${full_name}`);
    console.log(`📧 الإيميل: ${email}`);
    console.log("---------------------------\n");
  } catch (error) {
    await t.rollback();
    console.error("❌ حدث خطأ أثناء الإنشاء:", error.message);
  } finally {
    await sequelize.close();
  }
};

createAdminFromTerminal();
