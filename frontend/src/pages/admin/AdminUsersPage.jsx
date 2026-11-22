import { useEffect, useState } from 'react'
import api, { getErrorMessage } from '../../api/client'
import Spinner from '../../components/Spinner'
import { ErrorAlert } from '../../components/ui'
import useDocumentTitle from '../../lib/useDocumentTitle'

export default function AdminUsersPage() {
  useDocumentTitle('Admin · Customers')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/admin/users')
      .then((r) => setUsers(r.data))
      .catch((e) => setError(getErrorMessage(e, 'Could not load customers.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b p-5">
        <h2 className="font-black">Customers</h2>
        <span className="text-sm text-slate-500">{users.length} accounts</span>
      </div>
      <ErrorAlert message={error} />
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>{u.is_admin ? <span className="badge badge-blue">Admin</span> : <span className="badge badge-slate">Customer</span>}</td>
                  <td className="text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
