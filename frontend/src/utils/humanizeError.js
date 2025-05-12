// самые частые поля / формулировки
const mapField = {
    title:          "Проект с таким названием уже существует",
    curator:        "Куратор с таким именем/email уже существует",
    min_participants:"Мин. участников",
    max_participants:"Макс. участников",
  };
  
  export default function humanizeError(err) {
    // 1) ответ DRF вида {field: ["msg"] , ...}
    if (err.response?.data && typeof err.response.data === "object") {
      return Object.entries(err.response.data)
        .map(([k,v]) => `${mapField[k] ?? k}: ${Array.isArray(v)?v.join(", "):v}`)
        .join("\n");
    }
  
    // 2) одно строковое .detail
    if (err.response?.data?.detail)
      return err.response.data.detail;
  
    // 3) сеть / прочее
    return err.message ?? "Неизвестная ошибка";
  }
  