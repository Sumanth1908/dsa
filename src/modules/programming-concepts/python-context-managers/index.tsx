import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

type ExitMode = 'normal' | 'exception'

interface Step {
  phase: 'idle' | 'enter' | 'body' | 'exit-normal' | 'exit-exception' | 'done' | 'done-exception'
  resourceOpen: boolean
  txStarted: boolean
  txCommitted: boolean
  txRolledBack: boolean
  connClosed: boolean
  exceptionRaised: boolean
  queryResult: string | null
  message: string
}

const normalSteps = (): Step[] => [
  {
    phase: 'idle', resourceOpen: false, txStarted: false, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: 'with DatabaseConnection() as conn: — Python calls DatabaseConnection().__enter__() immediately.',
  },
  {
    phase: 'enter', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: '__enter__() opens the DB connection, starts a transaction, returns the connection object bound to "conn".',
  },
  {
    phase: 'body', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: 'Code block runs: conn.query("SELECT * FROM users LIMIT 10") — executing inside the transaction.',
  },
  {
    phase: 'body', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: '10 rows returned',
    message: 'Query completes. 10 rows returned. About to exit the with block normally.',
  },
  {
    phase: 'exit-normal', resourceOpen: true, txStarted: true, txCommitted: true,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: '10 rows returned',
    message: '__exit__(None, None, None) called — no exception. Commits the transaction.',
  },
  {
    phase: 'done', resourceOpen: false, txStarted: true, txCommitted: true,
    txRolledBack: false, connClosed: true, exceptionRaised: false, queryResult: '10 rows returned',
    message: '✓ Connection closed, transaction committed. Even if you forgot conn.close(), __exit__ guarantees cleanup.',
  },
]

const exceptionSteps = (): Step[] => [
  {
    phase: 'idle', resourceOpen: false, txStarted: false, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: 'Same with block — but this time a query will fail with IntegrityError (duplicate key).',
  },
  {
    phase: 'enter', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: '__enter__() opens connection, starts transaction.',
  },
  {
    phase: 'body', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: false, queryResult: null,
    message: 'conn.execute("INSERT INTO users ...") — attempting to insert a user with a duplicate email.',
  },
  {
    phase: 'body', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: false, connClosed: false, exceptionRaised: true, queryResult: null,
    message: '💥 IntegrityError raised: "UNIQUE constraint failed: users.email". Block exits abnormally.',
  },
  {
    phase: 'exit-exception', resourceOpen: true, txStarted: true, txCommitted: false,
    txRolledBack: true, connClosed: false, exceptionRaised: true, queryResult: null,
    message: '__exit__(IntegrityError, ...) called WITH the exception info. Rolls back the transaction.',
  },
  {
    phase: 'done-exception', resourceOpen: false, txStarted: true, txCommitted: false,
    txRolledBack: true, connClosed: true, exceptionRaised: true, queryResult: null,
    message: 'Connection closed. __exit__ returns False → exception is re-raised to caller. Database is clean — no partial write.',
  },
]

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python',
    code: `# ─── IMPLEMENTING A CONTEXT MANAGER ─────────────────────────
class DatabaseConnection:
    def __init__(self, dsn="postgres://localhost/mydb"):
        self.dsn = dsn
        self.conn = None

    def __enter__(self):
        """Called at the top of the 'with' block. Returns the resource."""
        self.conn = psycopg2.connect(self.dsn)
        self.conn.autocommit = False   # manual transaction control
        self.conn.cursor().execute("BEGIN")
        print("Connection opened, transaction started")
        return self.conn               # bound to the 'as conn' alias

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Always called at the end, even if an exception occurred."""
        if exc_type is None:
            self.conn.commit()         # success → commit
            print("Transaction committed")
        else:
            self.conn.rollback()       # failure → rollback
            print(f"Transaction rolled back due to: {exc_val}")
        self.conn.close()
        print("Connection closed")
        return False                   # False = re-raise any exception

# ─── USAGE ────────────────────────────────────────────────────
with DatabaseConnection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users LIMIT 10")
    rows = cursor.fetchall()
    cursor.execute("INSERT INTO orders (user_id, total) VALUES (%s, %s)", (42, 99.99))
# __exit__ called here automatically — conn.close() guaranteed

# ─── CONTEXTLIB SHORTCUT (for simple cases) ───────────────────
from contextlib import contextmanager

@contextmanager
def temp_directory():
    path = tempfile.mkdtemp()
    try:
        yield path        # __enter__ returns here
    finally:
        shutil.rmtree(path)  # __exit__ runs here

with temp_directory() as tmpdir:
    process_files(tmpdir)    # tmpdir cleaned up automatically`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (using/try-finally)',
    code: `// JS has no 'with' resource protocol, but TC39 "using" declaration (Stage 3)
// achieves the same thing via Symbol.dispose

class DatabaseConnection {
    constructor(dsn) {
        this.dsn = dsn
        this.conn = null
    }

    async connect() {
        this.conn = await pg.connect(this.dsn)
        return this
    }

    // Symbol.asyncDispose — called by 'await using' at block end
    async [Symbol.asyncDispose]() {
        if (this.conn) {
            await this.conn.release()
            console.log('Connection released automatically')
        }
    }
}

// 'await using' → calls Symbol.asyncDispose at block exit (TC39 proposal)
async function processOrders() {
    await using db = await new DatabaseConnection(DSN).connect()
    const rows = await db.conn.query('SELECT * FROM orders WHERE pending = true')
    // db.conn.release() called automatically here, even on exception
}

// ─── CURRENT JS: try-finally (the manual equivalent) ──────────
async function withConnection(fn) {
    const conn = await pg.connect()
    try {
        return await fn(conn)       // user code runs here
    } catch (err) {
        await conn.query('ROLLBACK')
        throw err                   // re-raise, like __exit__ returning False
    } finally {
        conn.release()              // ALWAYS runs — like __exit__
    }
}

await withConnection(async (conn) => {
    await conn.query('INSERT INTO users (name) VALUES ($1)', ['Alice'])
})`,
  },
  {
    lang: 'java' as const, label: 'Java (try-with-resources)',
    code: `import java.sql.*;

// AutoCloseable = Java's context manager protocol
// Any class implementing AutoCloseable can be used in try-with-resources
public class DatabaseConnection implements AutoCloseable {
    private final Connection conn;
    private boolean committed = false;

    public DatabaseConnection(String dsn) throws SQLException {
        this.conn = DriverManager.getConnection(dsn);
        this.conn.setAutoCommit(false);  // manual transaction
        System.out.println("Connection opened, transaction started");
    }

    public Connection getConnection() { return conn; }

    public void commit() throws SQLException {
        conn.commit();
        committed = true;
        System.out.println("Transaction committed");
    }

    @Override
    public void close() throws SQLException {
        // AutoCloseable.close() = __exit__
        // Called automatically at end of try-with-resources block
        if (!committed) {
            conn.rollback();
            System.out.println("Transaction rolled back");
        }
        conn.close();
        System.out.println("Connection closed");
    }
}

// try-with-resources = Python's 'with' statement
try (DatabaseConnection db = new DatabaseConnection("jdbc:postgresql://localhost/mydb")) {
    PreparedStatement stmt = db.getConnection()
        .prepareStatement("SELECT * FROM users LIMIT 10");
    ResultSet rs = stmt.executeQuery();
    // ... process rows ...
    db.commit();
}  // db.close() called here automatically — even if exception thrown`,
  },
]

type ResourceStatus = 'closed' | 'open' | 'error'

function ResourcePill({ label, status }: { label: string; status: 'inactive' | 'active' | 'committed' | 'rolled-back' | 'closed' | 'error' }) {
  const colors = {
    inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
    active: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    committed: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    'rolled-back': 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    closed: 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600',
    error: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
  }
  const icons = { inactive: '○', active: '●', committed: '✓', 'rolled-back': '↩', closed: '✕', error: '✕' }
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300 ${colors[status]}`}>
      <span>{icons[status]}</span>
      <span>{label}</span>
    </div>
  )
}

export default function PyContextManagersVisualizer() {
  const [mode, setMode] = useState<ExitMode>('normal')
  const steps = mode === 'normal' ? normalSteps() : exceptionSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]

  const PHASE_LABELS: Record<Step['phase'], string> = {
    idle: 'Before with',
    enter: '__enter__() running',
    body: 'Body running',
    'exit-normal': '__exit__(None, None, None)',
    'exit-exception': '__exit__(exc_type, exc_val, tb)',
    done: 'Done — clean exit',
    'done-exception': 'Done — exception re-raised',
  }

  const PHASE_COLORS: Record<Step['phase'], string> = {
    idle: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    enter: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    body: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
    'exit-normal': 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    'exit-exception': 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
    done: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    'done-exception': 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Python — Context Managers</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">with</code> guarantees <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">__exit__</code> always runs — no matter how the block exits
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Database operations need a connection opened, a transaction started, and — whether it succeeds or fails — the connection closed and the transaction committed or rolled back.
          Without a context manager, a missed <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">conn.close()</code> leaks connections until the DB pool exhausts.
          With <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">with DatabaseConnection() as conn:</code>, cleanup is guaranteed by the protocol.
        </p>
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">The protocol — two dunder methods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          <div>
            <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">__enter__(self)</code> — called at <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">with</code> entry. Opens the resource, returns it (bound to <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">as</code> alias).
          </div>
          <div>
            <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">__exit__(self, exc_type, exc_val, tb)</code> — always called at block exit. If all three args are None = clean exit. Return <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">True</code> to suppress the exception, <code className="bg-emerald-100 dark:bg-emerald-900 px-1 rounded">False</code> to re-raise.
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['normal', 'exception'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); ctrl.reset() }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all capitalize ${
              mode === m
                ? m === 'normal'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-rose-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}>
            {m === 'normal' ? '✓ Normal exit' : '✗ Exception raised'}
          </button>
        ))}
      </div>

      <div className="viz-container p-6 space-y-5">
        {/* Phase badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${PHASE_COLORS[cur.phase]}`}>
            {PHASE_LABELS[cur.phase]}
          </span>
        </div>

        {/* Lifecycle diagram */}
        <div className="space-y-2">
          {[
            { id: 'enter', label: '1. __enter__(): open connection, start transaction', active: cur.phase === 'enter' || cur.phase === 'body' || cur.phase === 'exit-normal' || cur.phase === 'exit-exception' || cur.phase === 'done' || cur.phase === 'done-exception' },
            { id: 'body', label: '2. Body: conn.query(…)  /  conn.execute(…)', active: cur.phase === 'body', highlighted: true },
            { id: 'exit', label: mode === 'normal' ? '3. __exit__(None, None, None): commit + close' : '3. __exit__(IntegrityError, …): rollback + close', active: cur.phase === 'exit-normal' || cur.phase === 'exit-exception' || cur.phase === 'done' || cur.phase === 'done-exception' },
          ].map((row, i) => (
            <div key={row.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-all duration-300 ${
              cur.phase === 'idle' ? 'border-slate-200 dark:border-slate-700 opacity-50' :
              row.active ? (row.id === 'body' ? 'border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-950/20' : mode === 'exception' && row.id === 'exit' ? 'border-rose-400 dark:border-rose-600 bg-rose-50/50 dark:bg-rose-950/20' : 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20') :
              'border-slate-200 dark:border-slate-700 opacity-40'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                row.active ? (row.id === 'body' ? 'bg-violet-500 text-white' : mode === 'exception' && row.id === 'exit' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>{i + 1}</div>
              <span className={`text-sm font-mono ${row.active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-500'}`}>{row.label}</span>
            </div>
          ))}
        </div>

        {/* Resource state pills */}
        <div className="flex flex-wrap gap-2">
          <ResourcePill
            label="DB Connection"
            status={cur.connClosed ? 'closed' : cur.resourceOpen ? 'active' : 'inactive'}
          />
          <ResourcePill
            label="Transaction"
            status={cur.txRolledBack ? 'rolled-back' : cur.txCommitted ? 'committed' : cur.txStarted ? 'active' : 'inactive'}
          />
          {cur.exceptionRaised && (
            <ResourcePill label="IntegrityError" status="error" />
          )}
        </div>

        {/* Without context manager comparison */}
        {cur.phase === 'idle' && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 p-4">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-2">Without context manager (error-prone)</div>
            <div className="font-mono text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
              <div>conn = db.connect()</div>
              <div>try:</div>
              <div>    result = conn.query("SELECT ...")</div>
              <div>    conn.commit()</div>
              <div>except Exception:</div>
              <div>    conn.rollback()</div>
              <div>finally:</div>
              <div>    conn.close()  <span className="text-rose-500"># easy to forget!</span></div>
            </div>
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
