import useSorter from "../hooks/useSorter";
import { Link } from "react-router-dom";

export default function RequirementsTable({ reqs }) {
  const { sort, sorted, toggle } = useSorter("skill_name");

  return (
    <table className="min-w-full text-left border rounded">
      <thead className="bg-gray-100 text-sm select-none">
        <tr>
          <th
            onClick={() => toggle("skill_name")}
            className="px-3 py-2 cursor-pointer"
          >
            Навык&nbsp;
            {sort.key === "skill_name" && (sort.dir === "asc" ? "▲" : "▼")}
          </th>
          <th
            onClick={() => toggle("level")}
            className="px-3 py-2 cursor-pointer w-32"
          >
            Уровень&nbsp;
            {sort.key === "level" && (sort.dir === "asc" ? "▲" : "▼")}
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted(reqs).map((r) => (
          <tr key={r.skill} className="border-t">
            <td className="px-3 py-1">
              {r.skill?.id ? (
                <Link 
                  to={`/skill/${r.skill.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {r.skill.name}
                </Link>
              ) : (
                r.skill?.name ?? r.skill_name ?? "—"
              )}
            </td>
            <td className="px-3 py-1">{r.level}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
