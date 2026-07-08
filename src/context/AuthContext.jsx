import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('cb_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Fetch latest profile from backend to sync role/permissions/is_authorized
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${parsed.access_token}` }
        })
        .then(res => {
          if (res.status === 401) {
            logout();
          } else if (res.ok) {
            return res.json();
          }
        })
        .then(data => {
          if (data) {
            const hasBypass = data.role === 'superadmin' || data.role === 'admin';
            const updatedUser = {
              ...parsed,
              role: data.role,
              full_name: data.full_name,
              can_create: hasBypass || data.can_create,
              can_read: hasBypass || data.can_read,
              can_update: hasBypass || data.can_update,
              can_delete: hasBypass || data.can_delete,
              is_authorized: data.is_authorized
            };
            setUser(updatedUser);
            localStorage.setItem('cb_user', JSON.stringify(updatedUser));
          }
        })
        .catch(err => console.error('Error syncing profile:', err));

      } catch (e) {
        localStorage.removeItem('cb_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('cb_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cb_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
