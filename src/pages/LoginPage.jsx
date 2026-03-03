import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Добавили RouterLink
import api from '../api/axios';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/Auth/login', { username, password });
            const token = response.data.token;
            
            // Сохраняем токен
            localStorage.setItem('token', token);
            // Сохраняем имя пользователя (нужно для логики "Мои сообщения" в ChatPage)
            localStorage.setItem('username', username);
            
            navigate('/'); 
        } catch (error) {
            alert('Ошибка входа: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">Вход в Echo</Typography>
                <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
                    <TextField 
                        margin="normal" required fullWidth label="Логин" 
                        value={username} onChange={(e) => setUsername(e.target.value)} 
                    />
                    <TextField 
                        margin="normal" required fullWidth label="Пароль" type="password" 
                        value={password} onChange={(e) => setPassword(e.target.value)} 
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Войти
                    </Button>
                    
                    {/* Ссылка на регистрацию */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Link component={RouterLink} to="/register" variant="body2">
                            Нет аккаунта? Зарегистрироваться
                        </Link>
                    </Box>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginPage;