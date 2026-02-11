import { useMemo, useState } from "react";
import type { CandidateProfile } from "../../types";

export interface Weighting {
  education: number;
  experience: number;
  skills: number;
}

const defaultWeights: Weighting = {
  education: 0.3,
  experience: 0.4,
  skills: 0.3,
};

export const useAI = (candidates: CandidateProfile[]) => {
  const [weights, setWeights] = useState<Weighting>(defaultWeights);
  const [query, setQuery] = useState("");

  const rankedCandidates = useMemo(() => {
    return [...candidates]
      .map((candidate) => {
        const educationValue = candidate.education ?? "";
        const educationScore = educationValue.toLowerCase().includes("master") ? 0.9 : 0.7;
        const experienceYears = candidate.experienceYears ?? 0;
        const experienceScore = Math.min(experienceYears / 10, 1);
        const skills = candidate.skills ?? [];
        const skillsScore =
          skills.filter((skill) => skill.level === "strong").length / 10;
        const atsScore = candidate.atsScore?.score ?? 0;
        const atsMax = candidate.atsScore?.max ?? 100;
        const weightedScore =
          educationScore * weights.education +
          experienceScore * weights.experience +
          skillsScore * weights.skills +
          atsScore / atsMax;
        return { candidate, weightedScore };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .map(({ candidate }) => candidate);
  }, [candidates, weights]);

  const filteredCandidates = useMemo(() => {
    if (!query.trim()) {
      return rankedCandidates;
    }
    const normalized = query.toLowerCase();
    return rankedCandidates.filter((candidate) => {
      const role = candidate.role ?? "";
      const location = candidate.location ?? "";
      const skills = candidate.skills ?? [];
      return (
        candidate.name.toLowerCase().includes(normalized) ||
        role.toLowerCase().includes(normalized) ||
        location.toLowerCase().includes(normalized) ||
        skills.some((skill) => skill.name.toLowerCase().includes(normalized))
      );
    });
  }, [rankedCandidates, query]);

  return {
    query,
    setQuery,
    weights,
    setWeights,
    rankedCandidates: filteredCandidates,
  };
};
