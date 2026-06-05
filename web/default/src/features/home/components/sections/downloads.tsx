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
import { Cpu, Download, Laptop, Monitor, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RUIZHI_DOWNLOADS } from '../../downloads'

const DOWNLOAD_ICONS: Record<string, LucideIcon> = {
  'windows-x86': Monitor,
  'macos-x64': Laptop,
  'macos-arm64': Cpu,
}

export function Downloads() {
  const { t } = useTranslation()

  return (
    <section className='bg-muted/20 px-6 py-16 sm:py-20 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <div className='mx-auto max-w-3xl text-center'>
          <Badge variant='outline' className='mb-4'>
            {t('Ruizhi Downloads')}
          </Badge>
          <h2 className='text-foreground text-3xl font-semibold tracking-tight sm:text-4xl'>
            {t('Download Ruizhi Desktop')}
          </h2>
          <p className='text-muted-foreground mt-4 text-base sm:text-lg'>
            {t(
              'Choose the installer that matches your operating system and processor architecture.'
            )}
          </p>
        </div>

        <div className='mt-10 grid gap-4 md:grid-cols-3'>
          {RUIZHI_DOWNLOADS.map((download) => {
            const Icon = DOWNLOAD_ICONS[download.id]

            return (
              <Card
                key={download.id}
                className='border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
              >
                <CardHeader>
                  <div className='bg-primary/10 text-primary mb-4 flex size-11 items-center justify-center rounded-xl'>
                    <Icon className='size-5' aria-hidden='true' />
                  </div>
                  <CardTitle>{t(download.title)}</CardTitle>
                  <CardDescription>
                    {t(download.platform)} · {t(download.architecture)}
                  </CardDescription>
                  <CardAction>
                    <Badge variant='secondary'>
                      {download.filename.split('.').pop()}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className='flex flex-col gap-4'>
                  <p className='text-muted-foreground text-sm'>
                    {t('Installer file')}: {download.filename}
                  </p>
                  <Button
                    size='lg'
                    className='w-full'
                    render={<a href={download.href} download />}
                  >
                    <Download className='size-4' aria-hidden='true' />
                    {t('Download')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
