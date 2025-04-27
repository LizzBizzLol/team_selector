import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function StudentList() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api.get('students/')
       .then(({ data }) => setStudents(data))
       .catch(console.error);
  }, []);

  if (!students.length) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <p className="mb-4 text-gray-600">Пока нет ни одного студента.</p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Вернуться
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Студенты</h2>
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="px-4 py-2">Имя</th>
            <th className="px-4 py-2">Email</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">
                <Link to={`/student/${s.id}`} className="text-blue-600 hover:underline">
                  {s.name}
                </Link>
              </td>
              <td className="px-4 py-2">{s.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
