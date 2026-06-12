import React, { createContext, useState, useContext } from 'react';
import { api, setAuthToken } from '../services/api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const { token, user: userData } = await api.login(email, password);
    setAuthToken(token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}