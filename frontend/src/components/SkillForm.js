import React, { useState } from 'react';
import api from '../api';

const SkillForm = () => {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    api.post('/api/skills/', { name })
      .then(_ => setName(''))
      .catch(err => {
        if (err.response?.data) setErrors(err.response.data);
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Навык:</label><br/>
        <input value={name} onChange={e=>setName(e.target.value)} required />
        {errors.name && <p className="text-red-500 text-sm">{errors.name[0]}</p>}
      </div>
      <button type="submit">Добавить навык</button>
    </form>
  );
};

export default SkillForm;