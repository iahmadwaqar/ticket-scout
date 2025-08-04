import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast, toast, reducer } from '../use-toast'

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear any existing toasts
    act(() => {
      toast({ title: 'Clear', description: 'Clear all toasts' })
    })
  })

  describe('useToast hook', () => {
    it('should initialize with empty toasts', () => {
      const { result } = renderHook(() => useToast())
      
      expect(result.current.toasts).toEqual([])
    })

    it('should add a toast', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.toast({
          title: 'Test Toast',
          description: 'This is a test toast'
        })
      })
      
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Test Toast',
        description: 'This is a test toast',
        open: true
      })
    })

    it('should dismiss a specific toast', () => {
      const { result } = renderHook(() => useToast())
      
      let toastId: string
      
      act(() => {
        const toastResult = result.current.toast({
          title: 'Test Toast',
          description: 'This is a test toast'
        })
        toastId = toastResult.id
      })
      
      expect(result.current.toasts).toHaveLength(1)
      
      act(() => {
        result.current.dismiss(toastId)
      })
      
      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should dismiss all toasts', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.toast({ title: 'Toast 1' })
        result.current.toast({ title: 'Toast 2' })
      })
      
      expect(result.current.toasts).toHaveLength(1) // TOAST_LIMIT is 1
      
      act(() => {
        result.current.dismiss()
      })
      
      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should limit number of toasts', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.toast({ title: 'Toast 1' })
        result.current.toast({ title: 'Toast 2' })
        result.current.toast({ title: 'Toast 3' })
      })
      
      // Should only keep the most recent toast due to TOAST_LIMIT = 1
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].title).toBe('Toast 3')
    })
  })

  describe('toast function', () => {
    it('should create a toast with update and dismiss functions', () => {
      const toastResult = toast({
        title: 'Test Toast',
        description: 'Test description'
      })
      
      expect(toastResult).toHaveProperty('id')
      expect(toastResult).toHaveProperty('dismiss')
      expect(toastResult).toHaveProperty('update')
      expect(typeof toastResult.dismiss).toBe('function')
      expect(typeof toastResult.update).toBe('function')
    })

    it('should update a toast', () => {
      const { result } = renderHook(() => useToast())
      
      let toastResult: any
      
      act(() => {
        toastResult = result.current.toast({
          title: 'Original Title',
          description: 'Original description'
        })
      })
      
      act(() => {
        toastResult.update({
          title: 'Updated Title',
          description: 'Updated description'
        })
      })
      
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Updated Title',
        description: 'Updated description'
      })
    })

    it('should dismiss a toast using returned dismiss function', () => {
      const { result } = renderHook(() => useToast())
      
      let toastResult: any
      
      act(() => {
        toastResult = result.current.toast({
          title: 'Test Toast'
        })
      })
      
      expect(result.current.toasts[0].open).toBe(true)
      
      act(() => {
        toastResult.dismiss()
      })
      
      expect(result.current.toasts[0].open).toBe(false)
    })

    it('should handle toast variants', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.toast({
          title: 'Error Toast',
          description: 'This is an error',
          variant: 'destructive'
        })
      })
      
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Error Toast',
        description: 'This is an error',
        variant: 'destructive'
      })
    })

    it('should handle toast actions', () => {
      const { result } = renderHook(() => useToast())
      const mockAction = { altText: 'Undo', onClick: vi.fn() }
      
      act(() => {
        result.current.toast({
          title: 'Action Toast',
          action: mockAction as any
        })
      })
      
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Action Toast',
        action: mockAction
      })
    })
  })

  describe('reducer', () => {
    const initialState = { toasts: [] }

    it('should add a toast', () => {
      const toast = {
        id: '1',
        title: 'Test Toast',
        open: true,
        onOpenChange: vi.fn()
      }
      
      const newState = reducer(initialState, {
        type: 'ADD_TOAST',
        toast
      })
      
      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0]).toEqual(toast)
    })

    it('should update a toast', () => {
      const initialToast = {
        id: '1',
        title: 'Original',
        open: true,
        onOpenChange: vi.fn()
      }
      
      const stateWithToast = { toasts: [initialToast] }
      
      const newState = reducer(stateWithToast, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'Updated' }
      })
      
      expect(newState.toasts[0]).toMatchObject({
        id: '1',
        title: 'Updated',
        open: true
      })
    })

    it('should dismiss a specific toast', () => {
      const initialToast = {
        id: '1',
        title: 'Test',
        open: true,
        onOpenChange: vi.fn()
      }
      
      const stateWithToast = { toasts: [initialToast] }
      
      const newState = reducer(stateWithToast, {
        type: 'DISMISS_TOAST',
        toastId: '1'
      })
      
      expect(newState.toasts[0].open).toBe(false)
    })

    it('should dismiss all toasts', () => {
      const toasts = [
        { id: '1', title: 'Toast 1', open: true, onOpenChange: vi.fn() },
        { id: '2', title: 'Toast 2', open: true, onOpenChange: vi.fn() }
      ]
      
      const stateWithToasts = { toasts }
      
      const newState = reducer(stateWithToasts, {
        type: 'DISMISS_TOAST'
      })
      
      expect(newState.toasts.every(t => t.open === false)).toBe(true)
    })

    it('should remove a specific toast', () => {
      const toasts = [
        { id: '1', title: 'Toast 1', open: true, onOpenChange: vi.fn() },
        { id: '2', title: 'Toast 2', open: true, onOpenChange: vi.fn() }
      ]
      
      const stateWithToasts = { toasts }
      
      const newState = reducer(stateWithToasts, {
        type: 'REMOVE_TOAST',
        toastId: '1'
      })
      
      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0].id).toBe('2')
    })

    it('should remove all toasts', () => {
      const toasts = [
        { id: '1', title: 'Toast 1', open: true, onOpenChange: vi.fn() },
        { id: '2', title: 'Toast 2', open: true, onOpenChange: vi.fn() }
      ]
      
      const stateWithToasts = { toasts }
      
      const newState = reducer(stateWithToasts, {
        type: 'REMOVE_TOAST'
      })
      
      expect(newState.toasts).toHaveLength(0)
    })

    it('should respect toast limit when adding toasts', () => {
      const existingToast = {
        id: '1',
        title: 'Existing',
        open: true,
        onOpenChange: vi.fn()
      }
      
      const stateWithToast = { toasts: [existingToast] }
      
      const newToast = {
        id: '2',
        title: 'New Toast',
        open: true,
        onOpenChange: vi.fn()
      }
      
      const newState = reducer(stateWithToast, {
        type: 'ADD_TOAST',
        toast: newToast
      })
      
      // Should only keep 1 toast (TOAST_LIMIT = 1)
      expect(newState.toasts).toHaveLength(1)
      expect(newState.toasts[0].id).toBe('2') // New toast should be first
    })
  })

  describe('toast cleanup', () => {
    it('should handle onOpenChange callback', () => {
      const { result } = renderHook(() => useToast())
      
      act(() => {
        result.current.toast({
          title: 'Test Toast'
        })
      })
      
      const toast = result.current.toasts[0]
      expect(toast.open).toBe(true)
      
      act(() => {
        toast.onOpenChange?.(false)
      })
      
      expect(result.current.toasts[0].open).toBe(false)
    })
  })
})