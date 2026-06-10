/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'
import { formatLogQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { StatCard } from '@/features/dashboard/components/ui/stat-card'
import {
  Key,
  RefreshCw,
  Hash,
  BarChart3,
  Users,
  Search,
} from 'lucide-react'
import type { QuotaUsageDetail } from '../types'

type TimeRange = '1h' | '6h' | '1d' | '7d' | '30d' | 'all'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

function getTimeRangeSeconds(range: TimeRange): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000)
  switch (range) {
    case '1h':  return { start: now - 3600, end: now }
    case '6h':  return { start: now - 6 * 3600, end: now }
    case '1d':  return { start: now - 24 * 3600, end: now }
    case '7d':  return { start: now - 7 * 24 * 3600, end: now }
    case '30d': return { start: now - 30 * 24 * 3600, end: now }
    case 'all': return { start: 0, end: now }
  }
}

export function KeyUsageStats() {
  const { t } = useTranslation()
  const [details, setDetails] = useState<QuotaUsageDetail[]>([])
  const [quota, setQuota] = useState(0)
  const [rpm, setRpm] = useState(0)
  const [tpm, setTpm] = useState(0)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('1d')
  const [filterUsername, setFilterUsername] = useState('')
  const [filterTokenName, setFilterTokenName] = useState('')
  const [searchUsername, setSearchUsername] = useState('')
  const [searchTokenName, setSearchTokenName] = useState('')

  const fetchStats = useCallback(async (range: TimeRange, uname: string, tname: string) => {
    setLoading(true)
    try {
      const { start, end } = getTimeRangeSeconds(range)
      const params: Record<string, unknown> = { start_timestamp: start, end_timestamp: end }
      if (uname) params.username = uname
      if (tname) params.token_name = tname
      const res = await api.get('/api/log/stat', { params })
      if (res.data?.success) {
        const data = res.data.data
        setQuota(data.quota || 0)
        setRpm(data.rpm || 0)
        setTpm(data.tpm || 0)
        setDetails(data.details || [])
      }
    } catch {
      setDetails([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = () => {
    setSearchUsername(filterUsername)
    setSearchTokenName(filterTokenName)
  }

  useEffect(() => {
    void fetchStats(timeRange, searchUsername, searchTokenName)
  }, [fetchStats, timeRange, searchUsername, searchTokenName])

  const handleReset = () => {
    setFilterUsername('')
    setFilterTokenName('')
    setSearchUsername('')
    setSearchTokenName('')
    setTimeRange('1d')
  }

  const totalTokens = useMemo(
    () => details.reduce((sum, d) => sum + d.total_tokens, 0),
    [details]
  )

  return (
    <div className='flex flex-col gap-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg'>
            <Key className='size-4' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-xl font-semibold tracking-tight'>
              {t('Key Usage Statistics')}
            </h1>
            <p className='text-muted-foreground line-clamp-1 text-sm'>
              {t('API key usage breakdown by user')}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className='h-8 w-[130px] text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{t(r.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant='outline' size='sm' className='h-8 px-2.5 text-xs' onClick={() => fetchStats(timeRange, searchUsername, searchTokenName)} disabled={loading}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden='true' />
            {loading ? t('Loading...') : t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className='rounded-xl border shadow-xs'>
        <CardContent className='flex flex-wrap items-end gap-3 p-4'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-muted-foreground text-xs'>{t('Username')}</label>
            <Input className='h-8 w-[180px] text-xs' placeholder={t('Filter by username')} value={filterUsername} onChange={(e) => setFilterUsername(e.target.value)} />
          </div>
          <div className='flex flex-col gap-1.5'>
            <label className='text-muted-foreground text-xs'>{t('Key Name')}</label>
            <Input className='h-8 w-[180px] text-xs' placeholder={t('Filter by key name')} value={filterTokenName} onChange={(e) => setFilterTokenName(e.target.value)} />
          </div>
          <Button size='sm' className='h-8 gap-1.5 text-xs' onClick={handleSearch} disabled={loading}>
            <Search className='size-3.5' />{t('Search')}
          </Button>
          <Button variant='outline' size='sm' className='h-8 text-xs' onClick={handleReset}>{t('Reset')}</Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <StaggerContainer className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StaggerItem>
          <Card className='h-full rounded-xl border shadow-xs'>
            <CardContent className='p-4'>
              <StatCard title={t('Total Usage')} value={loading ? '...' : formatLogQuota(quota)} icon={Hash} loading={loading} />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className='h-full rounded-xl border shadow-xs'>
            <CardContent className='p-4'>
              <StatCard title='RPM' value={loading ? '...' : rpm.toLocaleString()} icon={BarChart3} loading={loading} />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className='h-full rounded-xl border shadow-xs'>
            <CardContent className='p-4'>
              <StatCard title='TPM' value={loading ? '...' : tpm.toLocaleString()} icon={Hash} loading={loading} />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className='h-full rounded-xl border shadow-xs'>
            <CardContent className='p-4'>
              <StatCard title={t('Active Keys')} value={loading ? '...' : details.length.toLocaleString()} icon={Users} loading={loading} />
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Detail Table */}
      <Card className='rounded-xl border shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between px-5 py-4'>
          <CardTitle className='flex items-center gap-2 text-base font-semibold'>
            <BarChart3 className='text-muted-foreground size-4' aria-hidden='true' />
            {t('Key Usage Details')}
          </CardTitle>
          {details.length > 0 && (
            <span className='text-muted-foreground text-xs tabular-nums'>
              {details.length} keys · {totalTokens.toLocaleString()} tokens
            </span>
          )}
        </CardHeader>
        <CardContent className='px-0 pb-0'>
          <div className='max-h-[600px] overflow-y-auto'>
            <Table>
              <TableHeader className='bg-muted/30 sticky top-0'>
                <TableRow>
                  <TableHead className='text-xs font-medium'>{t('User')}</TableHead>
                  <TableHead className='text-xs font-medium'>{t('Key')}</TableHead>
                  <TableHead className='w-20 text-right text-xs font-medium'>{t('Requests')}</TableHead>
                  <TableHead className='w-24 text-right text-xs font-medium'>Prompt</TableHead>
                  <TableHead className='w-24 text-right text-xs font-medium'>Completion</TableHead>
                  <TableHead className='w-24 text-right text-xs font-medium'>{t('Total Tokens')}</TableHead>
                  <TableHead className='w-24 text-right text-xs font-medium'>{t('Usage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length > 0 ? details.map((d, idx) => (
                  <TableRow key={`${d.user_id}-${d.token_id}-${idx}`}>
                    <TableCell className='text-xs'>
                      <div className='font-medium'>{d.username || '—'}</div>
                      <div className='text-muted-foreground font-mono text-[10px]'>ID: {d.user_id || '—'}</div>
                    </TableCell>
                    <TableCell className='text-xs'>
                      <div className='font-medium'>{d.token_name || '—'}</div>
                      <div className='text-muted-foreground font-mono text-[10px]'>ID: {d.token_id || '—'}</div>
                    </TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums'>{d.count.toLocaleString()}</TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums'>{d.prompt_tokens.toLocaleString()}</TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums'>{d.completion_tokens.toLocaleString()}</TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums font-semibold'>{d.total_tokens.toLocaleString()}</TableCell>
                    <TableCell className='text-right font-mono text-xs tabular-nums'>{formatLogQuota(d.quota || 0)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className='text-muted-foreground py-8 text-center text-sm'>
                      {loading ? t('Loading...') : t('No data')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}