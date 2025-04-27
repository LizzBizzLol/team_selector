import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function CuratorList() {
    const [curators, setCurators] = useState([]);

  useEffect(() => {
    api.get('curators/')
      .then(({ data }) => setCurators(data))
      .catch(console.error);
  }, []);

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Кураторы</h2>
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="px-4 py-2">Имя</th>
            <th className="px-4 py-2">Email</th>
          </tr>
        </thead>
        <tbody>
          {curators.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2">
                <Link to={`/user/${c.id}`} className="text-blue-600 hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-2">{c.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
