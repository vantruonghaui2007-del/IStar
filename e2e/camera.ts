import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** Chromium launch options that replace the webcam with a looping MJPEG file. */
export function fakeCamera(fixture: string) {
  return {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-video-capture=${path.join(fixtures, fixture)}`,
    ],
  }
}
