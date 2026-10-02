import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono'

export const { fontFamily: sans } = loadInter('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] })
export const { fontFamily: mono } = loadMono('normal', { weights: ['400', '600', '700'], subsets: ['latin'] })

export const FPS = 60
export const WIDTH = 1920
export const HEIGHT = 1080

export const color = {
  text: '#11161c',
  brand: '#ff1018',
  secondary: '#52525b',
  muted: '#a1a1aa',
  bg: '#ffffff',
  bg2: '#fafafa',
  border: '#e4e4e7',
  accent: '#3b82f6',
  selection: 'rgba(59,130,246,0.22)',
  green: '#22c55e',
  red: '#ef4444',
  capsule: '#262626',
  capsuleRing: '#343434',
  capsuleBorder: 'rgba(255,255,255,0.1)',
  capsuleBlue: '#60a5fa',
  capsuleBlueText: 'rgba(219,234,254,0.9)',
  capsuleGreen: '#4ade80',
}

export const sec = (s: number) => Math.round(s * FPS)
