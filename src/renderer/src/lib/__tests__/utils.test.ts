import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden')
      expect(result).toBe('base conditional')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'valid')
      expect(result).toBe('base valid')
    })

    it('should handle empty strings', () => {
      const result = cn('base', '', 'valid')
      expect(result).toBe('base valid')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true
      })
      expect(result).toBe('class1 class3')
    })

    it('should merge Tailwind classes correctly', () => {
      // This tests the tailwind-merge functionality
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4') // px-4 should override px-2
    })

    it('should handle complex class merging scenarios', () => {
      const result = cn(
        'bg-red-500 text-white',
        'bg-blue-500', // Should override bg-red-500
        'hover:bg-green-500'
      )
      expect(result).toBe('text-white bg-blue-500 hover:bg-green-500')
    })

    it('should handle variant-based class merging', () => {
      const variant = 'destructive'
      const result = cn(
        'inline-flex items-center justify-center',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground',
        variant === 'outline' && 'border border-input bg-background'
      )
      expect(result).toBe('inline-flex items-center justify-center bg-destructive text-destructive-foreground')
    })

    it('should handle responsive classes', () => {
      const result = cn('w-full', 'md:w-1/2', 'lg:w-1/3')
      expect(result).toBe('w-full md:w-1/2 lg:w-1/3')
    })

    it('should handle state-based classes', () => {
      const isActive = true
      const isDisabled = false
      
      const result = cn(
        'button-base',
        isActive && 'active',
        isDisabled && 'disabled',
        !isDisabled && 'enabled'
      )
      expect(result).toBe('button-base active enabled')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle single class input', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })

    it('should deduplicate identical classes', () => {
      const result = cn('class1', 'class2', 'class1', 'class3', 'class2')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle mixed input types', () => {
      const result = cn(
        'base',
        ['array1', 'array2'],
        { 'object1': true, 'object2': false },
        'string',
        true && 'conditional',
        false && 'hidden'
      )
      expect(result).toBe('base array1 array2 object1 string conditional')
    })
  })
})