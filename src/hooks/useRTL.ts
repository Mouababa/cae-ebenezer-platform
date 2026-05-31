import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

const RTL_LANGUAGES = ['ar', 'fa'];

export function useRTL() {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [i18n.language, isRTL]);

  return { isRTL, language: i18n.language };
}
