import React, { useState } from 'react';
import api from '../api';

const UserForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    const newUser = {
      name: name,
      email: email
    };

    api.post('/api/users/', newUser)
      .then(response => {
        console.log('Пользователь добавлен:', response.data);
        setName('');
        setEmail('');
      })
      .catch(error => {
        console.error('Ошибка при добавлении пользователя:', error);
      });
  };

  return (
    <div>
      <h2>Добавить нового пользователя</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Имя:
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name[0]}</p>
          )}
        </label>
        <br />
        <label>
          Email:
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email[0]}</p>
          )}
        </label>
        <br />  
        <label className="block mt-2">
          Роль:
          <select value={role} onChange={e=>setRole(e.target.value)} className="ml-2">
          <option value="student">Студент</option>
          <option value="curator">Куратор</option>
          </select>
        </label>
        <button type="submit">Добавить пользователя</button>
      </form>
    </div>
  );
};

export default UserForm;
