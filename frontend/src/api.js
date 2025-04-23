import axios from "axios";

const api = axios.create({
  baseURL: "/api/",   // <== прокси CRA отдаст на 127.0.0.1:8000
});

export default api;