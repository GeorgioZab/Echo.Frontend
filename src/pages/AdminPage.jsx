import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Chip, TextField, Tabs, Tab, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import api from '../api/axios';

const AdminPage = () => {
    // Состояния для алертов (Модерация)
    const [alerts, setAlerts] = useState([]);
    const [visibleAlertsCount, setVisibleAlertsCount] = useState(10);
    
    // Состояния для управления пользователями
    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    
    // Состояние интерфейса
    const [activeTab, setActiveTab] = useState(0);

    // Лайфхак для скролла страницы
    useEffect(() => {
        document.body.style.overflow = 'auto'; 
        return () => { document.body.style.overflow = 'hidden'; };
    }, []);

    // Загрузка алертов
    const fetchAlerts = async () => {
        try {
            const response = await api.get('/Admin/alerts');
            setAlerts(response.data);
        } catch (error) { console.error("Ошибка загрузки алертов", error); }
    };

    useEffect(() => { fetchAlerts(); }, []);

    // Обработка алертов ML
    const handleResolve = async (alertId, deleteMessage) => {
        try {
            await api.post('/Admin/resolve', { alertId, deleteMessage });
            fetchAlerts();
        } catch (error) { console.error(error); }
    };

    // Поиск пользователей
    const handleSearchUsers = async () => {
        if (!searchTerm.trim()) return;
        try {
            const response = await api.get(`/User/search?term=${searchTerm}`);
            setFoundUsers(response.data);
        } catch (error) { console.error("Ошибка поиска", error); }
    };

    // Универсальная смена роли (Повысить/Разжаловать)
    const handleChangeRole = async (userId, currentRole) => {
        const isDemoting = currentRole === 'Admin';
        const newRoleValue = isDemoting ? 0 : 1; // 0 - User, 1 - Admin
        const confirmText = isDemoting 
            ? "Вы уверены, что хотите лишить пользователя прав администратора?" 
            : "Сделать этого пользователя администратором системы?";

        if (!window.confirm(confirmText)) return;

        try {
            await api.post('/Admin/change-role', { userId, newRole: newRoleValue });
            alert("Роль успешно изменена!");
            handleSearchUsers(); // Обновляем список, чтобы увидеть новую роль
        } catch (error) {
            alert("Ошибка: " + (error.response?.data?.error || "Недостаточно прав"));
        }
    };

    return (
        <Box sx={{ p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
            
            {/* ШАПКА ПАНЕЛИ */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">Echo Control Center</Typography>
                    <Typography variant="body2" color="textSecondary">Управление системой и модерация контента</Typography>
                </Box>
                <Button variant="contained" size="large" onClick={() => window.location.href = '/'}>
                    Вернуться к чатам
                </Button>
            </Box>

            {/* ВКЛАДКИ */}
            <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" indicatorColor="primary">
                    <Tab label={`Модерация сообщений (${alerts.length})`} />
                    <Tab label="Управление правами доступа" />
                </Tabs>
            </Paper>

            {/* ВКЛАДКА 1: МОДЕРАЦИЯ */}
            {activeTab === 0 && (
                <Box>
                    <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: '#f0f2f5' }}>
                                <TableRow>
                                    <TableCell><b>Время</b></TableCell>
                                    <TableCell><b>Автор</b></TableCell>
                                    <TableCell><b>Текст сообщения</b></TableCell>
                                    <TableCell><b>Причина</b></TableCell>
                                    <TableCell align="center"><b>Решение</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {alerts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                            <Typography color="textSecondary">Подозрительных сообщений не обнаружено</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    alerts.slice(0, visibleAlertsCount).map((alert) => (
                                        <TableRow key={alert.alertId} hover>
                                            <TableCell>{new Date(alert.sentAt).toLocaleTimeString()}</TableCell>
                                            <TableCell><Chip label={alert.senderName} size="small" variant="outlined" /></TableCell>
                                            <TableCell sx={{ color: '#d32f2f', fontWeight: 'medium' }}>"{alert.content}"</TableCell>
                                            <TableCell>{alert.reason}</TableCell>
                                            <TableCell align="center">
                                                <IconButton color="error" title="Удалить" onClick={() => handleResolve(alert.alertId, true)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                                <IconButton color="success" title="Оставить" onClick={() => handleResolve(alert.alertId, false)}>
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {alerts.length > visibleAlertsCount && (
                        <Box sx={{ textAlign: 'center', mt: 3 }}>
                            <Button 
                                variant="outlined" 
                                startIcon={<KeyboardArrowDownIcon />}
                                onClick={() => setVisibleAlertsCount(prev => prev + 10)}
                            >
                                Показать больше алертов
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* ВКЛАДКА 2: РОЛИ */}
            {activeTab === 1 && (
                <Box>
                    <Paper sx={{ p: 4, borderRadius: 2, elevation: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Поиск и управление пользователями</Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                            <TextField 
                                fullWidth 
                                label="Введите логин пользователя..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyUp={(e) => e.key === 'Enter' && handleSearchUsers()}
                            />
                            <Button variant="contained" px={4} onClick={handleSearchUsers}>Найти</Button>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        {foundUsers.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                                        <TableRow>
                                            <TableCell><b>Пользователь</b></TableCell>
                                            <TableCell><b>Текущая роль</b></TableCell>
                                            <TableCell align="right"><b>Действие</b></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {foundUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{user.username}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={user.role} 
                                                        color={user.role === 'Admin' ? 'warning' : 'default'} 
                                                        size="small" 
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {user.role === 'Admin' ? (
                                                        <Button 
                                                            color="error" 
                                                            variant="outlined" 
                                                            onClick={() => handleChangeRole(user.id, user.role)}
                                                        >
                                                            Разжаловать
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            startIcon={<SecurityIcon />} 
                                                            color="warning" 
                                                            variant="contained" 
                                                            onClick={() => handleChangeRole(user.id, user.role)}
                                                        >
                                                            Сделать Админом
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography align="center" color="textSecondary">Введите имя пользователя для управления его правами</Typography>
                        )}
                    </Paper>
                </Box>
            )}
        </Box>
    );
};

export default AdminPage;