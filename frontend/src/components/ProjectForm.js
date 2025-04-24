// TODO: удалить компонент, когда все проекты создаём через CreateProjectPage

import React, { useState } from 'react';
import api from '../api';

const ProjectForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

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
      .catch(error => { // error.response.data будет объектом вида { title: ["…уже существует"], ... }
        if (error.response?.data) {setErrors(error.response.data);} else {console.error(error);}
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
          {errors.title && (
           <p className="text-red-500 text-sm">{errors.title[0]}</p>
         )}
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
