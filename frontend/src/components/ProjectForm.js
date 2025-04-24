// TODO: удалить компонент, когда все проекты создаём через CreateProjectPage

import React, { useState } from 'react';
import api from '../api';

const ProjectForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const newProject = {
      title: title,
      description: description
    };

    api.post('/api/projects/', newProject)
      .then(response => {
        console.log('Проект добавлен:', response.data);
        setTitle('');
        setDescription('');
      })
      .catch(error => {
        console.error('Ошибка при добавлении проекта:', error);
      });
  };

  return (
    <div>
      <h2>Добавить новый проект</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Название проекта:
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
        </label>
        <br />
        <label>
          Описание:
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </label>
        <br />
        <button type="submit">Добавить проект</button>
      </form>
    </div>
  );
};

export default ProjectForm;
