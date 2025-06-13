// src/components/TeamHeatmap.jsx
import React from "react";
import { Link } from "react-router-dom";

// Функция: value от 0 до 1 — цвет от красного (0) до зелёного (1)
function getHeatmapColor(value) {
  // 0 — красный (0°), 1 — зелёный (120°)
  // Можно сделать градиент и от красного через жёлтый к зелёному (0 → 60 → 120)
  // но по умолчанию вот так:
  const h = Math.round(120 * value); // hue: 0 (red) -> 120 (green)
  return `hsl(${h}, 70%, 50%)`;
}

// team — объект с students
// project — объект с skill_links [{ skill_name, level }]
export default function TeamHeatmap({ team, project }) {
  if (!team || !project) return null;
  const students = team.students || [];
  const reqs = project.skill_links || [];

  // Получить информацию о навыке студента
  function getSkillInfo(student, skillName) {
    if (!Array.isArray(student.skills)) return null;
    const found = student.skills.find(
      s => s.skill_name === skillName || s.skill?.name === skillName
    );
    return found;
  }

  return (
    <div className="overflow-x-auto mb-4"> {/* mb-4 — для пространства снизу */}
      <table className="min-w-full border rounded-xl overflow-hidden text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2">Студент</th>
            {reqs.map((r, i) => (
              <th key={r.skill?.id || r.skill_name || i} className="px-3 py-2">
                {r.skill?.id ? (
                  <Link 
                    to={`/skill/${r.skill.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {r.skill_name || r.skill?.name}
                  </Link>
                ) : (
                  r.skill_name || r.skill?.name
                )}
                <br />
                <span className="text-xs text-gray-500">
                  уровень: {r.level}
                </span>
              </th>
            ))}
            <th className="px-3 py-2">Итог</th>
          </tr>
        </thead>
        <tbody>
          {students.map(stu => {
            let totalScore = 0,
              count = 0;
            return (
              <tr key={stu.id}>
                <td className="px-3 py-2">
                  <Link 
                    to={`/student/${stu.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {stu.name}
                  </Link>
                </td>
                {reqs.map((r, i) => {
                  const skillKey = r.skill?.id || r.skill_name || i;
                  const skillInfo = getSkillInfo(stu, r.skill_name || r.skill?.name);
                  let cellScore = 0;
                  let displayText = "—";
                  let tooltipText = "";
                  
                  if (skillInfo) {
                    cellScore = skillInfo.score || 0;
                    count++;
                    totalScore += cellScore;
                    
                    if (skillInfo.matched_skill_name) {
                      displayText = `${Math.round(cellScore * 100)}%`;
                      tooltipText = `${skillInfo.matched_skill_name} (${skillInfo.student_level}/${skillInfo.required_level})`;
                    } else {
                      displayText = `${Math.round(cellScore * 100)}%`;
                      tooltipText = `Уровень: ${skillInfo.student_level}/${skillInfo.required_level}`;
                    }
                  }
                  
                  return (
                    <td
                      key={skillKey}
                      className="px-3 py-2 text-center"
                      title={tooltipText}
                      style={
                        typeof cellScore === "number" && cellScore > 0
                          ? {
                              background: getHeatmapColor(cellScore),
                              color: cellScore > 0.65 ? "#fff" : "#333",
                              transition: "background 0.3s",
                            }
                          : { background: "#f3f4f6", color: "#bbb" }
                      }
                    >
                      {displayText}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-semibold">
                  {count > 0
                    ? `${Math.round((totalScore / count) * 100)}%`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}