import { useEffect } from 'react'
import { useToast } from './use-toast.js'

/**
 * Hook to listen for toast notifications from the main process
 * and display them using the existing toast system
 */
export function useToastIPC() {
  const { toast } = useToast()

  useEffect(() => {
    // Listen for toast notifications from main process
    const unsubscribe = window.api.onToastReceived((toastMessage) => {
      // Display the toast using the existing toast system
      toast({
        title: toastMessage.title,
        description: toastMessage.description,
        variant: toastMessage.variant || 'default',
        duration: toastMessage.duration
      })
    })

    // Cleanup listener on unmount
    return unsubscribe
  }, [toast])
}