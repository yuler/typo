import { AbsoluteFill, Series } from 'remotion'
import { Background } from './components'
import { Hook, HOOK_FRAMES } from './scenes/Hook'
import { Models, MODELS_FRAMES } from './scenes/Models'
import { Outro, OUTRO_FRAMES } from './scenes/Outro'
import { Refine, REFINE_FRAMES, VOICE_AT, VOICE_SECONDS } from './scenes/Refine'
import { Slash, SLASH_FRAMES } from './scenes/Slash'
import { Music } from './sound'
import { sec } from './theme'

const VOICE_START = HOOK_FRAMES + VOICE_AT

export const INTRO_FRAMES = HOOK_FRAMES + REFINE_FRAMES + SLASH_FRAMES + MODELS_FRAMES + OUTRO_FRAMES

export function Intro() {
  return (
    <AbsoluteFill>
      <Background />
      <Music frames={INTRO_FRAMES} duck={[VOICE_START, VOICE_START + sec(VOICE_SECONDS)]} />
      <Series>
        <Series.Sequence durationInFrames={HOOK_FRAMES}>
          <Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={REFINE_FRAMES}>
          <Refine />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SLASH_FRAMES}>
          <Slash />
        </Series.Sequence>
        <Series.Sequence durationInFrames={MODELS_FRAMES}>
          <Models />
        </Series.Sequence>
        <Series.Sequence durationInFrames={OUTRO_FRAMES}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  )
}
