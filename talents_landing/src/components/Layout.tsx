import React from "react";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Hero from "./Hero";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const orbAnimation = {
  y: [0, -20, 0],
  x: [0, 16, 0],
};

const Layout: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100 mesh">
      <motion.div
        className={`orb orb-left ${theme === "light" ? "orb-light" : ""}`}
        animate={orbAnimation}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`orb orb-right ${theme === "light" ? "orb-light" : ""}`}
        animate={{ ...orbAnimation, x: [0, -16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      <Navbar />
      <Hero />

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-10 text-xs text-white/50 dark:text-white/50">
        <span>{t("footer")}</span>
        <a href="https://admin.talents-we-trust.tech/" className="opacity-60 transition hover:opacity-100">
          {t("adminLink")}
        </a>
      </footer>
    </div>
  );
};

export default Layout;
