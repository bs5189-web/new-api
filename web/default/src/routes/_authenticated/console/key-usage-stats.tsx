import { createFileRoute } from '@tanstack/react-router'
import { KeyUsageStats } from '@/features/usage-logs/components/key-usage-stats'

export const Route = createFileRoute('/_authenticated/console/key-usage-stats')({
  component: KeyUsageStats,
})