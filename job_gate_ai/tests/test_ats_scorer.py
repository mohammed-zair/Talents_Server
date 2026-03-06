from app.services.ats_scorer import ATSScorer


def test_count_quantifiable_achievements_mixed_experience_types():
    scorer = ATSScorer()
    cv = {
        "experience": [
            {"achievements": ["Improved KPI by 30%", "Built feature"]},
            "free text experience",
            {"achievements": "Grew sales by 20%"},
            None,
        ]
    }
    assert scorer._count_quantifiable_achievements(cv) == 2


def test_calculate_score_does_not_crash_on_string_experience():
    scorer = ATSScorer()
    cv = {
        "personal_info": {"email": "a@b.com"},
        "experience": "worked at company",
        "education": "BSc",
        "skills": "python, fastapi",
        "projects": [{"title": "ATS helper"}],
    }
    result = scorer.calculate_score(cv, "python fastapi")
    assert isinstance(result, dict)
    assert "score" in result
    assert result["score"] >= 0


def test_extract_cv_features_handles_non_dict_projects():
    scorer = ATSScorer()
    cv = {
        "skills": ["python"],
        "experience": [{"achievements": ["Raised NPS by 12"]}],
        "projects": ["project one", {"title": "project two"}, 5],
    }
    features = scorer.extract_cv_features(cv)
    assert features["project_count"] == 3
    assert "project two" in features["project_names"]
