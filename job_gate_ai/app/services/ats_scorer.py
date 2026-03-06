from typing import Any, Dict, List


ARABIC_CHARS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"


class ATSScorer:
    def __init__(self):
        self.rules = {
            "has_contact_info": 10,
            "has_work_experience": 20,
            "has_education": 15,
            "has_skills_section": 10,
            "has_quantifiable_achievements": 15,
            "proper_formatting": 10,
            "has_projects": 15,
            "keyword_density": 20,
        }

    def _ensure_dict(self, value: Any) -> Dict[str, Any]:
        return value if isinstance(value, dict) else {}

    def _ensure_list(self, value: Any) -> List[Any]:
        if isinstance(value, list):
            return value
        if value is None:
            return []
        if isinstance(value, dict):
            return [value]
        if isinstance(value, str):
            v = value.strip()
            return [v] if v else []
        return [value]

    def _dict_list(self, value: Any) -> List[Dict[str, Any]]:
        out = []
        for item in self._ensure_list(value):
            if isinstance(item, dict):
                out.append(item)
            elif isinstance(item, str):
                s = item.strip()
                if s:
                    out.append({"entry": s})
            else:
                s = str(item).strip()
                if s:
                    out.append({"entry": s})
        return out

    def _string_list(self, value: Any) -> List[str]:
        out = []
        for item in self._ensure_list(value):
            if isinstance(item, str):
                s = item.strip()
                if s:
                    out.append(s)
            else:
                s = str(item).strip()
                if s and s.lower() != "none":
                    out.append(s)
        return out

    def _project_names(self, projects: Any) -> List[str]:
        names = []
        for p in self._dict_list(projects):
            title = p.get("title") or p.get("name") or p.get("entry") or ""
            if isinstance(title, str) and title.strip():
                names.append(title.strip())
        return names

    def extract_cv_features(self, structured_data: Dict[str, Any]) -> Dict[str, Any]:
        structured_data = self._ensure_dict(structured_data)
        skills = self._string_list(structured_data.get("skills"))
        experience = self._dict_list(structured_data.get("experience"))
        projects = self._dict_list(structured_data.get("projects"))
        project_names = self._project_names(projects)

        return {
            "key_skills": skills,
            "total_years_experience": self._calculate_years_experience(experience),
            "achievement_count": self._count_quantifiable_achievements(structured_data),
            "has_education": len(self._dict_list(structured_data.get("education"))) > 0,
            "has_certifications": len(self._string_list(structured_data.get("certifications"))) > 0,
            "has_languages": len(self._dict_list(structured_data.get("languages"))) > 0,
            "project_count": len(projects),
            "project_names": project_names,
        }

    def calculate_score(
        self,
        structured_cv: Dict[str, Any],
        job_description: str = "",
        weights: Dict[str, float] = None,
    ) -> Dict[str, Any]:
        structured_cv = self._ensure_dict(structured_cv)
        personal_info = self._ensure_dict(structured_cv.get("personal_info"))
        experience = self._dict_list(structured_cv.get("experience"))
        education = self._dict_list(structured_cv.get("education"))
        skills = self._string_list(structured_cv.get("skills"))
        projects = self._dict_list(structured_cv.get("projects"))

        score = 0
        feedback = []
        features = {}
        _ = weights or {}

        if personal_info.get("email"):
            score += self.rules["has_contact_info"]
            feedback.append("Has contact information")
        else:
            feedback.append("Missing contact information")

        if len(experience) > 0:
            score += self.rules["has_work_experience"]
            feedback.append("Has work experience section")
            features["years_experience"] = self._calculate_years_experience(experience)
        else:
            feedback.append("Missing work experience section")

        if len(education) > 0:
            score += self.rules["has_education"]
            feedback.append("Has education section")
        else:
            feedback.append("Missing education section")

        if len(skills) > 0:
            score += self.rules["has_skills_section"]
            feedback.append("Has skills section")
            features["skills_count"] = len(skills)
            features["key_skills"] = skills[:10]
        else:
            feedback.append("Missing skills section")

        if len(projects) > 0:
            score += self.rules["has_projects"]
            feedback.append(f"Has projects ({len(projects)})")
            features["project_count"] = len(projects)
            features["project_names"] = self._project_names(projects)
        else:
            feedback.append("Missing projects section")

        quantifiable_count = self._count_quantifiable_achievements(structured_cv)
        if quantifiable_count > 0:
            score += self.rules["has_quantifiable_achievements"]
            feedback.append(f"Has {quantifiable_count} quantifiable achievements")
            features["achievement_count"] = quantifiable_count
        else:
            feedback.append("Missing quantifiable achievements")

        if job_description and skills:
            job_lower = str(job_description).lower()
            matched = [skill for skill in skills if skill.lower() in job_lower]
            if matched:
                keyword_bonus = min(10, len(matched) * 2)
                score += keyword_bonus
                features["keyword_matches"] = matched
                feedback.append(f"Matched {len(matched)} job keywords")

        if quantifiable_count > 0:
            impact_bonus = round(score * 0.1, 2)
            score += impact_bonus
            features["impact_bonus"] = impact_bonus

        return {"score": min(score, 100), "feedback": feedback, "features": features}

    def _calculate_years_experience(self, experience: List[Dict[str, Any]]) -> float:
        return len(self._dict_list(experience)) * 1.5

    def _count_quantifiable_achievements(self, cv: Dict[str, Any]) -> int:
        count = 0
        cv = self._ensure_dict(cv)

        for exp in self._dict_list(cv.get("experience")):
            achievements = exp.get("achievements", [])
            for achievement in self._string_list(achievements):
                if any(ch.isdigit() for ch in achievement):
                    count += 1
        return count

    def check_arabic_specific_rules(self, structured_data: Dict[str, Any]) -> List[str]:
        feedback = []
        structured_data = self._ensure_dict(structured_data)
        personal_info = self._ensure_dict(structured_data.get("personal_info"))

        full_name = str(personal_info.get("full_name", ""))
        if full_name and not any(ch in full_name for ch in ARABIC_CHARS):
            feedback.append("Name might not be in Arabic format")

        skills = self._string_list(structured_data.get("skills"))
        arabic_skills = [s for s in skills if any(ch in s for ch in ARABIC_CHARS)]
        if skills and len(arabic_skills) < len(skills) / 2:
            feedback.append("Consider adding Arabic skill descriptions")

        return feedback
