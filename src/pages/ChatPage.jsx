import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, List, ListItem, ListItemText, Divider, TextField, Button, Typography, ListItemAvatar, Avatar, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';
import api from '../api/axios';

const ChatPage = () => {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatMembers, setChatMembers] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [imageUrl, setImageUrl] = useState(''); // Ссылка на фото в сообщении
    const [connection, setConnection] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    const [newChatTitle, setNewChatTitle] = useState('');

    // --- ПРОВЕРКА РОЛИ АДМИНА ---
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Расшифровываем полезную нагрузку (Payload) токена
                const payloadStr = atob(token.split('.')[1]);
                const payload = JSON.parse(payloadStr);
                
                // Проверяем роль (в зависимости от настроек .NET она может называться 'role' или длинным URI)
                const role = payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
                
                if (role === 'Admin') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Ошибка чтения токена", e);
            }
        }
    }, []);
    // ----------------------------

    // Профили
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [profileData, setProfileData] = useState({
        username: localStorage.getItem('username') || '',
        avatar: '',
        bio: ''
    });

    const selectedChatRef = useRef(null);
    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(() => { scrollToBottom(); }, [messages]);

    // SignalR
    useEffect(() => {
        const newConnection = new HubConnectionBuilder()
            .withUrl("http://localhost:5005/chatHub", { accessTokenFactory: () => localStorage.getItem('token') })
            .withAutomaticReconnect().configureLogging(LogLevel.Information).build();
        setConnection(newConnection);
        return () => { if (newConnection) newConnection.stop(); };
    }, []);

    useEffect(() => {
        if (connection) {
            connection.start().then(() => {
                connection.on("ReceiveMessage", (message) => {
                    if (selectedChatRef.current && message.chatId === selectedChatRef.current.id) {
                        setMessages(prev => [...prev, message]);
                    }
                });
            }).catch(e => console.error('SignalR Error: ', e));
        }
    }, [connection]);

    useEffect(() => {
        if (connection?.state === "Connected" && selectedChat) {
            connection.invoke("JoinChat", selectedChat.id).catch(console.error);
        }
    }, [selectedChat, connection]);

    const fetchChats = async () => {
        const res = await api.get('/Chat');
        setChats(res.data);
    };

    useEffect(() => { fetchChats(); }, []);

    useEffect(() => {
        if (selectedChat) {
            api.get(`/Message/${selectedChat.id}`).then(res => setMessages(res.data));
            api.get(`/Chat/${selectedChat.id}/members`).then(res => setChatMembers(res.data));
        }
    }, [selectedChat]);

    // Обработчики
    const handleViewProfile = async (userId) => {
        const res = await api.get(`/User/${userId}`);
        setSelectedUserProfile(res.data);
    };

    const handleUpdateProfile = async () => {
        await api.patch('/User/profile', { username: profileData.username, avatarUrl: profileData.avatar, bio: profileData.bio });
        localStorage.setItem('username', profileData.username);
        setIsProfileOpen(false);
        fetchChats();
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageUrl.trim()) || !selectedChat) return;
        await api.post('/Message', { chatId: selectedChat.id, content: newMessage, imageUrl: imageUrl });
        setNewMessage('');
        setImageUrl('');
    };

    const handleStartPrivateChat = async (userId) => {
        const res = await api.post('/Chat/private', { targetUserId: userId });
        await fetchChats();
        // Находим чат в новом списке, чтобы получить правильный Title
        const newChat = res.data; 
        setSelectedChat({ id: newChat.chatId, title: "Загрузка..." });
        setFoundUsers([]);
        setSearchTerm('');
    };

    const handleSearchUsers = async () => {
        if (!searchTerm.trim()) { 
            setFoundUsers([]); 
            return; 
        }
        try {
            // Убедись, что путь к контроллеру правильный (api/User/search)
            const response = await api.get(`/User/search?term=${searchTerm}`);
            setFoundUsers(response.data);
            console.log("Пользователи найдены:", response.data);
        } catch (error) {
            console.error("Ошибка поиска пользователей:", error);
            alert("Ошибка при поиске пользователей");
        }
    };

    return (
        <Box sx={{ height: '100vh', p: 2, boxSizing: 'border-box', bgcolor: '#e5ddd5' }}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
                {/* ЛЕВАЯ ПАНЕЛЬ */}
                <Grid item xs={3} md={4} sx={{ height: '100%' }}>
                    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, bgcolor: '#f0f2f5' }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <TextField fullWidth size="small" placeholder="Новая группа..." value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} />
                                <IconButton color="primary" onClick={() => api.post('/Chat', { title: newChatTitle, isGroup: true }).then(fetchChats)}><AddIcon /></IconButton>
                            </Box>
                            <TextField fullWidth size="small" placeholder="Поиск людей..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && handleSearchUsers()} />
                        </Box>

                        {foundUsers.length > 0 && (
                            <List sx={{ bgcolor: '#fff', borderBottom: '2px solid #1976d2' }}>
                                {foundUsers.map(user => (
                                    <ListItem key={user.id} divider>
                                        <ListItemText primary={user.username} />
                                        <IconButton color="success" onClick={() => handleStartPrivateChat(user.id)}><ChatIcon /></IconButton>
                                        <IconButton color="primary" onClick={() => handleAddMember(user.id)}><PersonAddIcon /></IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                        
                        <List sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#fff' }}>
                            {chats.map((chat) => (
                                <ListItem button key={chat.id} selected={selectedChat?.id === chat.id} onClick={() => setSelectedChat(chat)}>
                                    <ListItemAvatar><Avatar src={chat.avatarUrl}>{chat.title?.charAt(0)}</Avatar></ListItemAvatar>
                                    <ListItemText primary={chat.title} secondary={chat.isGroup ? "Группа" : "Личное"} />
                                </ListItem>
                            ))}
                        </List>
                        
                        <Box sx={{ p: 1, bgcolor: '#f0f2f5', display: 'flex', gap: 1 }}>
                            <IconButton onClick={() => setIsProfileOpen(true)}><SettingsIcon /></IconButton>
                            
                            {/* Кнопка показывается ТОЛЬКО админам */}
                            {isAdmin && (
                                <Button variant="contained" color="warning" fullWidth onClick={() => window.location.href = '/admin'}>Админ</Button>
                            )}

                            <Button variant="outlined" color="error" fullWidth onClick={() => { localStorage.clear(); window.location.reload(); }}>Выход</Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* ПРАВАЯ ПАНЕЛЬ */}
                <Grid item xs={9} md={8} sx={{ height: '100%' }}>
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                            {selectedChat ? (
                                <>
                                    <Box sx={{ p: 2, bgcolor: '#f0f2f5', borderBottom: '1px solid #ddd' }}>
                                        <Typography variant="h6">{selectedChat.title}</Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', mt: 1 }}>
                                            {chatMembers.map(m => (
                                                <Chip key={m.userId} size="small" onClick={() => handleViewProfile(m.userId)} avatar={<Avatar src={m.avatarUrl}>{m.username[0]}</Avatar>} label={m.username} onDelete={m.username !== localStorage.getItem('username') ? () => api.delete(`/Chat/${selectedChat.id}/member/${m.userId}`).then(() => setChatMembers(prev => prev.filter(x => x.userId !== m.userId))) : undefined} />
                                            ))}
                                        </Box>
                                    </Box>

                                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {messages.map((msg, index) => {
                                            const isMe = msg.senderName === localStorage.getItem('username');
                                            return (
                                                <Box key={index} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                                    <Paper sx={{ p: 1.5, bgcolor: isMe ? '#dcf8c6' : '#fff', borderRadius: 2 }}>
                                                        {!isMe && <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer' }} onClick={() => handleViewProfile(msg.senderId)}>{msg.senderName}</Typography>}
                                                        {msg.imageUrl && <Box component="img" src={msg.imageUrl} sx={{ width: '100%', borderRadius: 1, mb: 1 }} />}
                                                        <Typography>{msg.content}</Typography>
                                                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', opacity: 0.6 }}>{new Date(msg.sentAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                                                    </Paper>
                                                </Box>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ m: 'auto', textAlign: 'center' }}><Typography variant="h5">Выберите чат Echo</Typography></Box>
                            )}
                        </Paper>

                        <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#fff', p: 1, borderRadius: 2 }}>
                            {imageUrl && <Chip label="Картинка прикреплена" onDelete={() => setImageUrl('')} color="primary" sx={{ mb: 1, alignSelf: 'flex-start' }} />}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField fullWidth placeholder="Сообщение..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!selectedChat} />
                                <IconButton color="primary" onClick={() => { const url = prompt("Введите прямой URL картинки:"); if(url) setImageUrl(url); }}><ImageIcon /></IconButton>
                                <Button variant="contained" type="submit" disabled={!selectedChat}>Отправить</Button>
                            </Box>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            {/* ДИАЛОГ ПРОФИЛЯ */}
            <Dialog open={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)}>
                {selectedUserProfile && (
                    <Box sx={{ p: 3, textAlign: 'center', minWidth: 300 }}>
                        <Avatar src={selectedUserProfile.avatarUrl} sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }} />
                        <Typography variant="h5">{selectedUserProfile.username}</Typography>
                        <Typography color="textSecondary" sx={{ mb: 2 }}>{selectedUserProfile.role}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body1">{selectedUserProfile.bio || "Пользователь не оставил описания."}</Typography>
                        <Button onClick={() => setSelectedUserProfile(null)} sx={{ mt: 3 }}>Закрыть</Button>
                    </Box>
                )}
            </Dialog>

            {/* НАСТРОЙКИ */}
            <Dialog open={isProfileOpen} onClose={() => setIsProfileOpen(false)}>
                <DialogTitle>Настройки моего профиля</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Имя" margin="normal" value={profileData.username} onChange={(e) => setProfileData({...profileData, username: e.target.value})} />
                    <TextField fullWidth label="URL аватара" margin="normal" value={profileData.avatar} onChange={(e) => setProfileData({...profileData, avatar: e.target.value})} />
                    <TextField fullWidth label="О себе" margin="normal" multiline rows={3} value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} />
                </DialogContent>
                <DialogActions><Button onClick={() => setIsProfileOpen(false)}>Отмена</Button><Button onClick={handleUpdateProfile} variant="contained">Сохранить</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default ChatPage;