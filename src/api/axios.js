import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5005/api', // ПРОВЕРЬ СВОЙ ПОРТ ИЗ .NET!
});

// Автоматически добавляем токен в заголовки, если он есть в памяти
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;