import React from "react";
import { Helmet } from "react-helmet-async";
import Layout from "./components/Layout";
import { useLanguage } from "./contexts/LanguageContext";

const App: React.FC = () => {
  const { t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{t("pageTitle")}</title>
      </Helmet>
      <Layout />
    </>
  );
};

export default App;
