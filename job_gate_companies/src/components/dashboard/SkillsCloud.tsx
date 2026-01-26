import React from "react";
import type { SkillMatch } from "../../types";

interface SkillsCloudProps {
  skills: SkillMatch[];
}

const SkillsCloud: React.FC<SkillsCloudProps> = ({ skills }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill.name}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            skill.level === "strong"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {skill.name}
        </span>
      ))}
    </div>
  );
};

export default SkillsCloud;
