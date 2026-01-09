const { CV, CVFeaturesAnalytics } = require("../models");

/**
 * حساب درجة المطابقة بين طلب الشركة و CV
 */
exports.calculateMatchScore = (requirements, cvFeatures) => {
  let score = 0;
  const details = {};

  // Skills Matching (40%)
  if (requirements.skills?.length && cvFeatures.key_skills?.length) {
    const matchedSkills = cvFeatures.key_skills.filter(skill => requirements.skills.includes(skill));
    score += (matchedSkills.length / requirements.skills.length) * 40;
    details.skills = matchedSkills;
  }

  // Experience Matching (30%)
  if (requirements.experience_years) {
    const expScore = cvFeatures.total_years_experience >= requirements.experience_years
      ? 30
      : (cvFeatures.total_years_experience / requirements.experience_years) * 30;
    score += expScore;
    details.experience = cvFeatures.total_years_experience;
  }

  // ATS Score (30%)
  if (cvFeatures.ats_score) {
    score += Math.min(cvFeatures.ats_score, 100) * 0.3;
    details.ats_score = cvFeatures.ats_score;
  }

  return { score: Math.round(score), details };
};

/**
 * جلب CVs المؤهلة
 */
exports.getEligibleCVs = async () => {
  return CV.findAll({ include: [{ model: CVFeaturesAnalytics }] });
};
