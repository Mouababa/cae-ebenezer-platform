import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Camera, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { trpc } from '@/providers/trpc'
import { useTranslation as useI18n } from 'react-i18next'

export default function Register() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState<'form' | 'camera' | 'success'>('form')
  const [name, setName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => setStep('success'),
    onError: (e) => {
      if (e.message === 'ROOM_ALREADY_REGISTERED') {
        setServerError(t('register.errors.roomTaken'))
      } else {
        setServerError(t('errors.generic'))
      }
    },
  })

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { /* camera not available */ }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const takePhoto = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    setPhoto(canvas.toDataURL('image/jpeg', 0.8))
    stopCamera()
    setStep('form')
  }, [stopCamera])

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = t('register.errors.nameRequired')
    if (!roomNumber.trim()) errs.roomNumber = t('register.errors.roomRequired')
    if (!pin) errs.pin = t('register.errors.pinRequired')
    if (pin.length !== 4) errs.pin = t('register.errors.pinLength')
    if (pin !== pinConfirm) errs.pinConfirm = t('register.pinMismatch')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    if (!validateForm()) return
    registerMutation.mutate({
      name: name.trim(),
      roomNumber: roomNumber.trim(),
      phone: phone.trim() || undefined,
      pin,
      photoUrl: photo || undefined,
      preferredLanguage: i18n.language as any,
    })
  }

  if (step === 'camera') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-4">
          <video ref={videoRef} autoPlay playsInline
            className="w-full rounded-xl border-2 border-white/20"
            onPlay={() => {}} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-white/10 text-white border-white/20"
              onClick={() => { stopCamera(); setStep('form') }}>
              <ArrowLeft className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0 rtl:scale-x-[-1]" />{t('common.cancel')}
            </Button>
            <Button className="flex-1 bg-white text-black hover:bg-white/90" onClick={takePhoto}>
              <Camera className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />{t('register.takePhoto')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t('register.success.title')}</h2>
            <p className="text-muted-foreground">{t('register.success.message')}</p>
            <div className="flex items-center justify-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg text-sm font-medium">
              <Clock className="w-4 h-4 shrink-0" />{t('register.success.pending')}
            </div>
            <Button className="w-full bg-[#003580] hover:bg-[#002a6b]" asChild>
              <Link to="/">{t('register.success.backHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md relative">
        <div className="absolute top-3 right-3 z-10">
          <LanguageSwitcher variant="minimal" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
              <Link to="/login"><ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />{t('common.back')}</Link>
            </Button>
          </div>
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo capture */}
            <div className="flex flex-col items-center gap-3 py-2">
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="foto" className="w-24 h-24 rounded-full object-cover border-4 border-[#003580]/20" />
                  <button type="button" onClick={() => { setPhoto(null); startCamera(); setStep('camera') }}
                    className="absolute -bottom-1 -right-1 bg-[#003580] text-white rounded-full p-1.5 shadow">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button type="button"
                  onClick={() => { setStep('camera'); startCamera() }}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-[#003580]/40 flex flex-col items-center justify-center gap-1 text-[#003580]/60 hover:border-[#003580] hover:text-[#003580] transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">{t('register.takePhoto')}</span>
                </button>
              )}
              <span className="text-xs text-muted-foreground">{t('register.photo')} ({t('common.optional')})</span>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{t('register.name')}</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('register.namePlaceholder')} dir="auto" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Room */}
            <div className="space-y-1.5">
              <Label htmlFor="room">{t('register.roomNumber')}</Label>
              <Input id="room" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                placeholder={t('register.roomPlaceholder')} />
              {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('register.phone')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span></Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder={t('register.phonePlaceholder')} />
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pin">{t('register.pin')}</Label>
                <Input id="pin" type="password" inputMode="numeric" maxLength={4}
                  placeholder="••••" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                  className="tracking-widest text-center" />
                {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pinConfirm">{t('register.pinConfirm')}</Label>
                <Input id="pinConfirm" type="password" inputMode="numeric" maxLength={4}
                  placeholder="••••" value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g,''))}
                  className="tracking-widest text-center" />
                {errors.pinConfirm && <p className="text-xs text-destructive">{errors.pinConfirm}</p>}
              </div>
            </div>

            {serverError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />{serverError}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#003580] hover:bg-[#002a6b]"
              disabled={registerMutation.isPending}>
              {registerMutation.isPending ? t('register.submitting') : t('register.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
