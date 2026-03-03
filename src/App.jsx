import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // Импортируем новую страницу
import ChatPage from './pages/ChatPage';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Страница входа */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Страница регистрации */}
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Защищенная страница чатов */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          } 
        />

        {/* Редирект для всех остальных путей */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;