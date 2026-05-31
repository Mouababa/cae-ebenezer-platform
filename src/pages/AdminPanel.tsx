import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  LogOut, ArrowLeft, Users, CalendarCheck, AlertTriangle, Settings,
  WashingMachine, CheckCircle2, XCircle, Search, Trash2, BarChart3,
  ClipboardList, Wind, RefreshCw, Database, ExternalLink
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { trpc } from '@/providers/trpc'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const SESSION_KEY = 'cae_session'
const COLORS = ['#003580','#1B7F5A','#F59E0B','#DC2626','#8B5CF6']

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800', OUT_OF_SERVICE: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-amber-100 text-amber-800', PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-gray-100 text-gray-800',
}

export default function AdminPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = getSession()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [amendBooking, setAmendBooking] = useState<{ id: number; status: string } | null>(null)
  const [amendReason, setAmendReason] = useState('')
  const [amendNewStatus, setAmendNewStatus] = useState('CANCELLED_BY_ADMIN')
  const [newMachine, setNewMachine] = useState({ name: '', type: 'WASHING_MACHINE' as const })
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [editMachine, setEditMachine] = useState<{ id: number; status: string; note: string } | null>(null)

  // ── Queries ──────────────────────────────────────────────────
  const { data: summary, refetch: refetchSummary } = trpc.analytics.summary.useQuery()
  const { data: residents, refetch: refetchResidents } = trpc.user.list.useQuery()
  const { data: machines, refetch: refetchMachines } = trpc.machine.list.useQuery()
  const { data: todayBookings, refetch: refetchBookings } = trpc.booking.listWithDetails.useQuery({ date: selectedDate })
  const { data: utilization } = trpc.analytics.utilization.useQuery()
  const { data: bookingTrend } = trpc.analytics.bookingTrend.useQuery({
    startDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const { data: auditLogs } = trpc.audit.list.useQuery({ limit: 50 })
  const { data: sysSettings, refetch: refetchSettings } = trpc.settings.getAll.useQuery()
  const { data: googleStatus } = trpc.google.status.useQuery()

  // ── Mutations ────────────────────────────────────────────────
  const approveResident = trpc.user.updateStatus.useMutation({ onSuccess: refetchResidents })
  const updateBookingStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => { setAmendBooking(null); setAmendReason(''); refetchBookings(); refetchSummary() },
  })
  const createMachine = trpc.machine.create.useMutation({ onSuccess: () => { setNewMachine({ name: '', type: 'WASHING_MACHINE' }); refetchMachines() } })
  const deleteMachine = trpc.machine.delete.useMutation({ onSuccess: refetchMachines })
  const updateMachineStatus = trpc.machine.updateStatus.useMutation({ onSuccess: () => { setEditMachine(null); refetchMachines() } })
  const saveSettings = trpc.settings.setBulk.useMutation({ onSuccess: refetchSettings })
  const syncSheets = trpc.google.syncAll.useMutation()
  const ensureSheets = trpc.google.ensureSheets.useMutation()

  const [settingValues, setSettingValues] = useState<Record<string, string>>({})
  const currentSettings = { ...sysSettings, ...settingValues }

  const pendingResidents = (residents ?? []).filter(r => r.status === 'PENDING')
  const filteredResidents = (residents ?? []).filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAmend = () => {
    if (!amendBooking || !amendReason.trim()) return
    updateBookingStatus.mutate({
      id: amendBooking.id, status: amendNewStatus as any,
      amendReason, adminName: session?.name ?? 'Admin', amendedBy: session?.id,
    })
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY); localStorage.removeItem('cae_token'); navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003580] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1" asChild>
              <Link to="/dashboard"><ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" /></Link>
            </Button>
            <div>
              <p className="text-xs opacity-75">{session?.name} · {session?.role?.replace('_',' ')}</p>
              <h1 className="font-bold text-lg">{t('admin.header.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" />
            <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1 h-auto mb-4 bg-white border">
            {['dashboard','schedule','approvals','machines','users','analytics','google','audit','settings'].map(tab => (
              <TabsTrigger key={tab} value={tab} className="text-xs px-3">
                {t(`admin.tabs.${tab}`)}
                {tab === 'approvals' && pendingResidents.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pendingResidents.length}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Dashboard ── */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: t('admin.dashboard.todayBookings'), value: summary?.todayBookings ?? 0, icon: CalendarCheck, color: 'text-[#003580]', bg: 'bg-blue-50' },
                { label: t('admin.dashboard.pendingApprovals'), value: summary?.pendingApprovals ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: t('admin.dashboard.machinesOutOfService'), value: summary?.machinesOutOfService ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: t('admin.dashboard.noShowsWeek'), value: summary?.noShowsWeek ?? 0, icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: t('admin.dashboard.totalResidents'), value: summary?.totalResidents ?? 0, icon: Users, color: 'text-[#1B7F5A]', bg: 'bg-green-50' },
                { label: t('admin.dashboard.confirmedToday'), value: summary?.confirmedToday ?? 0, icon: CheckCircle2, color: 'text-[#003580]', bg: 'bg-blue-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`${bg} rounded-lg p-2`}><Icon className={`w-5 h-5 ${color}`} /></div>
                    <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Schedule ── */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#003580]" />
              <Button size="sm" variant="outline" onClick={() => refetchBookings()}>
                <RefreshCw className="w-3 h-3 mr-1" />{t('common.refresh')}
              </Button>
            </div>
            {(todayBookings ?? []).length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">{t('admin.schedule.noBookings')}</CardContent></Card>
            ) : (todayBookings ?? []).map(b => (
              <Card key={b.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {b.machineType === 'DRYER' ? <Wind className="w-4 h-4 text-[#1B7F5A]" /> : <WashingMachine className="w-4 h-4 text-[#003580]" />}
                      <span className="font-medium text-sm">{b.machineName}</span>
                      <span className="text-xs text-muted-foreground">{b.startTime}–{b.endTime}</span>
                    </div>
                    <p className="text-sm">{b.residentName} · {t('login.roomNumber')} {b.residentRoom}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[b.status] ?? ''}`}>{b.status.replace(/_/g,' ')}</Badge>
                    {b.status === 'PENDING_CONFIRMATION' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                        onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'CONFIRMED', adminName: session?.name })}>
                        {t('admin.schedule.confirm')}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setAmendBooking({ id: b.id, status: b.status }); setAmendReason('') }}>
                      {t('admin.schedule.amend')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Approvals ── */}
          <TabsContent value="approvals" className="space-y-3">
            {pendingResidents.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">{t('admin.approvals.empty')}</CardContent></Card>
            ) : pendingResidents.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.name} className="w-12 h-12 rounded-full object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-lg font-bold">
                        {r.name[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-sm text-muted-foreground">{t('login.roomNumber')}: {r.roomNumber} · {r.phone ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      onClick={() => approveResident.mutate({ id: r.id, status: 'APPROVED' })}>
                      <CheckCircle2 className="w-3 h-3" />{t('admin.approvals.approve')}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 gap-1"
                      onClick={() => { setRejectTarget({ id: r.id, name: r.name }); setRejectReason('') }}>
                      <XCircle className="w-3 h-3" />{t('admin.approvals.reject')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Machines ── */}
          <TabsContent value="machines" className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('admin.machines.add')}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  <Input placeholder={t('admin.machines.namePlaceholder')} value={newMachine.name}
                    onChange={e => setNewMachine(m => ({ ...m, name: e.target.value }))} className="flex-1 min-w-40" />
                  <Select value={newMachine.type} onValueChange={v => setNewMachine(m => ({ ...m, type: v as any }))}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WASHING_MACHINE">{t('admin.machines.washingMachine')}</SelectItem>
                      <SelectItem value="DRYER">{t('admin.machines.dryer')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-[#003580] hover:bg-[#002a6b]" onClick={() => createMachine.mutate(newMachine)} disabled={!newMachine.name.trim()}>
                    + {t('admin.machines.add')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(machines ?? []).map(m => (
                <Card key={m.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.type === 'DRYER' ? <Wind className="w-4 h-4 text-[#1B7F5A]" /> : <WashingMachine className="w-4 h-4 text-[#003580]" />}
                        <span className="font-medium">{m.name}</span>
                      </div>
                      <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[m.status]}`}>
                        {t(`machines.statuses.${m.status}`)}
                      </Badge>
                    </div>
                    {m.statusNote && <p className="text-xs text-muted-foreground">{m.statusNote}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                        onClick={() => setEditMachine({ id: m.id, status: m.status, note: m.statusNote ?? '' })}>
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs"
                        onClick={() => { if (confirm(t('admin.machines.removeConfirm', { name: m.name }))) deleteMachine.mutate({ id: m.id }) }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3" />
              <Input placeholder={t('admin.users.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 rtl:pl-3 rtl:pr-9" />
            </div>
            {filteredResidents.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">{r.name[0]}</div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{t('login.roomNumber')}: {r.roomNumber} · 🌐 {r.preferredLanguage}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[r.status]}`}>{t(`admin.users.statuses.${r.status}`)}</Badge>
                    {r.status === 'APPROVED' ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600"
                        onClick={() => approveResident.mutate({ id: r.id, status: 'SUSPENDED' })}>
                        {t('admin.users.suspend')}
                      </Button>
                    ) : r.status === 'SUSPENDED' ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-600"
                        onClick={() => approveResident.mutate({ id: r.id, status: 'APPROVED' })}>
                        {t('admin.users.unsuspend')}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />{t('admin.analytics.charts.utilization')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={utilization ?? []}>
                    <XAxis dataKey="machineName" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="totalBookings" fill="#003580" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">{t('admin.analytics.charts.bookingTrend')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={bookingTrend ?? []}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#003580" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Google Integration ── */}
          <TabsContent value="google" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Google Sheets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${googleStatus?.sheetsConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {googleStatus?.sheetsConfigured ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {googleStatus?.sheetsConfigured
                    ? `Configurado · ID: ${googleStatus.sheetsId}`
                    : 'Não configurado — adicione GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY e GOOGLE_SHEETS_ID ao .env'}
                </div>
                {googleStatus?.sheetsConfigured && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => ensureSheets.mutate()} disabled={ensureSheets.isPending}>
                      {ensureSheets.isPending ? 'Criando abas...' : 'Criar Abas'}
                    </Button>
                    <Button size="sm" className="bg-[#003580] hover:bg-[#002a6b]" onClick={() => syncSheets.mutate()} disabled={syncSheets.isPending}>
                      <RefreshCw className={`w-3 h-3 mr-1 ${syncSheets.isPending ? 'animate-spin' : ''}`} />
                      {syncSheets.isPending ? 'Sincronizando...' : 'Sincronizar Tudo'}
                    </Button>
                    {syncSheets.data && (
                      <p className="text-xs text-muted-foreground self-center">
                        {syncSheets.data.success
                          ? `✅ ${(syncSheets.data as any).bookingsSynced} agendamentos · ${(syncSheets.data as any).residentsSynced} conviventes`
                          : `❌ ${(syncSheets.data as any).message}`}
                      </p>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                  <p className="font-medium">Como configurar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Acesse <a href="https://console.cloud.google.com" target="_blank" className="text-[#003580] underline">console.cloud.google.com</a> e crie um projeto</li>
                    <li>Ative a API "Google Sheets API"</li>
                    <li>Crie uma Conta de Serviço e baixe o JSON de credenciais</li>
                    <li>Copie o email da conta de serviço e a chave privada para o .env</li>
                    <li>Crie uma planilha no Google Sheets e compartilhe com o email da conta de serviço (editor)</li>
                    <li>Copie o ID da planilha da URL para GOOGLE_SHEETS_ID no .env</li>
                    <li>Reinicie o servidor e clique em "Criar Abas"</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ExternalLink className="w-4 h-4" />Google Calendar</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${googleStatus?.calendarConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {googleStatus?.calendarConfigured ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {googleStatus?.calendarConfigured
                    ? `Configurado · ID: ${googleStatus.calendarId}`
                    : 'Não configurado — adicione GOOGLE_CALENDAR_ID ao .env'}
                </div>
                <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                  <p className="font-medium">Como configurar:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Ative a API "Google Calendar API" no mesmo projeto</li>
                    <li>Crie um novo calendário Google e compartilhe com a conta de serviço (fazer alterações)</li>
                    <li>Copie o ID do calendário (em Configurações do calendário) para GOOGLE_CALENDAR_ID</li>
                    <li>Reinicie o servidor — agendamentos confirmados criarão eventos automaticamente</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Log ── */}
          <TabsContent value="audit" className="space-y-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4" />{t('admin.audit.title')}</CardTitle></CardHeader>
              <CardContent>
                {(auditLogs ?? []).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">{t('admin.audit.noLogs')}</p>
                ) : (
                  <div className="space-y-2">
                    {(auditLogs ?? []).map(log => (
                      <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className="text-xs text-muted-foreground min-w-32 pt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                        <div>
                          <p className="text-sm"><strong>{log.userName}</strong> — <span className="font-mono text-xs text-[#003580]">{log.action}</span></p>
                          {log.target && <p className="text-xs text-muted-foreground">{log.target}</p>}
                          {log.details && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-0.5">{log.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />{t('admin.settings.title')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'maxBookingsPerDay', label: t('admin.settings.maxBookingsPerDay'), type: 'number' },
                  { key: 'bookingWindowDays', label: t('admin.settings.bookingWindowDays'), type: 'number' },
                  { key: 'cancellationWindowHours', label: t('admin.settings.cancellationWindowHours'), type: 'number' },
                ].map(({ key, label, type }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input type={type} value={settingValues[key] ?? sysSettings?.[key] ?? ''}
                      onChange={e => setSettingValues(v => ({ ...v, [key]: e.target.value }))}
                      className="max-w-32" />
                  </div>
                ))}
                <Button className="bg-[#003580] hover:bg-[#002a6b]"
                  onClick={() => saveSettings.mutate(settingValues)} disabled={saveSettings.isPending}>
                  {t('admin.settings.save')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Amendment Dialog */}
      <Dialog open={!!amendBooking} onOpenChange={() => setAmendBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.amendment.title')}</DialogTitle>
            <DialogDescription>Booking #{amendBooking?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('admin.amendment.reason')}</Label>
              <Textarea placeholder={t('admin.amendment.reasonPlaceholder')} value={amendReason}
                onChange={e => setAmendReason(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Novo Status</Label>
              <Select value={amendNewStatus} onValueChange={setAmendNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="CANCELLED_BY_ADMIN">Cancelado pelo Admin</SelectItem>
                  <SelectItem value="COMPLETED">Concluído</SelectItem>
                  <SelectItem value="NO_SHOW">Não Compareceu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAmendBooking(null)}>{t('common.cancel')}</Button>
            <Button className="bg-[#003580] hover:bg-[#002a6b]" onClick={handleAmend}
              disabled={!amendReason.trim() || updateBookingStatus.isPending}>
              {t('admin.amendment.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.approvals.reject')} — {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>{t('admin.approvals.rejectReason')}</Label>
            <Textarea placeholder={t('admin.approvals.rejectReasonPlaceholder')} value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => {
              if (rejectTarget) approveResident.mutate({ id: rejectTarget.id, status: 'REJECTED', rejectReason })
              setRejectTarget(null)
            }}>
              {t('admin.approvals.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Status Dialog */}
      <Dialog open={!!editMachine} onOpenChange={() => setEditMachine(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.machines.saveStatus')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('admin.machines.status')}</Label>
              <Select value={editMachine?.status ?? 'ACTIVE'} onValueChange={v => setEditMachine(m => m ? { ...m, status: v } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t('admin.machines.active')}</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">{t('admin.machines.outOfService')}</SelectItem>
                  <SelectItem value="MAINTENANCE">{t('admin.machines.maintenance')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('admin.machines.statusNote')}</Label>
              <Input placeholder={t('admin.machines.statusNotePlaceholder')} value={editMachine?.note ?? ''}
                onChange={e => setEditMachine(m => m ? { ...m, note: e.target.value } : null)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditMachine(null)}>{t('common.cancel')}</Button>
            <Button className="bg-[#003580] hover:bg-[#002a6b]" onClick={() => {
              if (editMachine) updateMachineStatus.mutate({ id: editMachine.id, status: editMachine.status as any, statusNote: editMachine.note })
            }}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
