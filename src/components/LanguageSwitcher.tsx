import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'pt', label: 'PT', fullName: 'Português', flag: '🇧🇷' },
  { code: 'es', label: 'ES', fullName: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'EN', fullName: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', fullName: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'AR', fullName: 'العربية', flag: '🇸🇦' },
  { code: 'fa', label: 'FA', fullName: 'فارسی', flag: '🇮🇷' },
];

interface LanguageSwitcherProps {
  variant?: 'dark' | 'light' | 'minimal';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'light', className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('cae_language', code);
    setOpen(false);
  };

  const isRTL = i18n.language === 'ar' || i18n.language === 'fa';
  const textColor = variant === 'dark' ? 'text-white' : variant === 'minimal' ? 'text-muted-foreground' : 'text-foreground';
  const bgColor = variant === 'dark' ? 'bg-white/10 hover:bg-white/20' : variant === 'minimal' ? 'bg-transparent hover:bg-muted' : 'bg-muted/80 hover:bg-muted';
  const dropdownBg = variant === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-white border-border';
  const dropdownText = variant === 'dark' ? 'text-white' : 'text-foreground';

  return (
    <div ref={ref} className={`relative inline-block ${className}`} dir="ltr">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${bgColor} ${textColor}`}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="text-xs font-semibold">{currentLang.label}</span>
      </button>

      {open && (
        <div
          className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1.5 w-52 rounded-xl border shadow-lg z-50 overflow-hidden ${dropdownBg}`}
          role="listbox"
          aria-label="Languages"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent/50 ${dropdownText} ${
                i18n.language === lang.code ? 'bg-accent/30 font-medium' : ''
              }`}
              role="option"
              aria-selected={i18n.language === lang.code}
              dir={lang.code === 'ar' || lang.code === 'fa' ? 'rtl' : 'ltr'}
            >
              <span className="text-lg leading-none">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.fullName}</span>
              {i18n.language === lang.code && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
