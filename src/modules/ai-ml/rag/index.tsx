import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

const STAGES = ['Ingest', 'Chunk', 'Embed', 'Store', 'Query', 'Search', 'Augment', 'Generate']

const DOCS = ['product_manual_x.pdf', 'setup_guide.pdf', 'troubleshooting.pdf', 'warranty.pdf', 'quick_start.pdf']

const CHUNKS = [
  'Reset your password via Settings → Account → Change Password.',
  'If locked out, click "Forgot Password" on the login page.',
  'Product warranty covers manufacturing defects for 1 year.',
  'Contact support at support@company.com for account recovery.',
  'Install using the provided USB key or the download portal.',
]

const QUERY = "I can't log in, what do I do?"
const TOP_RESULTS = [
  { text: 'If locked out, click "Forgot Password" on the login page.', score: 0.94 },
  { text: 'Reset password via Settings → Account → Change Password.', score: 0.89 },
  { text: 'Contact support@company.com for account recovery.', score: 0.82 },
]
const ANSWER = 'Click "Forgot Password" on the login page, or go to Settings → Account → Change Password. For help, email support@company.com.'

interface Step {
  stage: number
  docStatus: ('waiting' | 'active' | 'done')[]
  chunkCount: number
  embeddedCount: number
  vectorStored: boolean
  queryActive: boolean
  searchDone: boolean
  promptBuilt: boolean
  answerReady: boolean
  message: string
}

const buildStep = (prev: Step, overrides: Partial<Step> & { message: string }): Step =>
  ({ ...prev, ...overrides })

const ragSteps = (): Step[] => {
  const base: Step = {
    stage: -1, docStatus: ['waiting', 'waiting', 'waiting', 'waiting', 'waiting'],
    chunkCount: 0, embeddedCount: 0, vectorStored: false,
    queryActive: false, searchDone: false, promptBuilt: false, answerReady: false,
    message: '',
  }
  const steps: Step[] = [{ ...base, message: '5 product manuals are queued for processing. Press ▶ to start the RAG pipeline.' }]
  const last = () => steps[steps.length - 1]

  steps.push(buildStep(last(), { stage: 0, docStatus: ['active', 'waiting', 'waiting', 'waiting', 'waiting'], message: 'Ingesting product_manual_x.pdf — extracting raw text (47 pages).' }))
  steps.push(buildStep(last(), { docStatus: ['done', 'active', 'waiting', 'waiting', 'waiting'], message: 'Ingesting setup_guide.pdf and troubleshooting.pdf...' }))
  steps.push(buildStep(last(), { docStatus: ['done', 'done', 'done', 'active', 'active'], message: 'All 5 manuals ingested. Total: 312 pages of raw text.' }))

  steps.push(buildStep(last(), { stage: 1, docStatus: ['done', 'done', 'done', 'done', 'done'], chunkCount: 47, message: 'Splitting product_manual_x.pdf → 47 chunks (~200 words each).' }))
  steps.push(buildStep(last(), { chunkCount: 142, message: 'Chunked setup_guide + troubleshooting → 142 total chunks so far.' }))
  steps.push(buildStep(last(), { chunkCount: 231, message: 'All 5 manuals split into 231 text chunks. Each chunk preserves section context.' }))

  steps.push(buildStep(last(), { stage: 2, embeddedCount: 1, message: 'Embedding chunk #1: "Reset your password via Settings…" → 768-dim vector [0.12, −0.33, 0.87, …]' }))
  steps.push(buildStep(last(), { embeddedCount: 58, message: 'Embedded 58/231 chunks. Chunks about auth/login are clustering together in vector space.' }))
  steps.push(buildStep(last(), { embeddedCount: 231, message: 'All 231 chunks embedded. Semantically similar passages are now neighbours in 768D space.' }))

  steps.push(buildStep(last(), { stage: 3, vectorStored: true, message: 'Persisting 231 vectors + metadata to Pinecone (vector DB). Each record: {id, vector, source, section}.' }))
  steps.push(buildStep(last(), { message: 'Vector DB ready. Index is searchable — RAG ingestion pipeline complete.' }))

  steps.push(buildStep(last(), { stage: 4, queryActive: true, message: `User query arrives: "${QUERY}"` }))
  steps.push(buildStep(last(), { stage: 5, message: 'Embedding the query using the same model → query vector [0.11, −0.31, 0.85, …]' }))
  steps.push(buildStep(last(), { searchDone: true, message: 'Cosine similarity search: comparing query vector against all 231 stored vectors.' }))
  steps.push(buildStep(last(), { message: 'Top-3 results retrieved: scores 0.94, 0.89, 0.82 — all above the 0.75 relevance threshold.' }))

  steps.push(buildStep(last(), { stage: 6, promptBuilt: true, message: 'Building augmented prompt: [System role] + [3 retrieved chunks as context] + [user question].' }))
  steps.push(buildStep(last(), { stage: 7, answerReady: true, message: 'GPT-4 generates a grounded answer using only the retrieved context — no hallucination risk.' }))
  return steps
}

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python (LangChain)',
    code: `from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Pinecone
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI

# 1. Load documents
loader = PyPDFLoader("product_manual.pdf")
docs = loader.load()

# 2. Chunk
splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=20)
chunks = splitter.split_documents(docs)

# 3 & 4. Embed + Store
embeddings = OpenAIEmbeddings()
vectordb = Pinecone.from_documents(chunks, embeddings, index_name="support-docs")

# 5-8. Query → Retrieve → Augment → Generate (all in one chain)
qa = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4"),
    retriever=vectordb.as_retriever(search_kwargs={"k": 3}),
)
answer = qa.run("I can't log in, what do I do?")`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (LlamaIndex)',
    code: `import { SimpleDirectoryReader, VectorStoreIndex, OpenAI } from 'llamaindex'

async function buildRAG() {
  // 1 & 2. Load + automatically chunk
  const reader = new SimpleDirectoryReader()
  const documents = await reader.loadData({ directoryPath: './manuals' })

  // 3 & 4. Embed + Store in memory (swap for Pinecone in prod)
  const index = await VectorStoreIndex.fromDocuments(documents)

  // 5-8. Query end-to-end
  const queryEngine = index.asQueryEngine({ similarityTopK: 3 })
  const response = await queryEngine.query("I can't log in, what do I do?")
  console.log(response.toString())
}`,
  },
]

const STAGE_COLORS = [
  'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500',
]

export default function RAGVisualizer() {
  const steps = ragSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">RAG Pipeline</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Retrieval-Augmented Generation — teach an LLM about your private documents without fine-tuning</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You have 5 product manuals (312 pages). A customer asks <em>"I can't log in, what do I do?"</em> — but your LLM has never seen these PDFs.
          RAG solves this: pre-process the documents into a vector database, then at query time retrieve the 3 most relevant passages and hand them to the LLM as context.
          The LLM answers from your docs, not from its training data.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">Why not just fine-tune?</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Fine-tuning bakes knowledge into model weights — expensive, slow to update when docs change.
          RAG keeps knowledge external: add/update a document, re-embed it, done. Retrieval also gives you <strong>citations</strong> (you know which chunks grounded the answer), reducing hallucinations.
        </p>
      </div>

      {/* Pipeline stages */}
      <div className="viz-container p-6 space-y-5">
        <div className="flex gap-1 flex-wrap">
          {STAGES.map((name, i) => (
            <div key={name} className={`flex-1 min-w-16 text-center py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
              i === cur.stage
                ? `${STAGE_COLORS[i]} text-white scale-105 shadow-md`
                : i < cur.stage
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {name}
            </div>
          ))}
        </div>

        {/* Stage-specific visuals */}
        {cur.stage <= 0 && (
          <div className="grid grid-cols-5 gap-2">
            {DOCS.map((doc, i) => (
              <div key={doc} className={`rounded-lg border p-2 text-center transition-all duration-300 ${
                cur.docStatus[i] === 'done' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' :
                cur.docStatus[i] === 'active' ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 scale-105' :
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}>
                <div className="text-2xl">📄</div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">{doc}</div>
                <div className={`text-[10px] font-medium mt-0.5 ${
                  cur.docStatus[i] === 'done' ? 'text-emerald-600' :
                  cur.docStatus[i] === 'active' ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  {cur.docStatus[i] === 'done' ? '✓ ingested' : cur.docStatus[i] === 'active' ? '⟳ loading' : 'queued'}
                </div>
              </div>
            ))}
          </div>
        )}

        {(cur.stage === 1 || cur.stage === 2 || cur.stage === 3) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {cur.chunkCount > 0 && `${cur.chunkCount} chunks`}
                {cur.embeddedCount > 0 && ` • ${cur.embeddedCount} embedded`}
                {cur.vectorStored && ' • stored in DB'}
              </span>
            </div>
            <div className="space-y-1.5">
              {CHUNKS.slice(0, 3).map((chunk, i) => (
                <div key={i} className={`rounded-lg p-2.5 border text-xs transition-all duration-300 flex items-start gap-2 ${
                  cur.embeddedCount > i
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/20'
                    : cur.chunkCount > 0
                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      : 'border-slate-100 dark:border-slate-800 opacity-40'
                }`}>
                  <span className={`text-base flex-shrink-0 ${cur.embeddedCount > i ? 'opacity-100' : 'opacity-40'}`}>📝</span>
                  <div className="min-w-0">
                    <div className="text-slate-700 dark:text-slate-300 truncate">"{chunk}"</div>
                    {cur.embeddedCount > i && (
                      <div className="text-indigo-500 font-mono text-[10px] mt-0.5 truncate">[0.12, −0.33, 0.87, 0.44, … +763 more]</div>
                    )}
                  </div>
                </div>
              ))}
              {cur.chunkCount > 3 && <div className="text-xs text-slate-400 pl-2">…and {cur.chunkCount - 3} more chunks</div>}
            </div>
            {cur.vectorStored && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800">
                <span>🗄️</span> Vector DB: 231 vectors indexed, ready for similarity search
              </div>
            )}
          </div>
        )}

        {(cur.stage === 4 || cur.stage === 5) && (
          <div className="space-y-3">
            <div className={`rounded-xl border p-4 transition-all ${cur.queryActive ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="text-xs text-slate-500 mb-1">User query</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">"{QUERY}"</div>
              {cur.stage === 5 && (
                <div className="text-xs font-mono text-indigo-500 mt-2">↳ query vector: [0.11, −0.31, 0.85, 0.42, …]</div>
              )}
            </div>
          </div>
        )}

        {cur.stage === 5 && cur.searchDone && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Top-3 retrieved chunks</div>
            {TOP_RESULTS.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5">
                <div className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                  r.score > 0.9 ? 'bg-emerald-100 text-emerald-700' : r.score > 0.85 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>{r.score}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{r.text}</div>
              </div>
            ))}
          </div>
        )}

        {(cur.stage === 6 || cur.stage === 7) && (
          <div className="space-y-3">
            {cur.promptBuilt && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-3 text-xs space-y-1.5">
                <div className="font-semibold text-violet-700 dark:text-violet-300">Augmented Prompt</div>
                <div className="text-violet-600 dark:text-violet-400 font-mono">[System]: Answer only from the provided context.</div>
                <div className="text-violet-600 dark:text-violet-400 font-mono">[Context 1]: "{TOP_RESULTS[0].text}"</div>
                <div className="text-violet-600 dark:text-violet-400 font-mono">[Context 2]: "{TOP_RESULTS[1].text}"</div>
                <div className="text-violet-600 dark:text-violet-400 font-mono">[User]: "{QUERY}"</div>
              </div>
            )}
            {cur.answerReady && (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-1">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">GPT-4 Response</div>
                <div className="text-sm text-emerald-800 dark:text-emerald-200">"{ANSWER}"</div>
              </div>
            )}
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
