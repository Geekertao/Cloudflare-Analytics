import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitch = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="theme-switch">
      <button
        onClick={toggleTheme}
        className="theme-toggle-btn"
        aria-label={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
        title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        <div className="theme-toggle-track">
          <div className={`theme-toggle-thumb ${isDarkMode ? 'dark' : 'light'}`}>
            {isDarkMode ? (
              // 月亮图标
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              // 太阳图标
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

export default ThemeSwitch;