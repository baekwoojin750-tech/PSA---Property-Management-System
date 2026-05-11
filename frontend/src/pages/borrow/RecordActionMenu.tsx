import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type MenuPosition = {
  top: number
  left: number
}

type RecordActionMenuProps = {
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: ReactNode
}

export function RecordActionMenu({ open, onToggle, onClose, children }: RecordActionMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const menuWidth = 128
    const menuHeight = 78
    const gap = 6
    const padding = 8
    const top = rect.bottom + gap + menuHeight > window.innerHeight
      ? Math.max(padding, rect.top - menuHeight - gap)
      : rect.bottom + gap

    setPosition({
      top,
      left: Math.min(
        window.innerWidth - menuWidth - padding,
        Math.max(padding, rect.right - menuWidth),
      ),
    })
  }

  useLayoutEffect(() => {
    if (open) updatePosition()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      onClose()
    }

    const handleReposition = () => updatePosition()

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [open, onClose])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-[#1a2744] transition"
        aria-label="Record actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] w-32 overflow-hidden rounded-xl border border-[#1a2744] bg-[#0f1c35] shadow-2xl shadow-black/40"
          style={{ top: position.top, left: position.left }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}
