import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, LogIn, AlertCircle } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { trpc } from '@/providers/trpc'

const TOKEN_KEY = 'cae_token'
const SESSION_KEY = 'cae_session'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState('resident')
  const [roomNumber, setRoomNumber] = useState('')
  const [pin, setPin] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const residentLogin = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'resident', ...data.resident }))
      navigate('/dashboard')
    },
    onError: (e) => {
      const code = e.message
      if (code === 'PENDING_APPROVAL') setError(t('errors.pendingApproval'))
      else if (code === 'REGISTRATION_REJECTED') setError(t('errors.rejected'))
      else if (code === 'ACCOUNT_SUSPENDED') setError(t('errors.suspended'))
      else if (code === 'INVALID_PIN') setError(t('login.invalidPin'))
      else if (code === 'RESIDENT_NOT_FOUND') setError(t('login.residentNotFound'))
      else setError(t('errors.generic'))
      setIsSubmitting(false)
    },
  })

  const adminLogin = trpc.localAuth.adminLogin.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'admin', ...data.user }))
      navigate('/admin')
    },
    onError: () => {
      setError(t('login.invalidCredentials'))
      setIsSubmitting(false)
    },
  })

  const handleResidentLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!roomNumber.trim() || !pin.trim()) { setError(t('login.fillAllFields')); return }
    setIsSubmitting(true)
    residentLogin.mutate({ roomNumber: roomNumber.trim(), pin })
  }

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!adminEmail.trim() || !adminPassword.trim()) { setError(t('login.fillAllFields')); return }
    setIsSubmitting(true)
    adminLogin.mutate({ email: adminEmail.trim(), password: adminPassword })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md relative">
        <div className="absolute top-3 right-3 z-10">
          <LanguageSwitcher variant="minimal" />
        </div>
        <CardHeader className="text-center pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <Link to="/"><ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />{t('common.back')}</Link>
            </Button>
          </div>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-[#003580] flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError('') }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="resident">{t('login.residentTab')}</TabsTrigger>
              <TabsTrigger value="admin">{t('login.adminTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="resident">
              <form onSubmit={handleResidentLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room">{t('login.roomNumber')}</Label>
                  <Input id="room" type="text" placeholder={t('login.roomPlaceholder')}
                    value={roomNumber} onChange={e => setRoomNumber(e.target.value)} dir="auto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">{t('login.pin')}</Label>
                  <Input id="pin" type="password" inputMode="numeric" maxLength={4}
                    placeholder={t('login.pinPlaceholder')} value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    className="tracking-widest" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}
                <Button type="submit" className="w-full gap-2 bg-[#003580] hover:bg-[#002a6b]" disabled={isSubmitting}>
                  <LogIn className="w-4 h-4" />
                  {isSubmitting ? t('login.entering') : t('login.enterButton')}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t('login.firstAccess')}{' '}
                <Link to="/register" className="text-[#003580] hover:underline underline-offset-2 font-medium">
                  {t('login.registerLink')}
                </Link>
              </p>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="admin@cae-ebenezer.org"
                    value={adminEmail} onChange={e => setAdminEmail(e.target.value)} dir="auto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('login.pin')}</Label>
                  <Input id="password" type="password" placeholder="••••••••"
                    value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                  </div>
                )}
                <Button type="submit" className="w-full gap-2 bg-[#003580] hover:bg-[#002a6b]" disabled={isSubmitting}>
                  <LogIn className="w-4 h-4" />
                  {isSubmitting ? t('login.entering') : t('login.enterButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
