import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/projects/')
      .then(response => {
        setProjects(response.data);
      })
      .catch(error => {
        console.error('Ошибка при загрузке проектов:', error);
      });
  }, []);

  return (
    <div>
      <h2>Список проектов</h2>
      <ul>
        {projects.map(project => (
          <li key={project.id}>{project.title} - {project.description}</li>
        ))}
      </ul>
    </div>
  );
}

export default ProjectList;
