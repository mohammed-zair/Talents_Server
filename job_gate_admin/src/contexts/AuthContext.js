import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://talents-we-trust.tech/api';

const mapUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    role: user.user_type || user.role,
    name: user.full_name || user.name || user.email,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('jwt_token');
    if (storedUser && token) {
      try {
        setUser(mapUser(JSON.parse(storedUser)));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });

    const raw = response.data;
    const payload = (() => {
      if (raw?.message?.token || raw?.message?.user) return raw.message;
      if (raw?.data?.token || raw?.data?.user) return raw.data;
      return raw;
    })();
    const token = payload?.token;
    const loggedUser = mapUser(payload?.user);

    if (token) {
      localStorage.setItem('jwt_token', token);
    }
    if (loggedUser) {
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
    }

    return { token, user: loggedUser };
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
