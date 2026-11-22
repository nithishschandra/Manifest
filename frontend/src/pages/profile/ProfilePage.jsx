import { useState } from 'react'
import api, { getErrorMessage } from '../../api/client'
import { ErrorAlert, Field, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function ProfilePage() {
  useDocumentTitle('My profile')
  const { user, updateUser } = useAuth()
  const { notify } = useToast()
  const [name, setName] = useState(user?.name || '')
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' })
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [nameError, setNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function saveName(e) {
    e.preventDefault()
    setNameError('')
    setSavingName(true)
    try {
      const { data } = await api.put('/profile', { name })
      updateUser(data)
      notify('Profile updated')
    } catch (err) {
      setNameError(getErrorMessage(err))
    } finally {
      setSavingName(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPasswordError('')
    if (passwords.new_password !== passwords.confirm) {
      setPasswordError('The new passwords do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await api.put('/profile', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      })
      setPasswords({ current_password: '', new_password: '', confirm: '' })
      notify('Password changed')
    } catch (err) {
      setPasswordError(getErrorMessage(err))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      <PageHeader title="My profile" subtitle="Manage your account details." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <h2 className="font-black">Account details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-slate-400">Email</dt><dd className="font-semibold">{user?.email}</dd></div>
            <div><dt className="text-slate-400">Account type</dt><dd className="font-semibold">{user?.is_admin ? 'Administrator' : 'Customer'}</dd></div>
            {user?.created_at && (
              <div><dt className="text-slate-400">Member since</dt><dd className="font-semibold">{new Date(user.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}</dd></div>
            )}
          </dl>
          <form onSubmit={saveName} className="mt-6 space-y-4">
            <ErrorAlert message={nameError} />
            <Field label="Display name">
              <input className="field" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <button className="primary" disabled={savingName || name.trim() === user?.name}>
              {savingName ? 'Saving…' : 'Save name'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2 className="font-black">Change password</h2>
          <form onSubmit={savePassword} className="mt-4 space-y-4">
            <ErrorAlert message={passwordError} />
            <Field label="Current password">
              <input className="field" type="password" required value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input className="field" type="password" required minLength={8} maxLength={72} value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input className="field" type="password" required minLength={8} maxLength={72} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} autoComplete="new-password" />
            </Field>
            <button className="primary" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </>
  )
}
