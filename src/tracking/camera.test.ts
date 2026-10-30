import { describe, expect, it } from 'vitest'
import { cameraErrorKind, cameraErrorMessage } from './camera'

const domError = (name: string) => Object.assign(new Error(name), { name })

describe('camera errors', () => {
  it('classifies the browser errors the studio must explain', () => {
    expect(cameraErrorKind(domError('NotAllowedError'))).toBe('denied')
    expect(cameraErrorKind(domError('SecurityError'))).toBe('denied')
    expect(cameraErrorKind(domError('NotFoundError'))).toBe('missing')
    expect(cameraErrorKind(domError('OverconstrainedError'))).toBe('missing')
    expect(cameraErrorKind(domError('NotReadableError'))).toBe('busy')
    expect(cameraErrorKind(domError('AbortError'))).toBe('busy')
    expect(cameraErrorKind(new Error('boom'))).toBe('unknown')
    expect(cameraErrorKind('weird')).toBe('unknown')
  })

  it('gives a Vietnamese message with a way forward for each case', () => {
    expect(cameraErrorMessage('denied')).toMatch(/quyền camera/)
    expect(cameraErrorMessage('missing')).toMatch(/Không tìm thấy camera/)
    expect(cameraErrorMessage('busy')).toMatch(/ứng dụng khác/)
    expect(cameraErrorMessage('unsupported')).toMatch(/HTTPS/)
    for (const kind of ['denied', 'missing', 'busy', 'unsupported', 'unknown'] as const) expect(cameraErrorMessage(kind)).toMatch(/chuột/)
  })
})
