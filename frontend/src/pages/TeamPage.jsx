import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";
import { unwrap } from '../utils/unwrap';
import TeamHeatmap from "../components/TeamHeatmap";
import BackButton from "../components/BackButton";

export default function TeamPage() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]); // ← добавили список команд для номера

  useEffect(() => {
    // Получаем команду
    api.get(`teams/${id}/`)
      .then(({ data }) => {
        setTeam(data);
        // Получаем проект
        return api.get(`projects/${data.project}/`);
      })
      .then(({ data }) => {
        setProject(data);
        // Получаем все команды по этому проекту
        return api.get("teams/", { params: { project: data.id, ordering: "created_at" } });
      })
      .then(({ data }) => {
        setTeams(unwrap(data));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="mt-8 text-center">Загрузка…</p>;
  if (!team) return <p className="mt-8 text-center text-red-500">Команда не найдена</p>;
  // Находим локальный номер этой команды
  const localNum = teams.findIndex(t => t.id === team.id) + 1;

  return (
    <main className="max-w-4xl mx-auto pb-10"> {/* pb-10 = padding-bottom */}
    <div className="max-w-4xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4 bg-white">
    <BackButton fallback="/projects" />
    <button
      className="ml-4 px-3 py-1 border border-red-600 text-red-600 rounded hover:bg-red-50"
      onClick={async () => {
        if (!window.confirm("Удалить эту команду? Это действие необратимо.")) return;
        try {
          await api.delete(`teams/${team.id}/`);
          // После удаления — редирект обратно
          window.location.href = `/project/${project.id}`; // или куда тебе нужно
        } catch (e) {
          alert("Ошибка удаления: " + (e?.response?.data?.detail || e.message));
        }
      }}
    >
      Удалить команду
    </button>
    
      <h1 className="text-2xl font-semibold mb-2">
        Команда №{localNum > 0 ? localNum : team.id}
      </h1>
      {project && (
        <div>
          <span className="text-sm text-gray-400">
            Проект:{" "}
            <Link to={`/project/${project.id}`} className="text-blue-600 underline">
              {project.title}
            </Link>
          </span>
        </div>
      )}

      <h2 className="font-medium mt-4 mb-2">Участники</h2>
      <ul className="list-disc pl-6 space-y-1">
        {team.students.map((s) => (
          <li key={s.id}>
            <Link 
              to={`/student/${s.id}`}
              className="text-blue-600 hover:underline"
            >
              {s.name}
            </Link>
            <span className="text-xs text-gray-400"> ({s.email})</span>
          </li>
        ))}
      </ul>

      <h2 className="font-medium mt-6 mb-2">Тепловая карта соответствия</h2>
      <TeamHeatmap team={team} project={project} />
    </div>
    </main>
  );
}
