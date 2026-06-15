import { useLanguage } from './LanguageContext'

function LanguageSwitch() {
  const { language, setLanguage, copy } = useLanguage()

  return (
    <div
      className="language-switch"
      role="group"
      aria-label={copy.header.languageSwitchAria}
    >
      <button
        type="button"
        className={`lang-btn ${language === 'vi' ? 'active' : ''}`}
        aria-pressed={language === 'vi'}
        onClick={() => setLanguage('vi')}
      >
        VI
      </button>
      <button
        type="button"
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}

export default LanguageSwitch
