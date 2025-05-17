// src/components/TeamHeatmap.jsx
import React from "react";

// team — объект с students
// project — объект с skill_links [{ skill_name, level }]
export default function TeamHeatmap({ team, project }) {
  if (!team || !project) return null;
  const students = team.students || [];
  const reqs = project.skill_links || [];

  // --- DEBUG: что реально приходит? ---
  console.log("students", students);
  console.log("reqs", reqs);

  // Получить уровень навыка у студента
  function getSkillLevel(student, skillName) {
    if (!Array.isArray(student.skills)) return null;
    const found = student.skills.find(s => 
      s.skill_name === skillName ||
      s.skill?.name === skillName
    );
    return found ? found.level : null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-xl overflow-hidden text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2">Студент</th>
            {reqs.map((r, i) => (
              <th key={r.skill?.id || r.skill_name || i} className="px-3 py-2">
                {r.skill_name || r.skill?.name}
                <br />
                <span className="text-xs text-gray-500">уровень: {r.level}</span>
              </th>
            ))}
            <th className="px-3 py-2">Итог</th>
          </tr>
        </thead>
        <tbody>
          {students.map((stu) => {
            let totalScore = 0, count = 0;
            return (
              <tr key={stu.id}>
                <td className="px-3 py-2">{stu.name}</td>
                {reqs.map((r, i) => {
                  const skillKey = r.skill?.id || r.skill_name || i;
                  const lvl = getSkillLevel(stu, r.skill_name || r.skill?.name);
                  let cellScore = 0;
                  let bg = "bg-gray-100 text-gray-400"; // нет навыка
                  if (typeof lvl === "number") {
                    cellScore = r.level ? Math.min(lvl / r.level, 1) : 0;
                    count++;
                    totalScore += cellScore;
                    if (cellScore >= 1)        bg = "bg-green-200";
                    else if (cellScore >= 0.6) bg = "bg-yellow-100";
                    else if (lvl > 0)          bg = "bg-red-100";
                  }
                  return (
                    <td key={skillKey} className={`px-3 py-2 text-center ${bg}`}>
                      {typeof lvl === "number" ? lvl : "—"}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-semibold">
                  {count > 0 ? `${Math.round((totalScore / count) * 100)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}