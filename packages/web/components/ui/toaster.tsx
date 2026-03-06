"use client"

import { useEffect } from "react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useTranslations } from "next-intl"

export function Toaster() {
  const { toasts, toast } = useToast()
  const t = useTranslations()

  // Listen for global API network errors
  useEffect(() => {
    const handler = () => {
      toast({
        title: t('error.network'),
        variant: "destructive",
      })
    }
    window.addEventListener('api-network-error', handler)
    return () => window.removeEventListener('api-network-error', handler)
  }, [toast, t])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="flex flex-col items-center justify-center" />
    </ToastProvider>
  )
}
