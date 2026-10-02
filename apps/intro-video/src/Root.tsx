import { Composition } from 'remotion'
import { Intro, INTRO_FRAMES } from './Intro'
import { FPS, HEIGHT, WIDTH } from './theme'

export function Root() {
  return <Composition id="Intro" component={Intro} durationInFrames={INTRO_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
}
