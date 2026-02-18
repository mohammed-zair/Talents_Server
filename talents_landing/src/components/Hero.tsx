import React from "react";
import { motion } from "framer-motion";
import GlassButton from "./GlassButton";
import { useLanguage } from "../contexts/LanguageContext";

const Hero: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8">
      <div className="glass rounded-3xl p-8 md:p-12">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-brand-cyan" />
              <span>{t("pill")}</span>
            </div>

            <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-bold leading-tight text-transparent md:text-5xl">
              {t("headline")}
            </h1>

            <p className="mt-4 text-white/70 dark:text-white/70">{t("subhead")}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlassButton href="https://talents-we-trust.tech/download/app-release.apk" label={t("btnDownload")} primary />
              <GlassButton href="https://companies.talents-we-trust.tech/" label={t("btnCompanies")} />
              <GlassButton href="https://job-seekers.talents-we-trust.tech/" label={t("btnJobSeekers")} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="glass rounded-2xl p-6"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 dark:text-white/60">{t("aiEdgeTitle")}</p>
            <p className="mt-3 text-sm text-white/70 dark:text-white/70">{t("aiEdgeBody")}</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
