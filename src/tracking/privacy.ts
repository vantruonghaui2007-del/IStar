/**
 * Wraps fetch so only same-origin URLs load. The hand worker uses it so the
 * only network traffic it can make is fetching its own model and WASM;
 * MediaPipe's built-in usage logging to Google (odml.pa.googleapis.com) is
 * refused before any request leaves the device.
 */
export function sameOriginFetch(inner: typeof fetch, origin: string, onBlocked: (host: string) => void = () => undefined): typeof fetch {
  return (input, init) => {
    const raw = input instanceof Request ? input.url : String(input)
    const url = new URL(raw, origin)
    if (url.origin !== origin) {
      onBlocked(url.host)
      return Promise.reject(new TypeError(`Đã chặn yêu cầu mạng tới ${url.host}: dữ liệu chỉ được xử lý trên máy này.`))
    }
    return inner(input, init)
  }
}
