import React, { useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import type { StepController } from '@/hooks/useSteps'

interface StepControlsProps {
  ctrl: StepController
  className?: string
}

const SPEEDS = [0.5, 1, 1.5, 2]

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

export default function StepControls({ ctrl, className = '' }: StepControlsProps) {
  const { step, totalSteps, next, prev, reset, playing, play, pause, speed, setSpeed } = ctrl

  // Keyboard shortcuts: ← previous, → next, space play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === ' ') {
        e.preventDefault()
        if (playing) pause()
        else if (step < totalSteps - 1) play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, play, pause, playing, step, totalSteps])

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <div className="flex items-center gap-1">
        <button
          onClick={reset}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Reset"
          aria-label="Reset"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={prev}
          disabled={step === 0}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous step (←)"
          aria-label="Previous step"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={playing ? pause : play}
          disabled={step >= totalSteps - 1 && !playing}
          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={playing ? 'Pause (space)' : 'Play (space)'}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={next}
          disabled={step >= totalSteps - 1}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next step (→)"
          aria-label="Next step"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Step counter */}
      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
        {step + 1} / {totalSteps}
      </span>

      {/* Keyboard hint */}
      <span className="hidden md:inline text-xs text-slate-300 dark:text-slate-600 select-none" aria-hidden="true">
        ← → space
      </span>

      {/* Speed */}
      <div className="flex items-center gap-1 ml-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">Speed:</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
              speed === s
                ? 'bg-violet-600 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full mt-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-300"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
