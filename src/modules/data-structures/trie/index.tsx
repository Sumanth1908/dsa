import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import ComplexityBadge from '@/components/shared/ComplexityBadge'
import CodeBlock from '@/components/shared/CodeBlock'

interface TrieNodeData {
  char: string
  isEnd: boolean
  children: Record<string, TrieNodeData>
  x?: number
  y?: number
  id: number
}

let _id = 0
function makeNode(char: string): TrieNodeData {
  return { char, isEnd: false, children: {}, id: _id++ }
}

function buildTrie(words: string[]): TrieNodeData {
  _id = 0
  const root = makeNode('')
  for (const word of words) {
    let cur = root
    for (const ch of word) {
      if (!cur.children[ch]) cur.children[ch] = makeNode(ch)
      cur = cur.children[ch]
    }
    cur.isEnd = true
  }
  return root
}

// Leaf-spreading layout: assign sequential x to leaves, center parents over children range
const LEAF_GAP = 90
const LEVEL_H = 85

function collectLeaves(node: TrieNodeData, leaves: TrieNodeData[]) {
  const kids = Object.values(node.children)
  if (kids.length === 0) { leaves.push(node); return }
  kids.forEach(c => collectLeaves(c, leaves))
}

function assignLayout(node: TrieNodeData, depth: number, leafCounter: { v: number }) {
  const kids = Object.values(node.children)
  if (kids.length === 0) {
    node.x = leafCounter.v * LEAF_GAP + 40
    node.y = depth * LEVEL_H + 40
    leafCounter.v++
    return
  }
  kids.forEach(c => assignLayout(c, depth + 1, leafCounter))
  const xs = kids.map(c => c.x!)
  node.x = (Math.min(...xs) + Math.max(...xs)) / 2
  node.y = depth * LEVEL_H + 40
}

function collectAll(node: TrieNodeData, acc: TrieNodeData[] = []): TrieNodeData[] {
  acc.push(node)
  Object.values(node.children).forEach(c => collectAll(c, acc))
  return acc
}

function collectEdgesAll(node: TrieNodeData, acc: { x1: number; y1: number; x2: number; y2: number; char: string }[] = []) {
  Object.values(node.children).forEach(c => {
    acc.push({ x1: node.x!, y1: node.y!, x2: c.x!, y2: c.y!, char: c.char })
    collectEdgesAll(c, acc)
  })
  return acc
}

type Mode = 'word' | 'prefix'

interface Step {
  highlight: number[]
  found: number[]
  failed: number[]
  message: string
}

function searchWordSteps(root: TrieNodeData, query: string): Step[] {
  const steps: Step[] = [{ highlight: [], found: [], failed: [], message: `Search word "${query}" — traverse one character at a time` }]
  let cur = root
  const visited: number[] = [root.id]

  for (let i = 0; i < query.length; i++) {
    const ch = query[i]
    if (!cur.children[ch]) {
      steps.push({ highlight: [], found: [], failed: visited, message: `Character '${ch}' not found — "${query}" is NOT in the trie` })
      return steps
    }
    cur = cur.children[ch]
    visited.push(cur.id)
    steps.push({ highlight: [cur.id], found: [], failed: [], message: `Found '${ch}' → move to node ${cur.char} (depth ${i + 1})` })
  }

  if (cur.isEnd) {
    steps.push({ highlight: [], found: visited, failed: [], message: `Node marked as word-end — "${query}" EXISTS in the trie` })
  } else {
    steps.push({ highlight: [], found: [], failed: visited, message: `Reached node but it's not marked as word-end — "${query}" is a PREFIX only, not a complete word` })
  }
  return steps
}

function searchPrefixSteps(root: TrieNodeData, prefix: string): Step[] {
  const steps: Step[] = [{ highlight: [], found: [], failed: [], message: `Search prefix "${prefix}" — find all words starting with it` }]
  let cur = root
  const visited: number[] = [root.id]

  for (let i = 0; i < prefix.length; i++) {
    const ch = prefix[i]
    if (!cur.children[ch]) {
      steps.push({ highlight: [], found: [], failed: visited, message: `Character '${ch}' not found — no words start with "${prefix}"` })
      return steps
    }
    cur = cur.children[ch]
    visited.push(cur.id)
    steps.push({ highlight: [cur.id], found: [], failed: [], message: `Found '${ch}' — traversed to depth ${i + 1}` })
  }

  // collect all words from this subtree
  const subtreeWords: string[] = []
  function collect(node: TrieNodeData, path: string) {
    if (node.isEnd) subtreeWords.push(path)
    Object.entries(node.children).forEach(([ch, child]) => collect(child, path + ch))
  }
  collect(cur, prefix)

  const subtreeIds = collectAll(cur).map(n => n.id)
  steps.push({ highlight: [], found: [...visited, ...subtreeIds], failed: [], message: `Prefix "${prefix}" found. Words: [${subtreeWords.join(', ')}]` })
  return steps
}

const WORDS = ['cat', 'car', 'care', 'bat', 'bad']

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'JavaScript',
    code: `class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) { // O(m) where m = word length
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch])
        node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
  }

  search(word) { // O(m) — exact match
    let node = this.root;
    for (const ch of word) {
      if (!node.children[ch]) return false;
      node = node.children[ch];
    }
    return node.isEnd;
  }

  startsWith(prefix) { // O(m) — prefix check
    let node = this.root;
    for (const ch of prefix) {
      if (!node.children[ch]) return false;
      node = node.children[ch];
    }
    return true;
  }
}`,
  },
  {
    lang: 'python' as const, label: 'Python',
    code: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):  # O(m)
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):  # O(m)
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return node.is_end

    def starts_with(self, prefix):  # O(m)
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True`,
  },
  {
    lang: 'java' as const, label: 'Java',
    code: `class Trie {
    private TrieNode root = new TrieNode();

    static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEnd;
    }

    public void insert(String word) { // O(m)
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null)
                node.children[i] = new TrieNode();
            node = node.children[i];
        }
        node.isEnd = true;
    }

    public boolean search(String word) { // O(m)
        TrieNode node = root;
        for (char c : word.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null) return false;
            node = node.children[i];
        }
        return node.isEnd;
    }

    public boolean startsWith(String prefix) { // O(m)
        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            int i = c - 'a';
            if (node.children[i] == null) return false;
            node = node.children[i];
        }
        return true;
    }
}`,
  },
]

export default function TrieVisualizer() {
  const [mode, setMode] = useState<Mode>('word')
  const [query, setQuery] = useState('care')

  const root = buildTrie(WORDS)
  assignLayout(root, 0, { v: 0 })

  const leaves: TrieNodeData[] = []
  collectLeaves(root, leaves)
  const allNodes = collectAll(root)
  const allEdges = collectEdgesAll(root)

  const svgW = Math.max(500, (leaves.length) * LEAF_GAP + 80)
  const svgH = 4 * LEVEL_H + 60

  const steps = mode === 'word'
    ? searchWordSteps(root, query)
    : searchPrefixSteps(root, query)

  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trie</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Each edge is a character — O(m) prefix search; a sub-type of <Link to="/data-structures/tree" className="underline decoration-dotted">Tree</Link></p>
        </div>
        <ComplexityBadge time="O(m) search/insert" space="O(N·m)" />
      </div>

      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 text-sm text-sky-800 dark:text-sky-300 space-y-2">
        <p className="font-semibold text-sky-700 dark:text-sky-200">What is a Trie?</p>
        <p>A trie (pronounced "try", from re<em>trie</em>val) is a tree where each <strong>edge</strong> represents a character. To look up a word, follow the edges one character at a time from the root. If you reach a node marked as a word-end, the word exists.</p>
        <ul className="space-y-1 pl-1">
          <li>• <strong>Each path root→leaf encodes one string</strong> — the characters along the edges spell the word</li>
          <li>• <strong>Common prefixes share nodes</strong> — "cat", "car", "care" all share the c→a path; this is the space saving</li>
          <li>• <strong>O(m) for all ops</strong> — search, insert, and prefix-check all cost O(m) where m is the string length; independent of how many strings are stored</li>
          <li>• <strong>isEnd marker</strong> — a boolean on each node distinguishes "car" (complete word) from a shared prefix node in "care"</li>
          <li>• <strong>Space trade-off</strong> — stores at most O(N·m) nodes; faster than storing N strings in a hash set when prefix operations matter</li>
        </ul>
        <p>Real-world uses: <strong>autocomplete</strong> (search bars, IDE suggestions), <strong>spell checking</strong>, <strong>IP routing tables</strong> (longest prefix match), and <strong>word games</strong> (Boggle, word search).</p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm">
        <strong className="text-emerald-700 dark:text-emerald-300 block mb-2">When to use a Trie vs a HashMap</strong>
        <ul className="space-y-1 text-emerald-800 dark:text-emerald-400">
          <li>• <strong>Trie wins</strong> — you need to find all words with a given prefix, count how many words share a prefix, or do longest-prefix matching</li>
          <li>• <strong>HashMap wins</strong> — you only need exact-match lookup and don't care about prefixes; O(1) vs O(m) is faster in practice</li>
          <li>• <strong>Classic Trie problems</strong> — autocomplete, word search II (DFS on grid + trie), replace words with their root prefix, implement a phone dictionary</li>
        </ul>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 text-sm">
        <strong className="text-indigo-700 dark:text-indigo-300 block mb-2">Famous techniques using a Trie</strong>
        <ul className="space-y-1.5 text-indigo-800 dark:text-indigo-400">
          <li>• <Link to="/patterns/dfs" className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-600 dark:hover:text-indigo-200">DFS on trie</Link> — collect all words under a prefix node by recursively visiting all children; used in autocomplete and word search II</li>
          <li>• <strong>Trie + backtracking</strong> — word search on a grid: build a trie of target words, then DFS on the grid pruning branches not in the trie; O(N·4^L) without trie, much faster with it</li>
          <li>• <strong>Longest prefix match</strong> — IP routing tables use a trie of binary octets; traverse bit-by-bit to find the most specific matching route</li>
        </ul>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(['word', 'prefix'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); ctrl.reset() }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              mode === m ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
            {m === 'word' ? 'Search word' : 'Search prefix'}
          </button>
        ))}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value.toLowerCase()); ctrl.reset() }}
          placeholder="type a word…"
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-36"
        />
        <span className="text-xs text-slate-400">Words: {WORDS.join(', ')}</span>
      </div>

      <div className="viz-container overflow-x-auto">
        <svg width={svgW} height={svgH} className="block mx-auto">
          {/* Edges */}
          {allEdges.map((e, i) => (
            <g key={i}>
              <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke="currentColor" strokeWidth={2} className="text-slate-300 dark:text-slate-600" />
              <text
                x={(e.x1 + e.x2) / 2 - 10}
                y={(e.y1 + e.y2) / 2}
                fontSize="12" fontWeight="600"
                className="fill-slate-500 dark:fill-slate-400">
                {e.char}
              </text>
            </g>
          ))}

          {/* Nodes */}
          {allNodes.map(n => {
            const isHighlight = cur.highlight.includes(n.id)
            const isFound = cur.found.includes(n.id)
            const isFailed = cur.failed.includes(n.id)
            const isRoot = n.char === ''
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <circle r={isRoot ? 20 : 18}
                  className={`transition-all duration-300 ${
                    isFailed ? 'fill-rose-500' :
                    isFound ? 'fill-emerald-500' :
                    isHighlight ? 'fill-violet-500' :
                    'fill-slate-200 dark:fill-slate-700'
                  }`} />
                <text textAnchor="middle" dy="0.35em" fontSize={isRoot ? 11 : 13} fontWeight="600"
                  className={isFailed || isFound || isHighlight ? 'fill-white' : 'fill-slate-600 dark:fill-slate-300'}>
                  {isRoot ? 'root' : n.char}
                </text>
                {n.isEnd && (
                  <circle r={isRoot ? 24 : 22} fill="none"
                    stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"
                    className={isFailed ? 'text-rose-400' : isFound ? 'text-emerald-400' : 'text-violet-400'} />
                )}
              </g>
            )
          })}
        </svg>

        <div className="flex justify-center gap-4 text-xs text-slate-500 pb-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Current</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Found</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Failed</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded-full border-2 border-dashed border-violet-400"></span> Word-end</span>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">{cur.message}</p>
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
