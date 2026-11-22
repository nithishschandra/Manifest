import { Link } from 'react-router-dom'
import { STATUS_STYLES } from '../lib/format'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
      {Icon && <Icon size={34} className="mb-3 text-slate-300" />}
      <h2 className="font-bold">{title}</h2>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="primary mt-5">{actionLabel}</Link>
      )}
    </div>
  )
}

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || 'badge-slate'}`}>{status}</span>
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="alert alert-error flex items-center justify-between gap-3" role="alert">
      <span>{message}</span>
      {onRetry && <button className="font-bold underline" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Field({ label, children, error }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}
