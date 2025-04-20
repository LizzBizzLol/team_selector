import React, { useState } from 'react';
import axios from 'axios';

const UserForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const newUser = {
      name: name,
      email: email
    };

    axios.post('http://127.0.0.1:8000/api/users/', newUser)
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
        </label>
        <br />
        <button type="submit">Добавить пользователя</button>
      </form>
    </div>
  );
};

export default UserForm;
