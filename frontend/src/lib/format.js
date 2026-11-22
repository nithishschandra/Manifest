const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const money = (value) => inr.format(Number(value || 0))

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''

export const STATUS_STYLES = {
  Processing: 'badge-amber',
  Shipped: 'badge-blue',
  Delivered: 'badge-green',
  Cancelled: 'badge-red',
}

// Inline placeholder so products without an image never make an external request.
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><rect width='100%25' height='100%25' fill='%23eef0ff'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='28' fill='%23635bff'>Shoply</text></svg>"

/** Only allow in-app redirects such as /checkout, never external URLs. */
export function safeNext(value, fallback = '/') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}
