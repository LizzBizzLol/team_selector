import React, { useState, useEffect } from 'react';
import api from '../api';

export default function SkillList() {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get('skills/')
      .then(({ data }) => setSkills(data))
      .catch(console.error);
  }, []);

  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Навыки</h2>
      <table className="min-w-full text-left border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="px-4 py-2">Навык</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((sk) => (
            <tr key={sk.id} className="border-t">
              <td className="px-4 py-2">{sk.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
