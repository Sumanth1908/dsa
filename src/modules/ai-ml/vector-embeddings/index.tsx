import React, { useState } from 'react'
import CodeBlock from '@/components/shared/CodeBlock'

const CLUSTERS = {
  auth: { label: 'Account / Auth', color: '#6366f1', bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
  weather: { label: 'Weather', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  cooking: { label: 'Cooking / Recipes', color: '#22c55e', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
}

const POINTS = [
  { id: 0, text: 'How do I reset my password?', cluster: 'auth' as const, x: 95, y: 70 },
  { id: 1, text: 'I forgot my login credentials', cluster: 'auth' as const, x: 135, y: 95 },
  { id: 2, text: 'Cannot access my account', cluster: 'auth' as const, x: 80, y: 125 },
  { id: 3, text: 'Account recovery options', cluster: 'auth' as const, x: 120, y: 55 },
  { id: 4, text: "What's the weather today?", cluster: 'weather' as const, x: 360, y: 230 },
  { id: 5, text: 'Temperature forecast for NYC', cluster: 'weather' as const, x: 395, y: 260 },
  { id: 6, text: 'Will it rain tomorrow?', cluster: 'weather' as const, x: 345, y: 265 },
  { id: 7, text: 'How to make pasta from scratch?', cluster: 'cooking' as const, x: 230, y: 170 },
  { id: 8, text: 'Best pasta recipes for beginners', cluster: 'cooking' as const, x: 265, y: 145 },
  { id: 9, text: 'Quick dinner ideas under 30 min', cluster: 'cooking' as const, x: 250, y: 200 },
]

const SIMILARITY: Record<number, Record<number, number>> = {
  0: { 0: 1.00, 1: 0.93, 2: 0.88, 3: 0.91, 4: 0.08, 5: 0.11, 6: 0.07, 7: 0.05, 8: 0.06, 9: 0.04 },
  1: { 0: 0.93, 1: 1.00, 2: 0.90, 3: 0.87, 4: 0.06, 5: 0.09, 6: 0.05, 7: 0.07, 8: 0.05, 9: 0.04 },
  4: { 0: 0.08, 1: 0.06, 2: 0.07, 3: 0.05, 4: 1.00, 5: 0.92, 6: 0.89, 7: 0.10, 8: 0.08, 9: 0.09 },
  7: { 0: 0.05, 1: 0.07, 2: 0.04, 3: 0.06, 4: 0.10, 5: 0.08, 6: 0.09, 7: 1.00, 8: 0.94, 9: 0.87 },
}

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python',
    code: `from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dim

# Embed a corpus of documents
docs = [
    "How do I reset my password?",
    "I forgot my login credentials",
    "What's the weather today?",
    "How to make pasta from scratch?",
]
doc_vectors = model.encode(docs)

# Semantic search: query doesn't need to share words with docs
query = "I can't log in, help!"
query_vector = model.encode(query)

# cosine_scores shape: (1, len(docs))
scores = util.cos_sim(query_vector, doc_vectors)[0]
best_idx = scores.argmax().item()
print(f"Best match (score {scores[best_idx]:.2f}): {docs[best_idx]}")
# → "How do I reset my password?" even though no words overlap!`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `import { pipeline } from '@xenova/transformers'

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

const embed = async (text) => {
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

const cosineSim = (a, b) => {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0)
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0))
  return dot / (magA * magB)
}

const docs = ["Reset your password via Settings", "Weather forecast for today", "Pasta recipes"]
const vecs = await Promise.all(docs.map(embed))
const query = await embed("I can't log in")
const scores = vecs.map(v => cosineSim(query, v))
console.log(scores) // [0.91, 0.07, 0.05]`,
  },
]

export default function VectorEmbeddingsVisualizer() {
  const [selected, setSelected] = useState<number | null>(null)
  const sel = selected !== null ? POINTS[selected] : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vector Embeddings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">How meaning becomes geometry — and why "forgot my password" finds "account recovery" with no shared words</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          A support chatbot has 10,000 FAQ sentences stored as 768-dimensional vectors. When a user asks <em>"I can't log in"</em>,
          the query is embedded into the same space and the 3 nearest vectors are retrieved — even if they use completely different words.
          This 2D scatter plot is a t-SNE projection of that 768D space down to 2D for visualization.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Key insight</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Embedding models are trained with <strong>contrastive learning</strong>: pull similar-meaning pairs close (positive), push unrelated pairs apart (negative).
          The result: "forgot my password" and "account recovery" end up near each other even though they share zero words.
          Cosine similarity (angle between vectors) is scale-invariant and works better than Euclidean distance for text.
        </p>
      </div>

      <div className="viz-container p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scatter Plot */}
          <div className="md:col-span-2">
            <p className="text-xs text-slate-500 mb-2 text-center">2D projection of 768-dim embedding space — click any point</p>
            <svg viewBox="0 0 480 320" className="w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              {/* Cluster halos */}
              <ellipse cx="108" cy="90" rx="75" ry="60" fill="#6366f120" stroke="#6366f140" strokeWidth="1" />
              <ellipse cx="375" cy="252" rx="58" ry="45" fill="#f59e0b20" stroke="#f59e0b40" strokeWidth="1" />
              <ellipse cx="248" cy="172" rx="52" ry="40" fill="#22c55e20" stroke="#22c55e40" strokeWidth="1" />

              {/* Cluster labels */}
              <text x="108" y="155" textAnchor="middle" fontSize="9" fill="#6366f1" fontWeight="600">Account / Auth</text>
              <text x="375" y="305" textAnchor="middle" fontSize="9" fill="#f59e0b" fontWeight="600">Weather</text>
              <text x="248" y="220" textAnchor="middle" fontSize="9" fill="#22c55e" fontWeight="600">Cooking</text>

              {/* Connection lines to selected */}
              {selected !== null && SIMILARITY[selected] && POINTS.map(p => {
                const sim = SIMILARITY[selected]?.[p.id]
                if (!sim || p.id === selected || sim < 0.8) return null
                return (
                  <line key={p.id}
                    x1={sel!.x} y1={sel!.y} x2={p.x} y2={p.y}
                    stroke={CLUSTERS[sel!.cluster].color}
                    strokeWidth={sim * 2}
                    strokeOpacity={sim * 0.6}
                    strokeDasharray="4 2"
                  />
                )
              })}

              {/* Points */}
              {POINTS.map(p => {
                const c = CLUSTERS[p.cluster]
                const isSelected = p.id === selected
                const sim = selected !== null && SIMILARITY[selected] ? SIMILARITY[selected][p.id] ?? 0 : 0
                return (
                  <g key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={p.x} cy={p.y} r={isSelected ? 10 : 7}
                      fill={c.color} fillOpacity={isSelected ? 1 : 0.75}
                      stroke="white" strokeWidth={isSelected ? 2.5 : 1.5}
                      className="transition-all duration-200"
                    />
                    {isSelected && (
                      <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="8" fill={c.color} fontWeight="700">selected</text>
                    )}
                    {selected !== null && !isSelected && sim >= 0.8 && (
                      <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="8" fill={c.color} fontWeight="600">{sim.toFixed(2)}</text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Detail panel */}
          <div className="space-y-3">
            {!sel ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                Click a point to see its cosine similarity to all other sentences
              </div>
            ) : (
              <>
                <div className={`rounded-lg border p-3 ${CLUSTERS[sel.cluster].border} ${CLUSTERS[sel.cluster].bg}`}>
                  <div className={`text-xs font-semibold ${CLUSTERS[sel.cluster].text} mb-1`}>{CLUSTERS[sel.cluster].label}</div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">"{sel.text}"</div>
                </div>

                <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Cosine similarity to all points</div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {[...POINTS].sort((a, b) => {
                    const simA = SIMILARITY[sel.id]?.[a.id] ?? (a.id === sel.id ? 1 : 0.05)
                    const simB = SIMILARITY[sel.id]?.[b.id] ?? (b.id === sel.id ? 1 : 0.05)
                    return simB - simA
                  }).map(p => {
                    const sim = p.id === sel.id ? 1.00 : (SIMILARITY[sel.id]?.[p.id] ?? (CLUSTERS[p.cluster] === CLUSTERS[sel.cluster] ? 0.87 : 0.06))
                    const c = CLUSTERS[p.cluster]
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-10 text-right text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{sim.toFixed(2)}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${sim * 100}%`, backgroundColor: c.color }} />
                        </div>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Similarity metric explainer */}
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Cosine similarity</div>
              <div className="text-slate-500 dark:text-slate-400">sim(A,B) = (A·B) / (|A||B|)</div>
              <div className="text-slate-500 dark:text-slate-400">• 1.0 = identical meaning</div>
              <div className="text-slate-500 dark:text-slate-400">• 0.0 = unrelated</div>
              <div className="text-slate-500 dark:text-slate-400">• Scale-invariant (ignores magnitude)</div>
            </div>
          </div>
        </div>
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
