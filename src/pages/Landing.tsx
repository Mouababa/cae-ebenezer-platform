import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { QrCode, CalendarDays, Shield } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Landing() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white min-h-[85vh] flex flex-col items-center justify-center px-4">
        {/* Language Switcher - top right */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher variant="dark" />
        </div>

        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
            {t('landing.heroTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-8">
            {t('landing.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button asChild size="lg" className="gap-2 text-base">
              <Link to="/login">
                <QrCode className="w-5 h-5" />
                {t('landing.accessButton')}
              </Link>
            </Button>
          </div>

          <p className="text-slate-400 text-sm">
            {t('landing.firstAccess')}{' '}
            <Link to="/register" className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors">
              {t('landing.register')}
            </Link>
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <div className="w-1.5 h-2.5 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="bg-white py-16 px-4 relative">
        {/* Secondary language switcher for light section */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="minimal" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            {t('landing.section.title')}
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-12">
            {t('landing.section.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{t('landing.features.qr.title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.features.qr.description')}</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{t('landing.features.schedule.title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.features.schedule.description')}</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{t('landing.features.secure.title')}</h3>
              <p className="text-sm text-slate-600">{t('landing.features.secure.description')}</p>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/login">{t('landing.enter')}</Link>
            </Button>
            <Button asChild variant="default" size="lg">
              <Link to="/register">{t('landing.register')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-center">
        <p className="text-sm font-medium text-slate-300 mb-1">{t('landing.institution.name')}</p>
        <p className="text-xs text-slate-500 mb-1">{t('landing.institution.address')}</p>
        <p className="text-xs text-slate-500">{t('landing.institution.org')}</p>
      </footer>
    </div>
  )
}
