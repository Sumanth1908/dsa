import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

// Email: "WIN $500 NOW!!! Click here: bit.ly/prize  — from unknown sender"
const INPUTS = [
  { label: 'Word count', value: 0.72, raw: '150 words (high)' },
  { label: 'Link count', value: 0.90, raw: '5 links (very high)' },
  { label: 'CAPS ratio', value: 0.60, raw: '60% capitals' },
  { label: 'Unknown sender', value: 1.00, raw: 'not in contacts' },
]

// Pre-computed hidden layer activations (ReLU applied)
const HIDDEN = [0.82, 0.45, 0.91, 0.23, 0.67]
const HIDDEN_LABELS = ['h₁', 'h₂', 'h₃', 'h₄', 'h₅']

// Output: softmax
const OUTPUTS = [{ label: 'Spam', value: 0.87, color: '#ef4444' }, { label: 'Ham', value: 0.13, color: '#22c55e' }]

interface Step {
  phase: 'idle' | 'input' | 'hidden' | 'output' | 'done'
  activeInputs: number
  activeHidden: number
  showOutput: boolean
  message: string
}

const nnSteps = (): Step[] => [
  { phase: 'idle', activeInputs: 0, activeHidden: 0, showOutput: false, message: 'Spam email arrives: "WIN $500 NOW!!! Click here: bit.ly/prize". Extracting 4 features...' },
  { phase: 'input', activeInputs: 1, activeHidden: 0, showOutput: false, message: 'Input 1 — Word count: 150 words → normalised to 0.72. High volume is a mild spam signal.' },
  { phase: 'input', activeInputs: 2, activeHidden: 0, showOutput: false, message: 'Input 2 — Link count: 5 external links → 0.90. Many links in short emails are a strong spam signal.' },
  { phase: 'input', activeInputs: 3, activeHidden: 0, showOutput: false, message: 'Input 3 — CAPS ratio: 60% uppercase → 0.60. Shouting like "WIN NOW!!!" is a classic spam pattern.' },
  { phase: 'input', activeInputs: 4, activeHidden: 0, showOutput: false, message: 'Input 4 — Unknown sender: 1.0. Not in contacts and domain never seen before.' },
  { phase: 'hidden', activeInputs: 4, activeHidden: 1, showOutput: false, message: 'Propagating to hidden layer. h₁ = ReLU(w₁·x₁ + w₂·x₂ + … + bias) = ReLU(1.04) = 0.82' },
  { phase: 'hidden', activeInputs: 4, activeHidden: 3, showOutput: false, message: 'h₂ = 0.45, h₃ = 0.91. Node h₃ strongly activates — it learned to detect link-spam patterns.' },
  { phase: 'hidden', activeInputs: 4, activeHidden: 5, showOutput: false, message: 'All 5 hidden nodes computed. Nodes 1, 3, 5 fire strongly on this email\'s feature combination.' },
  { phase: 'output', activeInputs: 4, activeHidden: 5, showOutput: true, message: 'Output layer: softmax([spam_logit, ham_logit]) = [0.87, 0.13]. Prediction: SPAM (87% confidence).' },
  { phase: 'done', activeInputs: 4, activeHidden: 5, showOutput: true, message: '✓ Email classified as spam with 87% confidence and moved to junk folder.' },
]

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python (PyTorch)',
    code: `import torch
import torch.nn as nn

class SpamClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(4, 5),   # input(4) → hidden(5)
            nn.ReLU(),
            nn.Linear(5, 2),   # hidden(5) → output(2)
            nn.Softmax(dim=1)
        )

    def forward(self, x):
        return self.network(x)

model = SpamClassifier()

# Feature vector: [word_count, link_count, caps_ratio, unknown_sender]
email_features = torch.tensor([[0.72, 0.90, 0.60, 1.00]])
probs = model(email_features)  # shape: [1, 2]
label = "SPAM" if probs[0][0] > 0.5 else "HAM"
print(f"{label} — {probs[0][0]:.0%} confidence")`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (TensorFlow.js)',
    code: `import * as tf from '@tensorflow/tfjs'

const model = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [4], units: 5, activation: 'relu' }),
    tf.layers.dense({ units: 2, activation: 'softmax' }),
  ]
})

model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] })

// Run inference on a single email
const features = tf.tensor2d([[0.72, 0.90, 0.60, 1.00]])
const prediction = model.predict(features)
prediction.print() // e.g. [[0.87, 0.13]]`,
  },
]

const NODE_R = 18
const INPUT_X = 80
const HIDDEN_X = 240
const OUTPUT_X = 400
const SVG_H = 300
const inputY = (i: number) => 40 + i * (SVG_H - 80) / 3
const hiddenY = (i: number) => 30 + i * (SVG_H - 60) / 4
const outputY = (i: number) => SVG_H / 2 - 30 + i * 60

export default function NeuralNetworksVisualizer() {
  const steps = nnSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const inputActive = (i: number) => i < cur.activeInputs
  const hiddenActive = (i: number) => i < cur.activeHidden

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Neural Networks — Forward Pass</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Watch a 3-layer spam classifier evaluate one email, activation by activation</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Email: <em>"WIN $500 NOW!!! Click here: bit.ly/prize"</em> from an unknown sender.
          Our spam classifier extracts 4 numerical features, passes them through a hidden layer of 5 neurons (ReLU activation),
          then produces spam/ham probabilities via softmax. No rules, no keyword lists — just learned weights from 50,000 training examples.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">How it learns</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Training: feed 50,000 labelled emails → compare output to correct label → compute loss → backpropagate error → adjust weights.
          After training, the hidden layer neurons specialise: h₃ may learn to detect "many-links-in-short-email", h₅ may detect "all-caps + unknown sender".
          Each weight encodes one dimension of the pattern.
        </p>
      </div>

      <div className="viz-container p-6 space-y-4">
        <svg viewBox={`0 0 480 ${SVG_H}`} className="w-full">
          {/* Edges: input → hidden */}
          {INPUTS.map((_, i) => HIDDEN.map((__, j) => (
            <line key={`ih-${i}-${j}`}
              x1={INPUT_X + NODE_R} y1={inputY(i)} x2={HIDDEN_X - NODE_R} y2={hiddenY(j)}
              stroke={inputActive(i) && hiddenActive(j) ? '#6366f1' : '#e2e8f0'}
              strokeWidth={inputActive(i) && hiddenActive(j) ? 1.5 : 0.8}
              strokeOpacity={inputActive(i) && hiddenActive(j) ? 0.7 : 1}
              className="dark:[stroke:#334155] transition-all duration-300"
            />
          )))}

          {/* Edges: hidden → output */}
          {HIDDEN.map((_, j) => OUTPUTS.map((__, k) => (
            <line key={`ho-${j}-${k}`}
              x1={HIDDEN_X + NODE_R} y1={hiddenY(j)} x2={OUTPUT_X - NODE_R} y2={outputY(k)}
              stroke={hiddenActive(j) && cur.showOutput ? '#f59e0b' : '#e2e8f0'}
              strokeWidth={hiddenActive(j) && cur.showOutput ? 1.5 : 0.8}
              strokeOpacity={hiddenActive(j) && cur.showOutput ? 0.7 : 1}
              className="dark:[stroke:#334155] transition-all duration-300"
            />
          )))}

          {/* Input nodes */}
          {INPUTS.map((inp, i) => (
            <g key={`input-${i}`} className="transition-all duration-300">
              <circle cx={INPUT_X} cy={inputY(i)} r={NODE_R}
                fill={inputActive(i) ? '#6366f1' : '#f1f5f9'}
                stroke={inputActive(i) ? '#4f46e5' : '#cbd5e1'}
                strokeWidth="2"
                className="dark:fill-slate-800 dark:stroke-slate-600 transition-all duration-300"
              />
              <text x={INPUT_X} y={inputY(i)} textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="600"
                fill={inputActive(i) ? 'white' : '#64748b'}>
                {inputActive(i) ? inp.value.toFixed(2) : '?'}
              </text>
              <text x={INPUT_X - NODE_R - 4} y={inputY(i)} textAnchor="end" dominantBaseline="middle"
                fontSize="8.5" fill="#94a3b8">
                {inp.label}
              </text>
            </g>
          ))}

          {/* Hidden nodes */}
          {HIDDEN.map((val, j) => (
            <g key={`h-${j}`} className="transition-all duration-300">
              <circle cx={HIDDEN_X} cy={hiddenY(j)} r={NODE_R}
                fill={hiddenActive(j) ? '#7c3aed' : '#f1f5f9'}
                stroke={hiddenActive(j) ? '#6d28d9' : '#cbd5e1'}
                strokeWidth="2"
                className="dark:fill-slate-800 dark:stroke-slate-600 transition-all duration-300"
              />
              <text x={HIDDEN_X} y={hiddenY(j)} textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="600"
                fill={hiddenActive(j) ? 'white' : '#94a3b8'}>
                {hiddenActive(j) ? val.toFixed(2) : HIDDEN_LABELS[j]}
              </text>
            </g>
          ))}

          {/* Output nodes */}
          {OUTPUTS.map((out, k) => (
            <g key={`out-${k}`} className="transition-all duration-300">
              <circle cx={OUTPUT_X} cy={outputY(k)} r={NODE_R + 2}
                fill={cur.showOutput ? out.color : '#f1f5f9'}
                stroke={cur.showOutput ? out.color : '#cbd5e1'}
                strokeWidth="2" fillOpacity={cur.showOutput ? 0.9 : 1}
                className="dark:fill-slate-800 dark:stroke-slate-600 transition-all duration-300"
              />
              <text x={OUTPUT_X} y={outputY(k)} textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="700"
                fill={cur.showOutput ? 'white' : '#94a3b8'}>
                {cur.showOutput ? `${Math.round(out.value * 100)}%` : out.label}
              </text>
              <text x={OUTPUT_X + NODE_R + 6} y={outputY(k)} textAnchor="start" dominantBaseline="middle"
                fontSize="9" fontWeight="600" fill={cur.showOutput ? out.color : '#94a3b8'}>
                {out.label}
              </text>
            </g>
          ))}

          {/* Layer labels */}
          <text x={INPUT_X} y={SVG_H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">Input (4)</text>
          <text x={HIDDEN_X} y={SVG_H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">Hidden (5) ReLU</text>
          <text x={OUTPUT_X} y={SVG_H - 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">Output (2) Softmax</text>
        </svg>

        {/* Feature detail */}
        {cur.activeInputs > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INPUTS.slice(0, cur.activeInputs).map((inp, i) => (
              <div key={i} className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-2 text-center">
                <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{inp.label}</div>
                <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{inp.value.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">{inp.raw}</div>
              </div>
            ))}
          </div>
        )}

        {/* Message */}
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {cur.message}
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
