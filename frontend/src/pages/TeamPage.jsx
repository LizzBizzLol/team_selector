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
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="mt-8 text-center">Загрузка…</p>;
  if (!team) return <p className="mt-8 text-center text-red-500">Команда не найдена</p>;

  return (
    <main className="max-w-4xl mx-auto pb-10"> {/* pb-10 = padding-bottom */}
    <div className="max-w-4xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4 bg-white">
      <BackButton fallback="/projects" />
      <h1 className="text-2xl font-semibold mb-2">
        Команда #{team.id}
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
            {s.name} <span className="text-xs text-gray-400">({s.email})</span>
          </li>
        ))}
      </ul>

      <h2 className="font-medium mt-6 mb-2">Тепловая карта соответствия</h2>
      <TeamHeatmap team={team} project={project} />
    </div>
    </main>
  );
}
