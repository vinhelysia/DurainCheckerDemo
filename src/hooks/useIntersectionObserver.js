import { useEffect, useState, useRef } from 'react'

export function useIntersectionObserver(options = {}) {
  const { threshold = 0.15, rootMargin = '0px', triggerOnce = true } = options
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef(null)

  useEffect(() => {
    const currentElement = elementRef.current
    if (!currentElement || hasIntersected) return

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
