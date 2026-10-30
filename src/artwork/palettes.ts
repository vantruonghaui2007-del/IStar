import type { PaletteId } from './types'

export type Palette = {
  id: PaletteId
  name: string
  stem: string
  leaves: string[]
  petals: string[]
  center: string
  /** Fireflies drift around flowers when set. */
  glow?: string
}

export const PALETTES: Record<PaletteId, Palette> = {
  'vuon-xuan': {
    id: 'vuon-xuan',
    name: 'Vườn xuân',
    stem: '#3b6a48',
    leaves: ['#78a565', '#5d8f55', '#97bb78'],
    petals: ['#e07a6b', '#ec9c8c', '#d9675e'],
    center: '#e9b949',
  },
  'hoang-hon': {
    id: 'hoang-hon',
    name: 'Hoàng hôn',
    stem: '#6a4a3e',
    leaves: ['#b08a4f', '#94794a', '#c9a062'],
    petals: ['#e2704e', '#f09c62', '#d65a5a'],
    center: '#f3c76b',
  },
  'dem-dom-dom': {
    id: 'dem-dom-dom',
    name: 'Đêm đom đóm',
    stem: '#2e5953',
    leaves: ['#5e9c8b', '#477f72', '#7db2a0'],
    petals: ['#a993d1', '#cdb2e0', '#8f7cc4'],
    center: '#f2dc6d',
    glow: '#f0bf2e',
  },
}

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[]

export const isPaletteId = (value: unknown): value is PaletteId => typeof value === 'string' && value in PALETTES
