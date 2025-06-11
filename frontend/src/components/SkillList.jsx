import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { unwrap } from '../utils/unwrap';
import useSorter from '../hooks/useSorter';

export default function SkillList() {
  const [skills, setSkills] = useState([]);
  const { sort, sorted, toggle } = useSorter("name");

  useEffect(() => {
    api.get('skills/')
      .then(({ data }) => setSkills(unwrap(data)))
      .catch(console.error);
  }, []);

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Навыки</h2>
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm select-none">
          <tr>
            <th 
              className="px-4 py-2 cursor-pointer"
              onClick={() => toggle("name")}
            >
              Навык {sort.key === "name" && (sort.dir === "asc" ? "▲" : "▼")}
            </th>
            <th 
              className="px-4 py-2 cursor-pointer"
              onClick={() => toggle("students_count")}
            >
              Студентов {sort.key === "students_count" && (sort.dir === "asc" ? "▲" : "▼")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted(skills).map((sk) => (
            <tr key={sk.id} className="border-t">
              <td className="px-4 py-2">
                <Link 
                  to={`/skill/${sk.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {sk.name}
                </Link>
              </td>
              <td className="px-4 py-2">{sk.students_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
