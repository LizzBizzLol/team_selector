// самые частые поля / формулировки
const mapField = {
    title:          "Проект с таким названием уже существует",
    curator:        "Куратор с таким именем/email уже существует",
    min_participants:"Мин. участников",
    max_participants:"Макс. участников",
    skill:          "Навык",
    level:          "Уровень",
    name:           "Имя",
    email:          "Email",
    requirements:   "Требования",
    students:       "Студенты",
    team:           "Команда",
    project:        "Проект"
};

const mapError = {
    "not_found": "Объект не найден",
    "invalid_data": "Неверные данные",
    "permission_denied": "Нет прав для выполнения операции",
    "validation_error": "Ошибка валидации",
    "server_error": "Ошибка сервера"
};

export default function humanizeError(err) {
    // 1) ответ DRF вида {field: ["msg"] , ...}
    if (err.response?.data && typeof err.response.data === "object") {
        const messages = Object.entries(err.response.data)
            .map(([k, v]) => {
                const fieldName = mapField[k] ?? k;
                const message = Array.isArray(v) ? v.join(", ") : v;
                return `${fieldName}: ${message}`;
            });
        
        if (messages.length > 0) {
            return messages.join("\n");
        }
    }

    // 2) одно строковое .detail
    if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        // Проверяем, есть ли предопределенное сообщение для этой ошибки
        for (const [key, message] of Object.entries(mapError)) {
            if (detail.toLowerCase().includes(key)) {
                return message;
            }
        }
        return detail;
    }

    // 3) сеть / прочее
    if (err.message) {
        if (err.message.includes("Network Error")) {
            return "Ошибка сети. Проверьте подключение к интернету.";
        }
        return err.message;
    }

    return "Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.";
}
  