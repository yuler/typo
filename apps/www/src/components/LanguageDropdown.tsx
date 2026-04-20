import { useEffect, useRef, useState } from 'react'

interface LanguageItem {
  code: string
  name: string
  flag: string
  href: string
  active: boolean
}

interface LanguageDropdownProps {
  items: LanguageItem[]
  ariaLabel: string
}

export default function LanguageDropdown({ items, ariaLabel }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape')
        setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white/50 text-zinc-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-zinc-900 hover:shadow-md active:scale-95 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'scale-110' : ''}`}
          aria-hidden="true"
        >
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md ring-1 ring-black/5 animate-dropdown-in dark:border-zinc-800 dark:bg-zinc-950/95"
          role="menu"
          aria-orientation="vertical"
        >
          {items.map(item => (
            <a
              key={item.code}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100'
              }`}
              role="menuitem"
              aria-current={item.active ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="flex-1 flex items-center gap-2">
                <span className="text-base leading-none select-none" aria-hidden="true">{item.flag}</span>
                <span>{item.name}</span>
              </span>
              {item.active && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-zinc-400 dark:text-zinc-500"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </a>
          ))}
        </div>
      )}

    </div>
  )
}

