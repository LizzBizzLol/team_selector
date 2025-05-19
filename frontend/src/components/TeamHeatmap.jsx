// src/components/TeamHeatmap.jsx
import React from "react";

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

  // Получить уровень навыка у студента
  function getSkillLevel(student, skillName) {
    if (!Array.isArray(student.skills)) return null;
    const found = student.skills.find(
      s => s.skill_name === skillName || s.skill?.name === skillName
    );
    return found ? found.level : null;
  }

  return (
    <div className="overflow-x-auto mb-4"> {/* mb-4 — для пространства снизу */}
      <table className="min-w-full border rounded-xl overflow-hidden text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2">Студент</th>
            {reqs.map((r, i) => (
              <th key={r.skill?.id || r.skill_name || i} className="px-3 py-2">
                {r.skill_name || r.skill?.name}
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
                <td className="px-3 py-2">{stu.name}</td>
                {reqs.map((r, i) => {
                  const skillKey = r.skill?.id || r.skill_name || i;
                  const lvl = getSkillLevel(stu, r.skill_name || r.skill?.name);
                  let cellScore = 0;
                  if (typeof lvl === "number") {
                    cellScore = r.level ? Math.min(lvl / r.level, 1) : 0;
                    count++;
                    totalScore += cellScore;
                  }
                  return (
                    <td
                      key={skillKey}
                      className="px-3 py-2 text-center"
                      style={
                        typeof lvl === "number"
                          ? {
                              background: getHeatmapColor(cellScore),
                              color: cellScore > 0.65 ? "#fff" : "#333",
                              transition: "background 0.3s",
                            }
                          : { background: "#f3f4f6", color: "#bbb" }
                      }
                    >
                      {typeof lvl === "number" /*Проценты, снизу просто 0-1*/
                        ? (r.level ? Math.round(Math.min(lvl / r.level, 1) * 100) + "%" : "—")
                        : "—"}
                      {/* {typeof lvl === "number"
                        ? (r.level ? Math.min(lvl / r.level, 1).toFixed(2) : "—")
                        : "—"} */}
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