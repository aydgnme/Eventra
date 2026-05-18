export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4" />
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}
