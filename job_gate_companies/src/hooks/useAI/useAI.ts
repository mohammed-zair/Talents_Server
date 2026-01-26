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
        const educationScore = candidate.education.toLowerCase().includes("master") ? 0.9 : 0.7;
        const experienceScore = Math.min(candidate.experienceYears / 10, 1);
        const skillsScore =
          candidate.skills.filter((skill) => skill.level === "strong").length / 10;
        const weightedScore =
          educationScore * weights.education +
          experienceScore * weights.experience +
          skillsScore * weights.skills +
          candidate.atsScore.score / candidate.atsScore.max;
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
      return (
        candidate.name.toLowerCase().includes(normalized) ||
        candidate.role.toLowerCase().includes(normalized) ||
        candidate.location.toLowerCase().includes(normalized) ||
        candidate.skills.some((skill) => skill.name.toLowerCase().includes(normalized))
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
