import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Auth/register', { username, password });
            alert('Регистрация успешна! Теперь войдите.');
            navigate('/login');
        } catch (error) {
            alert('Ошибка регистрации: ' + (error.response?.data?.error || 'Пользователь уже существует'));
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">Регистрация в Echo</Typography>
                <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
                    <TextField 
                        margin="normal" required fullWidth label="Придумайте логин" 
                        value={username} onChange={(e) => setUsername(e.target.value)} 
                    />
                    <TextField 
                        margin="normal" required fullWidth label="Пароль" type="password" 
                        value={password} onChange={(e) => setPassword(e.target.value)} 
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Зарегистрироваться
                    </Button>
                    <Link href="/login" variant="body2">Уже есть аккаунт? Войти</Link>
                </Box>
            </Box>
        </Container>
    );
};

export default RegisterPage;