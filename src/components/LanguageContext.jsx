/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { copyData } from '../data/copy'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('duriantrust-language')
      return stored === 'vi' || stored === 'en' ? stored : 'vi'
    } catch {
      return 'vi'
    }
  })

  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      setLanguageState(lang)
      try {
        localStorage.setItem('duriantrust-language', lang)
      } catch {
        // Language switching still works for this session when storage is blocked.
      }
    }
  }

  useEffect(() => {
    document.documentElement.lang = language

    // Update page title
    document.title =
      language === 'vi'
        ? 'DurianTrust - Hồ sơ lô sầu riêng từ vườn đến bên mua'
        : 'DurianTrust - Durian batch records from farm to buyer'

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        language === 'vi'
          ? 'Tập hợp thông tin lô sầu riêng, tài liệu và hành trình. Chủ vườn chọn chia sẻ QR để bên mua và người xem đối chiếu hồ sơ.'
          : 'Keep durian batch details, documents and journey together. Growers choose when to share a QR for buyers and consumers to review the record.'
      )
    }
  }, [language])

  const copy = copyData[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, copy }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
