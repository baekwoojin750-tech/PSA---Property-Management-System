import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type DialogVariant = 'info' | 'success' | 'danger' | 'warning'
type DialogMode = 'alert' | 'confirm' | 'prompt'

type DialogOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  placeholder?: string
  defaultValue?: string
}

type DialogRequest = DialogOptions & {
  mode: DialogMode
  resolve: (value: boolean | string | null) => void
}

type DialogContextValue = {
  alert: (options: DialogOptions | string) => Promise<void>
  confirm: (options: DialogOptions | string) => Promise<boolean>
  prompt: (options: DialogOptions | string) => Promise<string | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

const variantStyles: Record<DialogVariant, { icon: string; iconClass: string; buttonClass: string }> = {
  info: {
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconClass: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
    buttonClass: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40',
  },
  success: {
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconClass: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30',
  },
  danger: {
    icon: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    iconClass: 'bg-red-500/10 border-red-500/25 text-red-400',
    buttonClass: 'bg-red-600 hover:bg-red-500 shadow-red-900/30',
  },
  warning: {
    icon: 'M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z',
    iconClass: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    buttonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/20',
  },
}

const normalizeOptions = (options: DialogOptions | string): DialogOptions =>
  typeof options === 'string' ? { message: options } : options

export function GlobalDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const [promptValue, setPromptValue] = useState('')

  const openDialog = useCallback((mode: DialogMode, options: DialogOptions | string) => {
    const normalized = normalizeOptions(options)
    setPromptValue(normalized.defaultValue || '')

    return new Promise<boolean | string | null>((resolve) => {
      setDialog({
        mode,
        variant: mode === 'confirm' ? 'warning' : 'info',
        ...normalized,
        resolve,
      })
    })
  }, [])

  const api = useMemo<DialogContextValue>(() => ({
    alert: async (options) => {
      await openDialog('alert', options)
    },
    confirm: async (options) => Boolean(await openDialog('confirm', options)),
    prompt: async (options) => {
      const value = await openDialog('prompt', options)
      return typeof value === 'string' ? value : null
    },
  }), [openDialog])

  const closeDialog = (value: boolean | string | null) => {
    if (!dialog) return
    dialog.resolve(value)
    setDialog(null)
    setPromptValue('')
  }

  const variant = dialog?.variant || 'info'
  const styles = variantStyles[variant]
  const isPrompt = dialog?.mode === 'prompt'
  const showCancel = dialog?.mode !== 'alert'

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <button
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => closeDialog(dialog.mode === 'confirm' ? false : null)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#1a2744] bg-[#0d1421] shadow-2xl shadow-black/50">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-2xl border p-3 ${styles.iconClass}`}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={styles.icon} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-white">
                    {dialog.title || (dialog.mode === 'confirm' ? 'Confirm Action' : 'Notice')}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{dialog.message}</p>
                </div>
              </div>

              {isPrompt && (
                <input
                  autoFocus
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') closeDialog(promptValue)
                    if (e.key === 'Escape') closeDialog(null)
                  }}
                  placeholder={dialog.placeholder}
                  className="mt-5 w-full rounded-xl border border-[#1e2d45] bg-[#0f1623] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500"
                />
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#1a2744] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {showCancel && (
                <button
                  type="button"
                  onClick={() => closeDialog(dialog.mode === 'confirm' ? false : null)}
                  className="rounded-xl border border-[#1e2d45] px-5 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-[#1a2744] hover:text-white"
                >
                  {dialog.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => closeDialog(isPrompt ? promptValue : true)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition ${styles.buttonClass}`}
              >
                {dialog.confirmLabel || (dialog.mode === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within GlobalDialogProvider')
  }
  return context
}
