import { useEffect, useState, useRef } from 'react'

export function useIntersectionObserver(options = {}) {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options
  // Prefer reduced motion: show content immediately (no reveal choreography).
  const [hasIntersected, setHasIntersected] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const elementRef = useRef(null)

  useEffect(() => {
    if (hasIntersected) return

    const currentElement = elementRef.current
    if (!currentElement) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true)
          if (triggerOnce) {
            observer.unobserve(currentElement)
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(currentElement)

    return () => {
      if (currentElement && !triggerOnce) {
        observer.unobserve(currentElement)
      }
    }
  }, [threshold, rootMargin, triggerOnce, hasIntersected])

  return [elementRef, hasIntersected]
}
