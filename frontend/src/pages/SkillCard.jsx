import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import BackButton from "../components/BackButton";
import api from "../api";

export default function SkillCard() {
  const { id } = useParams();
  const [skill, setSkill] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSkillData = async () => {
      try {
        setLoading(true);
        // Загружаем информацию о навыке
        const { data: skillData } = await api.get(`skills/${id}/`);
        setSkill(skillData);
        
        // Загружаем студентов, владеющих этим навыком через новый endpoint
        const { data: studentsData } = await api.get(`skills/${id}/students/`);
        setStudents(studentsData);
      } catch (error) {
        console.error('Ошибка загрузки данных навыка:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadSkillData();
    }
  }, [id]);

  if (loading) return <p className="text-center mt-8">Загрузка…</p>;
  if (!skill) return <p className="text-center mt-8">Навык не найден</p>;

  return (
    <main className="pb-10">
      <div className="max-w-2xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4">
        <BackButton fallback="/admin?tab=skills" />
        <h1 className="text-2xl font-semibold">{skill.name}</h1>
        
        {skill.graph_representation && (
          <p className="text-gray-500">
            <strong>Графовое представление:</strong> {skill.graph_representation}
          </p>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-medium mb-3">
            Студенты, владеющие навыком ({students.length})
          </h2>
          
          {students.length > 0 ? (
            <div className="space-y-2">
              {students.map(student => (
                <div key={student.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <Link 
                      to={`/student/${student.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {student.name}
                    </Link>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">Уровень:</span>
                    <div className="font-medium">{student.skill_level}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Нет студентов, владеющих этим навыком</p>
          )}
        </div>
      </div>
    </main>
  );
} 