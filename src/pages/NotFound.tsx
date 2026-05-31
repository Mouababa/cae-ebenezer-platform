import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-primary">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">{t('notFound.title')}</h2>
          <p className="text-muted-foreground">{t('notFound.message')}</p>
          <Button asChild className="w-full gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
              {t('notFound.backHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
