import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { ErrorAlert, Field } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { safeNext } from '../../lib/format'
import useDocumentTitle from '../../lib/useDocumentTitle'

const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO === 'true'
const DEMO = {
  customer: { email: 'user@shoply.dev', password: 'User123!' },
  admin: { email: 'admin@shoply.dev', password: 'Admin123!' },
}

export default function AuthPage({ mode = 'login' }) {
  const isLogin = mode === 'login'
  useDocumentTitle(isLogin ? 'Sign in' : 'Create account')
  const { login, register } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = isLogin
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password)
      notify(isLogin ? `Welcome back, ${user.name}!` : 'Your account is ready. Welcome to Shoply!')
      const fallback = user.is_admin ? '/admin' : '/'
      navigate(safeNext(searchParams.get('next'), fallback), { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not sign you in. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const nextParam = searchParams.get('next')
  const switchTo = `${isLogin ? '/register' : '/login'}${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`

  return (
    <div className="mx-auto max-w-md">
      <div className="panel shadow-sm">
        <h1 className="text-2xl font-black">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          {isLogin ? 'Sign in to continue shopping.' : 'It only takes a minute to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorAlert message={error} />
          {!isLogin && (
            <Field label="Full name">
              <input className="field" required minLength={2} maxLength={120} value={form.name} onChange={update('name')} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input className="field" type="email" required value={form.email} onChange={update('email')} autoComplete="email" />
          </Field>
          <Field label="Password">
            <input
              className="field"
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              maxLength={72}
              value={form.password}
              onChange={update('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && <span className="mt-1 block text-xs text-slate-400">At least 8 characters.</span>}
          </Field>
          <button type="submit" className="primary w-full justify-center" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <Link to={switchTo} className="mt-5 block text-center text-sm font-semibold text-brand">
          {isLogin ? 'New here? Create an account' : 'Already registered? Sign in'}
        </Link>

        {SHOW_DEMO && isLogin && (
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <p className="mb-2 font-semibold text-slate-600">Demo accounts</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="secondary !py-1.5 !text-xs" onClick={() => setForm((f) => ({ ...f, ...DEMO.customer }))}>
                Fill customer
              </button>
              <button type="button" className="secondary !py-1.5 !text-xs" onClick={() => setForm((f) => ({ ...f, ...DEMO.admin }))}>
                Fill admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
