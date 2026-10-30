export type CameraErrorKind = 'denied' | 'missing' | 'busy' | 'unsupported' | 'unknown'

export function cameraErrorKind(error: unknown): CameraErrorKind {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unknown'
}

const messages: Record<CameraErrorKind, string> = {
  denied: 'Bạn chưa cấp quyền camera. Bấm biểu tượng camera trên thanh địa chỉ, chọn Cho phép rồi bấm Thử lại — hoặc vẽ bằng chuột.',
  missing: 'Không tìm thấy camera trên thiết bị này. Hãy cắm webcam rồi bấm Thử lại — hoặc vẽ bằng chuột.',
  busy: 'Camera đang được ứng dụng khác sử dụng (Zoom, Teams, Meet…). Hãy đóng ứng dụng đó rồi bấm Thử lại — hoặc vẽ bằng chuột.',
  unsupported: 'Trình duyệt không mở được camera. Hãy dùng Chrome hoặc Edge qua HTTPS hoặc localhost — trong lúc đó bạn vẫn vẽ được bằng chuột.',
  unknown: 'Không mở được camera. Bấm Thử lại sau giây lát — hoặc vẽ bằng chuột.',
}

export function cameraErrorMessage(kind: CameraErrorKind): string {
  return messages[kind]
}

export class CameraError extends Error {
  readonly kind: CameraErrorKind
  constructor(kind: CameraErrorKind, cause?: unknown) {
    super(cameraErrorMessage(kind), { cause })
    this.name = 'CameraError'
    this.kind = kind
  }
}

/** Opens the webcam (≈640×480, front-facing). Must be called from a user gesture. */
export async function openCamera(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported')
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: 'user' },
    })
  } catch (error) {
    throw new CameraError(cameraErrorKind(error), error)
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach(track => track.stop())
}
