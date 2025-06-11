import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { unwrap } from '../utils/unwrap';
import BackButton from '../components/BackButton';
import useSorter from '../hooks/useSorter';

export default function SkillCard() {
  const { id } = useParams();
  const [skill, setSkill] = useState(null);
  const [students, setStudents] = useState([]);
  const { sort, sorted, toggle } = useSorter("name");

  useEffect(() => {
    // Загружаем информацию о навыке
    api.get(`skills/${id}/`)
      .then(({ data }) => setSkill(unwrap(data)))
      .catch(console.error);

    // Загружаем список студентов с этим навыком
    api.get('students/')
      .then(({ data }) => {
        const studentsWithSkill = unwrap(data).filter(student => 
          student.skills.some(s => s.id === parseInt(id))
        );
        setStudents(studentsWithSkill);
      })
      .catch(console.error);
  }, [id]);

  if (!skill) return <p className="text-center mt-8">Загрузка…</p>;

  return (
    <main className="max-w-4xl mx-auto pb-10">
      <div className="max-w-4xl mx-auto mt-10 p-6 border rounded-xl shadow space-y-4 bg-white">
        <BackButton fallback="/admin?tab=skills" />
        
        <h1 className="text-2xl font-semibold">{skill.name}</h1>
        <p className="text-sm text-gray-500">
          Количество студентов: {skill.students_count}
        </p>

        <h2 className="font-medium mt-6 mb-2">Студенты с этим навыком</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded-xl overflow-hidden">
            <thead className="bg-gray-100 text-sm select-none">
              <tr>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => toggle("name")}
                >
                  Студент {sort.key === "name" && (sort.dir === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => toggle("email")}
                >
                  Email {sort.key === "email" && (sort.dir === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => toggle("level")}
                >
                  Уровень {sort.key === "level" && (sort.dir === "asc" ? "▲" : "▼")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted(students).map((student) => {
                const studentSkill = student.skills.find(s => s.id === parseInt(id));
                return (
                  <tr key={student.id} className="border-t">
                    <td className="px-4 py-2">{student.name}</td>
                    <td className="px-4 py-2">{student.email}</td>
                    <td className="px-4 py-2">{studentSkill?.level || 'Не указан'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
} 