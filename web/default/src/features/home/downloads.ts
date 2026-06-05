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
export interface RuizhiDownload {
  id: 'windows-x86' | 'macos-x64' | 'macos-arm64'
  title: string
  platform: string
  architecture: string
  filename: string
  href: string
}

const RUIZHI_DOWNLOAD_BASE_PATH = '/downloads/ruizhi'

export const RUIZHI_DOWNLOADS: RuizhiDownload[] = [
  {
    id: 'windows-x86',
    title: 'Windows x86',
    platform: 'Windows',
    architecture: 'x86',
    filename: 'ruizhi-windows-x86.exe',
    href: `${RUIZHI_DOWNLOAD_BASE_PATH}/ruizhi-windows-x86.exe`,
  },
  {
    id: 'macos-x64',
    title: 'macOS x86',
    platform: 'macOS',
    architecture: 'Intel x86',
    filename: 'ruizhi-macos-x64.dmg',
    href: `${RUIZHI_DOWNLOAD_BASE_PATH}/ruizhi-macos-x64.dmg`,
  },
  {
    id: 'macos-arm64',
    title: 'macOS Apple Silicon',
    platform: 'macOS',
    architecture: 'Apple Silicon',
    filename: 'ruizhi-macos-arm64.dmg',
    href: `${RUIZHI_DOWNLOAD_BASE_PATH}/ruizhi-macos-arm64.dmg`,
  },
]
