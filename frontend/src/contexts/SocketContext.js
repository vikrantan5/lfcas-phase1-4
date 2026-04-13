import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to Socket.IO server
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      
      const newSocket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setConnected(true);
        
        // Join user-specific room
        if (user?.id) {
          newSocket.emit('join_room', { user_id: user.id });
          console.log(`📡 Joined room for user: ${user.id}`);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connected', (data) => {
        console.log('Socket server message:', data);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  const joinCaseRoom = (caseId) => {
    if (socket && connected) {
      socket.emit('join_case', { case_id: caseId });
      console.log(`📂 Joined case room: ${caseId}`);
    }
  };

  const leaveCaseRoom = (caseId) => {
    if (socket && connected) {
      socket.emit('leave_case', { case_id: caseId });
      console.log(`📤 Left case room: ${caseId}`);
    }
  };

  const sendMessage = (messageData) => {
    if (socket && connected) {
      socket.emit('new_message', messageData);
      console.log('📨 Message sent:', messageData);
    }
  };

  const onNewMessage = (callback) => {
    if (socket) {
      socket.on('new_message', callback);
    }
  };

  const offNewMessage = () => {
    if (socket) {
      socket.off('new_message');
    }
  };

  const value = {
    socket,
    connected,
    joinCaseRoom,
    leaveCaseRoom,
    sendMessage,
    onNewMessage,
    offNewMessage,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
