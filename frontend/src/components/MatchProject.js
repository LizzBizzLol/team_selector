import React, { useState } from 'react';
import axios from 'axios';

const MatchProject = ({ projectId }) => {
  const [team, setTeam] = useState(null);
  const [error, setError] = useState('');

  const handleMatch = async () => {
    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/projects/${projectId}/match/`,
        {},
        { headers: { 'Content-Type': 'application/json' } }
      );
      setTeam(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data || err.message);
      setTeam(null);
    }
  };

  return (
    <div>
      <h2>Формирование команды для проекта #{projectId}</h2>
      <button onClick={handleMatch}>Запустить подбор</button>

      {error && <p style={{ color: 'red' }}>Ошибка: {JSON.stringify(error)}</p>}

      {team ? (
        <div>
          <h3>Команда #{team.id} сформирована:</h3>
          {team.users && team.users.length > 0 ? (
            <ul>
              {team.users.map(uid => (
                <li key={uid}>User ID: {uid}</li>
              ))}
            </ul>
          ) : (
            <p>Ни один пользователь не подошёл.</p>
          )}
        </div>
      ) : (
        <p>Команда еще не сформирована.</p>
      )}
    </div>
  );
};

export default MatchProject;
