import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, List, ListItem, ListItemText, Divider, TextField, Button, Typography, ListItemAvatar, Avatar, IconButton } from '@mui/material';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddIcon from '@mui/icons-material/Add';
import api from '../api/axios';

const ChatPage = () => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [connection, setConnection] = useState(null);

    // Состояния для поиска и создания
    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    const [newChatTitle, setNewChatTitle] = useState('');
    
    const selectedChatRef = useRef(null);
    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

    // 1. SignalR инициализация
    useEffect(() => {
        const newConnection = new HubConnectionBuilder()
            .withUrl("http://localhost:5005/chatHub", {
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information)
            .build();

        setConnection(newConnection);
        return () => { if (newConnection) newConnection.stop(); };
    }, []);

    // 2. Слушатель сообщений
    useEffect(() => {
        if (connection) {
            connection.start()
                .then(() => {
                    connection.on("ReceiveMessage", (message) => {
                        if (selectedChatRef.current && message.chatId === selectedChatRef.current.id) {
                            setMessages(prev => [...prev, message]);
                        }
                    });
                })
                .catch(e => console.error('SignalR Connection Error: ', e));
        }
    }, [connection]);

    // 3. Вход в комнату чата
    useEffect(() => {
        if (connection && connection.state === "Connected" && selectedChat) {
            connection.invoke("JoinChat", selectedChat.id).catch(console.error);
        }
    }, [selectedChat, connection]);

    // 4. Загрузка данных
    const fetchChats = async () => {
        const response = await api.get('/Chat');
        setChats(response.data);
    };

    useEffect(() => { fetchChats(); }, []);

    useEffect(() => {
        if (selectedChat) {
            api.get(`/Message/${selectedChat.id}`).then(res => setMessages(res.data));
        }
    }, [selectedChat]);

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    const handleCreateChat = async () => {
        if (!newChatTitle.trim()) return;
        await api.post('/Chat', { title: newChatTitle, isGroup: true });
        setNewChatTitle('');
        fetchChats(); // Обновляем список
    };

    const handleSearchUsers = async () => {
        if (!searchTerm.trim()) {
            setFoundUsers([]);
            return;
        }
        const response = await api.get(`/User/search?term=${searchTerm}`);
        setFoundUsers(response.data);
    };

    const handleAddMember = async (userId) => {
        if (!selectedChat) {
            alert("Сначала выберите чат!");
            return;
        }
        await api.post('/Chat/add-member', { chatId: selectedChat.id, userId });
        alert("Пользователь добавлен!");
        setFoundUsers([]);
        setSearchTerm('');
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;
        await api.post('/Message', { chatId: selectedChat.id, content: newMessage });
        setNewMessage('');
    };

    return (
        <Box sx={{ flexGrow: 1, height: '100vh', p: 2, bgcolor: '#f0f2f5' }}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
                
                {/* ЛЕВАЯ ПАНЕЛЬ: Управление и список чатов */}
                <Grid item xs={4} sx={{ height: '100%' }}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                        
                        {/* Создание чата */}
                        <Box sx={{ p: 2, bgcolor: '#fff' }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField 
                                    fullWidth size="small" placeholder="Название нового чата" 
                                    value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)}
                                />
                                <IconButton color="primary" onClick={handleCreateChat}><AddIcon /></IconButton>
                            </Box>
                            
                            {/* Поиск людей */}
                            <TextField 
                                    fullWidth size="small" placeholder="Найти пользователя..." 
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && handleSearchUsers()}
                            />
                        </Box>

                        {/* Результаты поиска пользователей (всплывающий список) */}
                        {foundUsers.length > 0 && (
                            <Paper sx={{ mx: 2, mb: 1, maxHeight: 200, overflow: 'auto', elevation: 3, border: '1px solid #ddd' }}>
                                <List size="small">
                                    {foundUsers.map(user => (
                                        <ListItem key={user.id} divider>
                                            <ListItemText primary={user.username} />
                                            <IconButton size="small" color="primary" onClick={() => handleAddMember(user.id)}>
                                                <PersonAddIcon />
                                            </IconButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        )}

                        <Divider />
                        
                        {/* Список чатов */}
                        <List sx={{ flexGrow: 1, overflow: 'auto', bgcolor: '#fff' }}>
                            {chats.map((chat) => (
                                <ListItem 
                                    button key={chat.id} 
                                    selected={selectedChat?.id === chat.id}
                                    onClick={() => setSelectedChat(chat)}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: chat.isGroup ? '#1976d2' : '#4caf50' }}>{chat.title?.charAt(0)}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={chat.title || "Личный чат"} secondary={chat.isGroup ? "Группа" : "Приватное"} />
                                </ListItem>
                            ))}
                        </List>
                        
                        <Button variant="contained" color="error" fullWidth onClick={() => { localStorage.clear(); window.location.reload(); }}>Выход</Button>
                    </Paper>
                </Grid>

                {/* ПРАВАЯ ПАНЕЛЬ: Окно переписки */}
                <Grid item xs={8} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper sx={{ flexGrow: 1, mb: 2, p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                        {selectedChat ? (
                            <>
                                <Typography variant="h6" sx={{ mb: 1 }}>{selectedChat.title}</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {messages.map((msg, index) => {
                                        const isMe = msg.senderName === localStorage.getItem('username');
                                        return (
                                            <Box key={index} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                {!isMe && <Typography variant="caption" sx={{ ml: 1 }}>{msg.senderName}</Typography>}
                                                <Paper sx={{ p: 1.5, bgcolor: isMe ? '#0084ff' : '#fff', color: isMe ? '#fff' : '#000', borderRadius: 2 }}>
                                                    <Typography>{msg.content}</Typography>
                                                </Paper>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </>
                        ) : (
                            <Box sx={{ m: 'auto', textAlign: 'center', opacity: 0.5 }}>
                                <Typography variant="h5">Выберите чат или создайте новый</Typography>
                            </Box>
                        )}
                    </Paper>

                    <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1 }}>
                        <TextField 
                            fullWidth placeholder="Напишите сообщение..." 
                            value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                            disabled={!selectedChat} sx={{ bgcolor: '#fff' }}
                        />
                        <Button variant="contained" type="submit" disabled={!selectedChat}>Отправить</Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ChatPage;