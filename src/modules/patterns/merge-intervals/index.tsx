import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface Interval { start: number; end: number }
interface Step {
  sorted: Interval[]
  merged: Interval[]
  current: number
  comparing: number
  action: 'sort' | 'check' | 'merge' | 'add' | 'done'
  message: string
}

function mergeSteps(intervals: Interval[]): Step[] {
  const steps: Step[] = []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)

  steps.push({ sorted: [...intervals], merged: [], current: 0, comparing: -1, action: 'sort', message: `Sort ${intervals.length} intervals by start time.` })
  steps.push({ sorted, merged: [], current: 0, comparing: -1, action: 'sort', message: `Sorted: ${sorted.map(i => `[${i.start},${i.end}]`).join(' ')}` })

  const merged: Interval[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (merged.length === 0) {
      merged.push({ ...sorted[i] })
      steps.push({ sorted, merged: [...merged], current: i, comparing: -1, action: 'add', message: `Add first interval [${sorted[i].start},${sorted[i].end}] to result` })
      continue
    }
    const last = merged[merged.length - 1]
    steps.push({ sorted, merged: [...merged], current: i, comparing: merged.length - 1, action: 'check', message: `Compare [${sorted[i].start},${sorted[i].end}] with last merged [${last.start},${last.end}]` })

    if (sorted[i].start <= last.end) {
      const newEnd = Math.max(last.end, sorted[i].end)
      const msg = sorted[i].end > last.end
        ? `Overlap! Extend last interval to [${last.start},${newEnd}]`
        : `Contained — [${sorted[i].start},${sorted[i].end}] is inside [${last.start},${last.end}]. No change.`
      last.end = newEnd
      steps.push({ sorted, merged: merged.map(m => ({ ...m })), current: i, comparing: merged.length - 1, action: 'merge', message: msg })
    } else {
      merged.push({ ...sorted[i] })
      steps.push({ sorted, merged: [...merged], current: i, comparing: -1, action: 'add', message: `No overlap. Add [${sorted[i].start},${sorted[i].end}] as new interval.` })
    }
  }
  steps.push({ sorted, merged: [...merged], current: -1, comparing: -1, action: 'done', message: `Done! ${intervals.length} intervals merged into ${merged.length}.` })
  return steps
}

// Meetings booked as time blocks (0–20 scale = 9am–5pm in half-hour units)
const PRESET_INTERVALS: Interval[][] = [
  [{ start: 1, end: 4 }, { start: 3, end: 7 }, { start: 9, end: 11 }, { start: 10, end: 13 }, { start: 16, end: 18 }],
  [{ start: 2, end: 5 }, { start: 4, end: 6 }, { start: 1, end: 3 }, { start: 8, end: 12 }, { start: 11, end: 15 }, { start: 17, end: 19 }],
  [{ start: 1, end: 8 }, { start: 3, end: 6 }, { start: 5, end: 10 }, { start: 9, end: 14 }, { start: 13, end: 17 }],
]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `// Merge Intervals — O(n log n) time, O(n) space
function merge(intervals) {
  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      // Overlapping — extend the last interval
      last[1] = Math.max(last[1], end);
    } else {
      // No overlap — add new interval
      merged.push([start, end]);
    }
  }
  return merged;
}

// Related: Insert Interval
function insert(intervals, newInterval) {
  const result = [];
  let i = 0;
  // Add all intervals that end before newInterval starts
  while (i < intervals.length && intervals[i][1] < newInterval[0])
    result.push(intervals[i++]);
  // Merge overlapping intervals
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval);
  while (i < intervals.length) result.push(intervals[i++]);
  return result;
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `# Merge Intervals — O(n log n)
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for start, end in intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            # Overlap — extend
            last[1] = max(last[1], end)
        else:
            # No overlap — new interval
            merged.append([start, end])
    return merged

# Meeting Rooms: can one person attend all?
def can_attend_all(intervals):
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i-1][1]:
            return False  # overlap — conflict!
    return True

# Minimum meeting rooms needed
import heapq
def min_meeting_rooms(intervals):
    intervals.sort(key=lambda x: x[0])
    heap = []  # end times
    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heapreplace(heap, end)
        else:
            heapq.heappush(heap, end)
    return len(heap)`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `// Merge Intervals — O(n log n)
public int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
    List<int[]> merged = new ArrayList<>();
    merged.add(intervals[0]);

    for (int i = 1; i < intervals.length; i++) {
        int[] last = merged.get(merged.size() - 1);
        if (intervals[i][0] <= last[1]) {
            // Overlap — extend
            last[1] = Math.max(last[1], intervals[i][1]);
        } else {
            // No overlap — new interval
            merged.add(intervals[i]);
        }
    }
    return merged.toArray(new int[0][]);
}`,
  },
]

const AXIS_MIN = 0
const AXIS_MAX = 20
const AXIS_W = 500

function intervalX(v: number) { return (v - AXIS_MIN) / (AXIS_MAX - AXIS_MIN) * AXIS_W }

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899']

export default function MergeIntervalsVisualizer() {
  const [preset, setPreset] = useState(0)
  const intervals = PRESET_INTERVALS[preset]
  const steps = mergeSteps(intervals)
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const ACTION_STYLE: Record<string, string> = {
    sort:  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    check: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    merge: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    add:   'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    done:  'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Merge Intervals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sort by start time, then greedily absorb any booking that overlaps the previous one</p>
        </div>
        <ComplexityBadge time="O(n log n)" space="O(n)" />
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A smart calendar app receives meeting bookings in any order. Before showing you your "free time" windows it needs to merge all overlapping bookings into contiguous busy blocks.
          Bookings come in unsorted — step 1 is always sorting by start time. After that, a single scan is enough: if the next booking starts before the current one ends, extend the current block; otherwise, start a new one.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How to recognise this pattern</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Problem gives you a list of <strong>ranges/intervals</strong> and asks for overlapping ones to be combined, or asks to count conflicts, or find free time.
          Key test: <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded text-xs">next.start ≤ last.end</code> → overlap, extend last.
          Classic variants: Meeting Rooms I & II (can attend all? / min rooms needed), Insert Interval, Employee Free Time.
        </p>
      </div>

      <div className="flex gap-2">
        {PRESET_INTERVALS.map((_, i) => (
          <button key={i} onClick={() => { setPreset(i); ctrl.reset() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              preset === i ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            Calendar {i + 1}
          </button>
        ))}
      </div>

      <div className="viz-container p-6 space-y-6">
        {/* Axis labels */}
        <div className="relative" style={{ paddingLeft: 80 }}>
          <div className="text-xs text-slate-500 font-semibold mb-2">Meetings (unsorted)</div>
          {intervals.map((iv, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400 w-16 text-right font-mono">[{iv.start},{iv.end}]</span>
              <div className="relative flex-1 h-6">
                <div className="absolute top-1 h-4 rounded-full opacity-70"
                  style={{ left: `${intervalX(iv.start)}px`, width: `${intervalX(iv.end) - intervalX(iv.start)}px`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          ))}

          {/* Axis */}
          <div className="flex items-center gap-0 mt-1">
            <span className="text-xs text-slate-400 w-16 text-right">0</span>
            <div className="flex-1 relative h-4">
              <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-slate-300 dark:bg-slate-700" />
              {Array.from({ length: AXIS_MAX + 1 }, (_, v) => v % 5 === 0 && (
                <div key={v} className="absolute top-0" style={{ left: `${intervalX(v)}px` }}>
                  <div className="h-2 w-0.5 bg-slate-400" />
                  <span className="text-xs text-slate-400 absolute -translate-x-1/2 top-2">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sorted intervals */}
        {cur.action !== 'sort' || ctrl.step > 1 ? (
          <div className="relative" style={{ paddingLeft: 80 }}>
            <div className="text-xs text-slate-500 font-semibold mb-2">Sorted → Merged Busy Blocks</div>
            {cur.merged.map((iv, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 w-16 text-right font-mono font-bold">[{iv.start},{iv.end}]</span>
                <div className="relative flex-1 h-6">
                  <div className="absolute top-1 h-4 rounded-full bg-emerald-400 dark:bg-emerald-600 transition-all duration-300"
                    style={{ left: `${intervalX(iv.start)}px`, width: `${Math.max(intervalX(iv.end) - intervalX(iv.start), 6)}px` }} />
                </div>
              </div>
            ))}
            {cur.merged.length === 0 && <div className="text-xs text-slate-400 ml-0">none yet</div>}
          </div>
        ) : null}

        {/* Message */}
        <div className="flex flex-col items-center gap-2">
          <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${ACTION_STYLE[cur.action]}`}>{cur.action}</span>
          <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-center">
            {cur.message}
          </p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
