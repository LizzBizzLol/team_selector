import { useParams, Link } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useEffect, useState } from "react";
import api from "../api";

// Сортировка: по какому полю и по какому направлению
function useSorter(defaultKey = "title") {
  const [sort, setSort] = useState({ key: defaultKey, dir: "asc" });
  const toggle = (key) => setSort(s => ({
    key,
    dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : "asc"
  }));
  const sorted = (arr) => {
    const m = sort.dir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      const v1 = a[sort.key], v2 = b[sort.key];
      if (typeof v1 === "number" && typeof v2 === "number") return (v1 - v2) * m;
      if (typeof v1 === "string" && typeof v2 === "string") return v1.localeCompare(v2, "ru") * m;
      return 0;
    });
  };
  return { sort, toggle, sorted };
}

export default function UserCard() {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  // Сортировка проектов
  const { sort, toggle, sorted } = useSorter("title");

  useEffect(() => {
    api.get(`curators/${id}/`).then(({ data }) => setUser(data));
  }, [id]);

  if (!user) return <p className="mt-8 text-center">Загрузка…</p>;

  // Если проектов нет или не массив — не показываем таблицу
  const projects = Array.isArray(user.projects) ? sorted(user.projects) : [];

  return (
    <main className="pb-10">
    <div className="max-w-3xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
      <BackButton fallback="/admin?tab=curators" />
      
      <h1 className="text-2xl font-semibold">{user.name}</h1>
      <span className="text-xs uppercase tracking-wide text-gray-400">Куратор</span>
      <p className="text-gray-500">{user.email}</p>
      
      <h2 className="font-medium mt-4 mb-2">
        Проекты {projects.length ? `(${projects.length})` : ""}
      </h2>
      {projects.length ? (
        <table className="min-w-full text-left border rounded text-sm mb-4">
          <thead className="bg-gray-100 select-none">
            <tr>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggle("title")}>
                Название {sort.key==="title" ? (sort.dir==="asc"?"▲":"▼") : ""}
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggle("min_participants")}>
                Мин. участников {sort.key==="min_participants" ? (sort.dir==="asc"?"▲":"▼") : ""}
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={()=>toggle("max_participants")}>
                Макс. участников {sort.key==="max_participants" ? (sort.dir==="asc"?"▲":"▼") : ""}
              </th>
              <th className="px-3 py-2">Требования</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(proj => (
              <tr key={proj.id}>
                <td className="px-3 py-2">
                  <Link to={`/project/${proj.id}`} className="text-blue-600 hover:underline">{proj.title}</Link>
                </td>
                <td className="px-3 py-2">{proj.min_participants}</td>
                <td className="px-3 py-2">{proj.max_participants}</td>
                <td className="px-3 py-2">
                  {Array.isArray(proj.requirements)
                    ? proj.requirements.map((req, i) => {
                      const skillId = req.skill_id ?? req.skill?.id;
                      const skillName = req.skill_name ?? req.skill?.name ?? "???";
                      return (
                        <span key={skillId || skillName}>
                          {skillId ? (
                            <Link to={`/skill/${skillId}`} className="text-blue-600 hover:underline">
                              {skillName}
                            </Link>
                          ) : (
                            skillName
                          )}
                        {" "}({req.level}){i < proj.requirements.length - 1 ? ", " : ""}
                        </span>
                      );
                    })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-gray-500">Нет проектов</p>
      )}
    </div>
    </main>
  );
}
