import { useState, useEffect } from 'react';

/**
 * Hook personalizado para manejar el cambio de tema (dark/light).
 * Persiste la preferencia del usuario en localStorage.
 */
const useTheme = () => {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('cb-theme') === 'light';
  });

  useEffect(() => {
    const body = document.body;
    if (isLight) {
      body.classList.add('light-mode');
      localStorage.setItem('cb-theme', 'light');
    } else {
      body.classList.remove('light-mode');
      localStorage.setItem('cb-theme', 'dark');
    }
  }, [isLight]);

  const toggleTheme = () => setIsLight(prev => !prev);

  return { isLight, toggleTheme };
};

export default useTheme;
