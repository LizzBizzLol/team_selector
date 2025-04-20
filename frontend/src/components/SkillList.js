import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SkillList = () => {
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/skills/')
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
