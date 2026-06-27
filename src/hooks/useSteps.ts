import { useCallback, useEffect, useRef, useState } from 'react'

export interface StepController {
  step: number
  totalSteps: number
  next: () => void
  prev: () => void
  reset: () => void
  goTo: (n: number) => void
  playing: boolean
  play: () => void
  pause: () => void
  speed: number
  setSpeed: (s: number) => void
}

export function useSteps(totalSteps: number, onReset?: () => void): StepController {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= totalSteps - 1) {
            setPlaying(false)
            return s
          }
          return s + 1
        })
      }, 1000 / speed)
    } else {
      clearTimer()
    }
    return clearTimer
  }, [playing, speed, totalSteps])

  const next = useCallback(() => {
    setStep(s => Math.min(s + 1, totalSteps - 1))
  }, [totalSteps])

  const prev = useCallback(() => {
    setStep(s => Math.max(s - 1, 0))
  }, [])

  const reset = useCallback(() => {
    setPlaying(false)
    setStep(0)
    onReset?.()
  }, [onReset])

  const goTo = useCallback((n: number) => {
    setStep(Math.max(0, Math.min(n, totalSteps - 1)))
  }, [totalSteps])

  const play = useCallback(() => setPlaying(true), [])
  const pause = useCallback(() => setPlaying(false), [])

  return { step, totalSteps, next, prev, reset, goTo, playing, play, pause, speed, setSpeed }
}
