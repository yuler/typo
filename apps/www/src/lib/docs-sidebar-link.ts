export function docsSidebarLinkClass(active: boolean) {
  return [
    'block rounded-none border-l-2 py-2 pl-3 pr-2 text-base transition-colors',
    active
      ? 'border-zinc-900 bg-zinc-200/90 font-medium text-zinc-950 dark:border-zinc-100 dark:bg-zinc-800/90 dark:text-zinc-50'
      : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
  ]
}
