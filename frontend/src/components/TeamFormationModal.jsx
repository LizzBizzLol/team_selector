import { useState, useEffect } from 'react';
import { Dialog } from "@headlessui/react";
import api from '../api';

export default function TeamFormationModal({ open, onClose, projectId }) {
  const [step, setStep] = useState('select'); // 'select' | 'upload' | 'result'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [team, setTeam] = useState(null);
  const [error, setError] = useState(null);
  const [skillsList, setSkillsList] = useState([]);

  useEffect(() => {
    if (!open) return;
    api.get('skills/').then(({data}) => {
      setSkillsList(data.results || data || []);
    });
  }, [open]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Пожалуйста, выберите JSON файл');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const { data } = await api.post(
        `projects/${projectId}/match_with_file/`,
        json,
        { headers: { 'Content-Type': 'application/json' } }
      );

      setTeam(data);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.detail || 'Произошла ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const handleMatchFromDB = async () => {
    try {
      setUploading(true);
      setError(null);
      
      const response = await api.post(`projects/${projectId}/match/`);
      const data = await response.data;
      
      setTeam(data);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.detail || 'Произошла ошибка при формировании команды');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    if (!team) return;

    const blob = new Blob([JSON.stringify(team, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_${projectId}_${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setStep('select');
    setFile(null);
    setTeam(null);
    setError(null);
    onClose();
  };

  // Получить название навыка по id или по name
  const getSkillName = (skill) => {
    if (skill.skill_id && skillsList.length) {
      const found = skillsList.find(s => s.id === skill.skill_id);
      return found ? found.name : skill.name;
    }
    return skill.name;
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {step === 'select' && 'Выберите способ формирования команды'}
              {step === 'upload' && 'Загрузите файл со студентами'}
              {step === 'result' && 'Результаты формирования команды'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('upload')}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-gray-600">Загрузить файл со студентами</span>
                </div>
              </button>
              <button
                onClick={handleMatchFromDB}
                disabled={uploading}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-gray-600">
                    {uploading ? 'Формирование команды...' : 'Сформировать из базы данных'}
                  </span>
                </div>
              </button>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                    </p>
                    <p className="text-xs text-gray-500">JSON файл со студентами</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}
              {file && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {uploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'result' && team && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Сформированная команда</h3>
                <div className="space-y-4">
                  {team.students.map((student, index) => {
                    // итоговый процент — среднее по matched_skills (ограничить 100%)
                    const skillPercents = (student.matched_skills || []).map(skill => Math.min(1, skill.score) * 100);
                    const avgPercent = skillPercents.length ? Math.min(100, skillPercents.reduce((a, b) => a + b, 0) / skillPercents.length) : 0;
                    return (
                      <div key={index} className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{student.name}</h4>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                          <div className="text-right">
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              title={student.matched_skills?.map(s => 
                                `${s.skill_name}: ${s.student_level}/${s.required_level}`
                              ).join('\n')}
                            >
                              {avgPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {student.matched_skills && student.matched_skills.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Совпадающие навыки:</h5>
                            <div className="flex flex-wrap gap-2">
                              {student.matched_skills.map((skill, skillIndex) => (
                                <div
                                  key={skillIndex}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer relative group"
                                  title={getSkillName(skill)}
                                >
                                  {(Math.min(1, skill.score) * 100).toFixed(1)}%
                                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs text-white bg-gray-900 rounded z-10 whitespace-nowrap">
                                    {getSkillName(skill)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Скачать результаты
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 