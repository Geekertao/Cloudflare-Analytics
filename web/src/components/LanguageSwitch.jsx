import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitch = () => {
  const { currentLanguage, switchLanguage, t } = useLanguage();

  return (
    <div className="language-switch">
      <span className="language-label">{t('language')}:</span>
      <div className="language-buttons">
        <button
          className={`language-button ${currentLanguage === 'zh' ? 'active' : ''}`}
          onClick={() => switchLanguage('zh')}
        >
          {t('chinese')}
        </button>
        <button
          className={`language-button ${currentLanguage === 'en' ? 'active' : ''}`}
          onClick={() => switchLanguage('en')}
        >
          {t('english')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitch;