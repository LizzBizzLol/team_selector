import React, { useState, useEffect } from 'react';
import api from '../api';

const SkillList = () => {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get('/api/skills/')
      .then(response => {
        setSkills(response.data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке навыков:', error);
      });
  }, []);

  return (
    <div>
      <h2>Список навыков</h2>
      <ul>
        {skills.map(skill => (
          <li key={skill.id}>{skill.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default SkillList;
