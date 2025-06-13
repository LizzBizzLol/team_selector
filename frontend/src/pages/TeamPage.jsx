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
            <span className="text-xs text-gray-400">({s.email})</span>
          </li>
        ))}
      </ul>

      <h2 className="font-medium mt-6 mb-2">Соответствие требованиям</h2>
      <TeamHeatmap team={team} project={project} />

      {/* Детальная информация о сопоставлении навыков */}
      {team.students.some(s => s.skills && s.skills.length > 0) && (
        <>
          <h2 className="font-medium mt-6 mb-2">Детали сопоставления навыков</h2>
          <div className="space-y-4">
            {team.students.map((student) => (
              <div key={student.id} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">
                  <Link 
                    to={`/student/${student.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {student.name}
                  </Link>
                </h3>
                {student.skills && student.skills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {student.skills.map((skill, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">
                            <Link 
                              to={`/skill/${skill.skill_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {skill.skill_name}
                            </Link>
                          </span>
                          {skill.matched_skill_name && skill.matched_skill_name !== skill.skill_name && (
                            <div className="text-xs text-gray-600">
                              → {skill.matched_skill_name}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {skill.student_level} / {skill.required_level}
                          </div>
                          <div className="font-medium text-green-600">
                            {Math.round(skill.score * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Нет информации о навыках</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </main>
  );
}
