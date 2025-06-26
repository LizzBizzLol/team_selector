// src/components/TeamHeatmap.jsx
import React from "react";
import { Link } from "react-router-dom";

// Функция для получения цвета в градиенте от красного к зелёному.
// value: 0 (несоответствие) => красный
// value: 1 (соответствие) => зелёный
function getHeatmapColor(value) {
  // 0 — красный (0°), 1 — зелёный (120°)
  // Промежуточные значения будут в жёлто-оранжевом диапазоне.
  const h = Math.round(120 * value); // hue: 0 (red) -> 120 (green)
  return `hsl(${h}, 100%, 45%)`;
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
                  уровень: {Number(r.level).toFixed(2)}
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
                  let normalizedScore = 0;
                  let coveragePercent = 0;
                  
                  if (skillInfo) {
                    // Используем значение sim (score) напрямую
                    cellScore = skillInfo.score || 0;
                    count++;
                    totalScore += cellScore;
                    
                    // Нормализуем относительно требуемого уровня
                    // Если требуемый уровень 1, то это 100% покрытие
                    const requiredLevel = r.level || 1;
                    normalizedScore = cellScore / requiredLevel;
                    
                    // Вычисляем процент покрытия
                    coveragePercent = Math.min(normalizedScore * 100, 100);
                    
                    if (skillInfo.matched_skill_name) {
                      displayText = `${coveragePercent.toFixed(0)}%`; // Показываем процент покрытия
                      tooltipText = `${skillInfo.matched_skill_name} (sim = ${cellScore.toFixed(4)}, покрытие: ${coveragePercent.toFixed(1)}%, уровень: ${skillInfo.student_level.toFixed(2)}/${requiredLevel.toFixed(2)})`;
                    } else {
                      displayText = `${coveragePercent.toFixed(0)}%`;
                      tooltipText = `sim = ${cellScore.toFixed(4)}, покрытие: ${coveragePercent.toFixed(1)}%, уровень: ${skillInfo.student_level.toFixed(2)}/${requiredLevel.toFixed(2)}`;
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
                              background: getHeatmapColor(Math.min(normalizedScore, 1)),
                              color: Math.min(normalizedScore, 1) > 0.6 ? "#fff" : "#000",
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
                    ? `${((totalScore / count) * 100).toFixed(0)}%`
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