export default function Spinner({ page = false }) {
  return (
    <div className={page ? 'flex min-h-[40vh] items-center justify-center' : 'flex items-center justify-center p-8'} role="status">
      <div className="spinner" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
