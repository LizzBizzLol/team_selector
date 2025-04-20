import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [skillsMap, setSkillsMap] = useState({});

  useEffect(() => {
    // Загружаем пользователей
    axios.get('http://127.0.0.1:8000/api/users/')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));

    // Загружаем все скиллы и создаём мапу id -> name
    axios.get('http://127.0.0.1:8000/api/skills/')
      .then(res => {
        const map = {};
        res.data.forEach(skill => {
          map[skill.id] = skill.name;
        });
        setSkillsMap(map);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Список пользователей</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name}
            {user.skills?.length > 0 && (
              <ul>
                {user.skills.map(us => (
                  <li key={us.id}>
                    {skillsMap[us.skill]} (уровень {us.level})
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
