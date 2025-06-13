import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUnsavedPrompt } from '../hooks/useUnsavedPrompt';
import UserCombobox from './UserCombobox';

const CreateProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    curator: null,
    max_participants: 1, // ✨ стартовое значение 1
    requirements: [],
  });
  const [skills, setSkills] = useState([]);
  const [curators, setCurators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [totalStudents, setTotalStudents] = useState(0); // ✨ для хранения общего количества студентов

  // ✨ Хук для предупреждения о несохраненных изменениях
  useUnsavedPrompt(
    formData.name || formData.description || formData.curator || formData.requirements.length > 0
  );

  useEffect(() => {
    fetchSkills();
    fetchCurators();
    fetchTotalStudents(); // ✨ получаем количество студентов
    // ✨ Принудительно устанавливаем стартовое значение
    setFormData(prev => ({ ...prev, max_participants: 1 }));
  }, []);

  const fetchTotalStudents = async () => {
    try {
      const response = await fetch('/api/students/count/');
      if (response.ok) {
        const data = await response.json();
        console.log('Получено количество студентов:', data.count); // ✨ отладка
        setTotalStudents(data.count);
      }
    } catch (error) {
      console.error('Ошибка при получении количества студентов:', error);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills/');
      if (response.ok) {
        const data = await response.json();
        setSkills(data.results || data);
      }
    } catch (error) {
      console.error('Ошибка при получении навыков:', error);
    }
  };

  const fetchCurators = async () => {
    try {
      const response = await fetch('/api/users/');
      if (response.ok) {
        const data = await response.json();
        setCurators(data.results || data);
      }
    } catch (error) {
      console.error('Ошибка при получении кураторов:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRequirementChange = (index, field, value) => {
    const newRequirements = [...formData.requirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setFormData(prev => ({ ...prev, requirements: newRequirements }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, { skill: '', level: 1 }]
    }));
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          curator: formData.curator?.id || null,
        }),
      });

      if (response.ok) {
        setSuccess('Проект успешно создан!');
        setTimeout(() => {
          navigate('/projects');
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Ошибка при создании проекта');
      }
    } catch (error) {
      setError('Ошибка сети при создании проекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Создание нового проекта
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название проекта"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание проекта"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <UserCombobox
                label="Куратор проекта"
                users={curators}
                value={formData.curator}
                onChange={(curator) => handleInputChange('curator', curator)}
                onDirty={() => {}} // ✨ исправлено: добавлен проп onDirty
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Максимальное количество участников"
                value={formData.max_participants}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= totalStudents) {
                    handleInputChange('max_participants', value);
                  }
                }}
                inputProps={{
                  min: 1,
                  max: totalStudents,
                }}
                helperText={`Доступно студентов: ${totalStudents}`}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Требования к навыкам</Typography>
              </Divider>
              
              {formData.requirements.map((req, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                  <FormControl sx={{ flexGrow: 1 }}>
                    <InputLabel>Навык</InputLabel>
                    <Select
                      value={req.skill}
                      onChange={(e) => handleRequirementChange(index, 'skill', e.target.value)}
                      required
                    >
                      {skills.map((skill) => (
                        <MenuItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Уровень</InputLabel>
                    <Select
                      value={req.level}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 5) {
                          handleRequirementChange(index, 'level', value);
                        }
                      }}
                      required
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <MenuItem key={level} value={level}>
                          {level}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    onClick={() => removeRequirement(index)}
                    color="error"
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={addRequirement}
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Добавить требование
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/projects')}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Создание...' : 'Создать проект'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateProject; 