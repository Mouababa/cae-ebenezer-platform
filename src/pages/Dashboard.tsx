import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { LogOut, WashingMachine, Wind, CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle, User, Shield } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { trpc } from '@/providers/trpc'
import { format } from 'date-fns'

const SESSION_KEY = 'cae_session'

type BookingStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED_BY_RESIDENT' | 'CANCELLED_BY_ADMIN' | 'COMPLETED' | 'NO_SHOW'

const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING_CONFIRMATION: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED_BY_RESIDENT: 'bg-gray-100 text-gray-800',
  CANCELLED_BY_ADMIN: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('book')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedType, setSelectedType] = useState<'ALL' | 'WASHING_MACHINE' | 'DRYER'>('ALL')
  const [confirmSlot, setConfirmSlot] = useState<{ machineId: number; machineName: string; start: string; end: string } | null>(null)
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null)
  const session = getSession()

  useEffect(() => {
    if (!session || session.type !== 'resident') navigate('/login')
  }, [])

  const residentId: number = session?.id ?? 0

  // Data queries
  const { data: availability, refetch: refetchAvail } = trpc.booking.availability.useQuery(
    { date: selectedDate, machineType: selectedType === 'ALL' ? undefined : selectedType },
    { enabled: !!residentId }
  )

  const { data: myBookings, refetch: refetchBookings } = trpc.booking.list.useQuery(
    { residentId },
    { enabled: !!residentId }
  )

  const { data: machineList } = trpc.machine.list.useQuery()

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: () => { setConfirmSlot(null); refetchAvail(); refetchBookings() },
    onError: (e) => alert(t(`errors.${e.message}`) || t('errors.generic')),
  })

  const cancelBooking = trpc.booking.updateStatus.useMutation({
    onSuccess: () => { setCancelBookingId(null); refetchBookings(); refetchAvail() },
  })

  const handleBook = () => {
    if (!confirmSlot) return
    createBooking.mutate({
      residentId,
      machineId: confirmSlot.machineId,
      date: selectedDate,
      startTime: confirmSlot.start,
      endTime: confirmSlot.end,
    })
  }

  const handleCancel = () => {
    if (!cancelBookingId) return
    cancelBooking.mutate({ id: cancelBookingId, status: 'CANCELLED_BY_RESIDENT' })
  }

  const now = new Date()
  const upcomingBookings = (myBookings ?? []).filter(b =>
    b.status !== 'CANCELLED_BY_RESIDENT' && b.status !== 'CANCELLED_BY_ADMIN' && b.status !== 'COMPLETED' && b.status !== 'NO_SHOW'
  )
  const pastBookings = (myBookings ?? []).filter(b =>
    b.status === 'COMPLETED' || b.status === 'NO_SHOW' || b.status === 'CANCELLED_BY_RESIDENT' || b.status === 'CANCELLED_BY_ADMIN'
  )

  const machineMap = Object.fromEntries((machineList ?? []).map(m => [m.id, m]))

  const getSlotColor = (status: string, isMyBooking: boolean) => {
    if (status === 'OUT_OF_SERVICE') return 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
    if (isMyBooking) return 'bg-[#003580] text-white border-[#003580] cursor-default'
    if (status === 'OCCUPIED') return 'bg-red-50 text-red-400 cursor-not-allowed border-red-200'
    if (status === 'PENDING') return 'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed'
    return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003580] text-white shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75">CAE Ebenezer</p>
            <h1 className="font-semibold">{t('dashboard.header.greeting', { name: session?.name?.split(' ')[0] ?? '' })}</h1>
            <p className="text-xs opacity-75">{t('login.roomNumber')}: {session?.roomNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" />
            {session?.role === 'admin' || session?.role === 'master_admin' || session?.role === 'ose' ? (
              <Button size="sm" variant="outline" className="text-white border-white/40 hover:bg-white/10" asChild>
                <Link to="/admin"><Shield className="w-3 h-3 mr-1" />{t('dashboard.header.adminPanel')}</Link>
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('cae_token'); navigate('/') }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="book">{t('dashboard.tabs.book')}</TabsTrigger>
            <TabsTrigger value="myBookings">{t('dashboard.tabs.myBookings')}</TabsTrigger>
            <TabsTrigger value="profile">{t('dashboard.tabs.profile')}</TabsTrigger>
          </TabsList>

          {/* ── Book Tab ── */}
          <TabsContent value="book" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#003580]" />{t('dashboard.book.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date picker */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{t('dashboard.book.selectDate')}</label>
                  <input type="date" value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]" />
                </div>

                {/* Type filter */}
                <div className="flex gap-2">
                  {(['ALL', 'WASHING_MACHINE', 'DRYER'] as const).map(type => (
                    <button key={type} onClick={() => setSelectedType(type)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${selectedType === type ? 'bg-[#003580] text-white border-[#003580]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#003580]'}`}>
                      {type === 'ALL' ? '🔄 Todos' : type === 'WASHING_MACHINE' ? `🫧 ${t('dashboard.book.washingMachine')}` : `💨 ${t('dashboard.book.dryer')}`}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {[
                    { color: 'bg-green-100 border-green-200', label: t('dashboard.book.available') },
                    { color: 'bg-red-50 border-red-200', label: t('dashboard.book.occupied') },
                    { color: 'bg-[#003580] border-[#003580]', label: t('dashboard.book.myBooking') },
                    { color: 'bg-gray-100 border-gray-200', label: t('dashboard.book.outOfService') },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded border ${color}`} />{label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Slot grid per machine */}
            {(availability ?? []).map(({ machine, slots }) => (
              <Card key={machine.id}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium flex items-center gap-2">
                      {machine.type === 'DRYER' ? <Wind className="w-4 h-4 text-[#1B7F5A]" /> : <WashingMachine className="w-4 h-4 text-[#003580]" />}
                      {machine.name}
                    </span>
                    {machine.status !== 'ACTIVE' && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                        {t(`machines.statuses.${machine.status}`)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map(slot => {
                      const isMyBooking = slot.residentId === residentId
                      return (
                        <button key={slot.start}
                          disabled={slot.status !== 'AVAILABLE' || isMyBooking}
                          onClick={() => slot.status === 'AVAILABLE' && setConfirmSlot({
                            machineId: machine.id, machineName: machine.name,
                            start: slot.start, end: slot.end
                          })}
                          className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${getSlotColor(slot.status, isMyBooking)}`}>
                          <Clock className="w-3 h-3 mx-auto mb-0.5" />
                          {slot.start} – {slot.end}
                          {isMyBooking && <div className="text-[10px] opacity-75 mt-0.5">{t('dashboard.book.myBooking')}</div>}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── My Bookings Tab ── */}
          <TabsContent value="myBookings" className="space-y-3">
            <h3 className="font-semibold text-gray-700">{t('dashboard.myBookings.upcoming')}</h3>
            {upcomingBookings.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">{t('dashboard.myBookings.empty')}</CardContent></Card>
            ) : upcomingBookings.map(b => (
              <Card key={b.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {machineMap[b.machineId]?.type === 'DRYER'
                          ? <Wind className="w-4 h-4 text-[#1B7F5A]" />
                          : <WashingMachine className="w-4 h-4 text-[#003580]" />}
                        <span className="font-medium text-sm">{machineMap[b.machineId]?.name ?? `Máquina #${b.machineId}`}</span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />{b.date}
                        <Clock className="w-3 h-3 ml-1" />{b.startTime}–{b.endTime}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[b.status as BookingStatus]}`}>
                        {t(`dashboard.myBookings.statuses.${b.status}`)}
                      </Badge>
                      {(b.status === 'PENDING_CONFIRMATION' || b.status === 'CONFIRMED') && (
                        <button onClick={() => setCancelBookingId(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 underline">
                          {t('dashboard.myBookings.cancelButton')}
                        </button>
                      )}
                    </div>
                  </div>
                  {b.amendReason && (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-800">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />{b.amendReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {pastBookings.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-700 pt-2">{t('dashboard.myBookings.past')}</h3>
                {pastBookings.slice(0, 5).map(b => (
                  <Card key={b.id} className="opacity-70">
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-sm">{machineMap[b.machineId]?.name} · {b.date} · {b.startTime}</span>
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[b.status as BookingStatus]}`}>
                        {t(`dashboard.myBookings.statuses.${b.status}`)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card>
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex flex-col items-center gap-3">
                  {session?.photoUrl ? (
                    <img src={session.photoUrl} alt="foto" className="w-24 h-24 rounded-full object-cover border-4 border-[#003580]/20" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#003580]/10 flex items-center justify-center">
                      <User className="w-10 h-10 text-[#003580]" />
                    </div>
                  )}
                  <div className="text-center">
                    <h2 className="text-xl font-bold">{session?.name}</h2>
                    <p className="text-muted-foreground text-sm">{t('login.roomNumber')}: <strong>{session?.roomNumber}</strong></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-[#003580]">{myBookings?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.profile.totalBookings')}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-500">{session?.noShowCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.profile.noShows')}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => { localStorage.removeItem(SESSION_KEY); localStorage.removeItem('cae_token'); navigate('/') }}>
                  <LogOut className="w-4 h-4" />{t('dashboard.profile.logout')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm booking dialog */}
      <Dialog open={!!confirmSlot} onOpenChange={() => setConfirmSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.book.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {confirmSlot && t('dashboard.book.confirmMessage', {
                machine: confirmSlot.machineName,
                start: confirmSlot.start,
                end: confirmSlot.end,
                date: selectedDate,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmSlot(null)}>{t('common.cancel')}</Button>
            <Button className="bg-[#003580] hover:bg-[#002a6b]" onClick={handleBook} disabled={createBooking.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />{t('dashboard.book.bookButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel booking dialog */}
      <Dialog open={!!cancelBookingId} onOpenChange={() => setCancelBookingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.myBookings.cancelButton')}</DialogTitle>
            <DialogDescription>{t('dashboard.myBookings.cancelConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelBookingId(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
              <XCircle className="w-4 h-4 mr-2" />{t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
