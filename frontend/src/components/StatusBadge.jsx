const STATUS_STYLES = {
  draft: 'bg-surface-alt text-fg-2 border border-border',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
  registered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
  waitlisted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700',
}

const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Validation',
  published: 'Published',
  cancelled: 'Cancelled',
  completed: 'Completed',
  registered: 'Registered',
  waitlisted: 'Waitlisted',
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cls = STATUS_STYLES[status] ?? 'bg-surface-alt text-fg-3 border border-border'
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${cls}`}
    >
      {label}
    </span>
  )
}
