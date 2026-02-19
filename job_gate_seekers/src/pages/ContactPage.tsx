import React, { useState } from "react";
import { motion } from "framer-motion";
import { Facebook, Instagram, Mail } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const ContactPage: React.FC = () => {
  const { t } = useLanguage();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const sendEmail = () => {
    const to = "talentswetrust@gmail.com";
    const subjectLine = encodeURIComponent(subject || t("contactSubjectFallback"));
    const body = encodeURIComponent(message || t("contactMessageFallback"));
    window.location.href = `mailto:${to}?subject=${subjectLine}&body=${body}`;
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--glass)]">
            <Mail size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("contactTitle")}</h1>
            <p className="text-sm text-[var(--text-muted)]">{t("contactSubtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold">{t("contactFormTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("contactNote")}</p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-[var(--text-muted)]" htmlFor="contact-subject">
                {t("contactSubject")}
              </label>
              <input
                id="contact-subject"
                className="field mt-2"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("contactSubjectPlaceholder")}
              />
            </div>

            <div>
              <label className="text-xs text-[var(--text-muted)]" htmlFor="contact-message">
                {t("contactMessage")}
              </label>
              <textarea
                id="contact-message"
                className="field mt-2 min-h-[160px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("contactMessagePlaceholder")}
              />
            </div>

            <button className="btn-primary w-full" onClick={sendEmail}>
              {t("contactSend")}
            </button>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-lg font-semibold">{t("contactEmailsTitle")}</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs text-[var(--text-muted)]">{t("contactTalentsEmail")}</div>
              <div>talentswetrust@gmail.com</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">{t("contactDevEmail")}</div>
              <div>mohammed.zair.job@gmail.com</div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-[var(--text-muted)]">{t("contactSocialTitle")}</p>
            <div className="mt-3 flex gap-3">
              {[{ key: "facebook", icon: Facebook }, { key: "instagram", icon: Instagram }].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.key}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--glass)]"
                    whileHover={{ y: -4, scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    title={t(item.key)}
                    aria-label={t(item.key)}
                  >
                    <Icon size={20} />
                  </motion.button>
                );
              })}
            </div>
            {/* <p className="mt-3 text-xs text-[var(--text-muted)]">{t("contactSocialNote")}</p> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
