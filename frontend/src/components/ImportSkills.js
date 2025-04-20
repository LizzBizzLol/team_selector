import React, { useState } from 'react';
import axios from 'axios';

const ImportSkills = ({ projectId }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('Пожалуйста, выберите JSON-файл.');
      return;
    }

    try {
      // читаем файл как текст
      const text = await file.text();
      const data = JSON.parse(text);

      // отправляем на сервер
      const url = `http://127.0.0.1:8000/api/projects/${projectId}/import_skills/`;
      await axios.post(url, data, {
        headers: { 'Content-Type': 'application/json' }
      });

      setStatus('Импорт успешно завершён 🎉');
    } catch (err) {
      console.error(err);
      setStatus('Ошибка импорта: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h2>Импорт матрицы навыков в JSON-формате</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
        />
        <button type="submit">Импортировать</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default ImportSkills;
