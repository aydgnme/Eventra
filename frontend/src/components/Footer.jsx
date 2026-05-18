export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>&copy; {new Date().getFullYear()} Eventra &mdash; University Event Management Platform</span>
        <span>Stefan cel Mare University of Suceava</span>
      </div>
    </footer>
  );
}
