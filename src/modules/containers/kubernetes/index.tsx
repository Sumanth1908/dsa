import React from 'react'
import MemoryTip from '@/components/shared/MemoryTip'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeTabs from '@/components/shared/CodeTabs'

interface Step {
  active: string[]
  podState: 'none' | 'pending' | 'scheduled' | 'creating' | 'running'
  podNode: 0 | 1 | null
  message: string
}

const k8sSteps = (): Step[] => [
  { active: [], podState: 'none', podNode: null, message: 'K8s cluster idle. Control plane and 2 worker nodes are healthy. No pods scheduled yet.' },
  { active: ['user'], podState: 'none', podNode: null, message: 'You run: kubectl apply -f nginx-deploy.yaml (3 replicas). Request sent to the API server.' },
  { active: ['apiserver'], podState: 'none', podNode: null, message: 'API Server authenticates & validates the manifest. Accepts the resource definition.' },
  { active: ['apiserver', 'etcd'], podState: 'pending', podNode: null, message: 'etcd records the desired state: "3 nginx pods should exist." Pods are Pending — no node assigned yet.' },
  { active: ['apiserver', 'controller'], podState: 'pending', podNode: null, message: 'ReplicaSet Controller detects: desired=3, actual=0. Triggers creation of 3 Pod objects.' },
  { active: ['apiserver', 'scheduler'], podState: 'scheduled', podNode: 0, message: 'Scheduler scores Worker Node 1 (more free CPU). Assigns pod #1 to it. Status → Scheduled.' },
  { active: ['apiserver', 'scheduler'], podState: 'scheduled', podNode: 1, message: 'Scheduler assigns pods #2 and #3 to Worker Node 2 (balancing load across nodes).' },
  { active: ['node1', 'kubelet1'], podState: 'creating', podNode: 0, message: 'Kubelet on Node 1 sees the assignment. Pulls nginx:latest from Docker Hub and creates the container.' },
  { active: ['node2', 'kubelet2'], podState: 'creating', podNode: 1, message: 'Kubelet on Node 2 does the same for pods #2 and #3. Container runtime (containerd) starts them.' },
  { active: ['node1', 'node2', 'proxy'], podState: 'running', podNode: null, message: 'kube-proxy updates iptables rules on all nodes. Pods are Running. Service routes traffic to all 3.' },
  { active: [], podState: 'running', podNode: null, message: '✓ Deployment stable: 3/3 replicas Ready. Kubernetes will restart any pod that crashes.' },
]

const CODE_EXAMPLES = [
  {
    lang: 'javascript' as const, label: 'kubectl / YAML',
    code: `# Deployment manifest — desired state declaration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deploy
spec:
  replicas: 3                 # K8s ensures exactly 3 pods
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels: { app: nginx }
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          requests: { cpu: 100m, memory: 128Mi }
          limits:   { cpu: 200m, memory: 256Mi }
---
# Service — stable ClusterIP in front of all 3 pods
apiVersion: v1
kind: Service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80`,
  },
  {
    lang: 'python' as const, label: 'Python (k8s client)',
    code: `from kubernetes import client, config

config.load_kube_config()  # uses ~/.kube/config
apps_v1 = client.AppsV1Api()

deployment = client.V1Deployment(
    metadata=client.V1ObjectMeta(name="nginx-deploy"),
    spec=client.V1DeploymentSpec(
        replicas=3,
        selector=client.V1LabelSelector(match_labels={"app": "nginx"}),
        template=client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(labels={"app": "nginx"}),
            spec=client.V1PodSpec(containers=[
                client.V1Container(
                    name="nginx",
                    image="nginx:latest",
                    ports=[client.V1ContainerPort(container_port=80)],
                )
            ]),
        ),
    ),
)
apps_v1.create_namespaced_deployment(namespace="default", body=deployment)
print("Deployment created — 3 pods will be scheduled shortly")`,
  },
]

type CompKey = 'user' | 'apiserver' | 'etcd' | 'scheduler' | 'controller' | 'node1' | 'node2' | 'kubelet1' | 'kubelet2' | 'proxy'

const COMP_LABELS: Record<CompKey, string> = {
  user: 'kubectl', apiserver: 'API Server', etcd: 'etcd',
  scheduler: 'Scheduler', controller: 'Controller Mgr',
  node1: 'Worker Node 1', node2: 'Worker Node 2',
  kubelet1: 'Kubelet (N1)', kubelet2: 'Kubelet (N2)', proxy: 'kube-proxy',
}

const POD_STATE_COLOR: Record<Step['podState'], string> = {
  none: 'bg-slate-300 dark:bg-slate-600',
  pending: 'bg-amber-400',
  scheduled: 'bg-blue-400',
  creating: 'bg-violet-400',
  running: 'bg-emerald-500',
}

const DOUBTS = [
  {
    q: 'Pod vs container — why the extra wrapper?',
    a: 'A pod is the smallest schedulable unit in Kubernetes: one or more containers that share a network namespace (same IP, same `localhost`), share volumes, and are always scheduled, started, and killed together.\nThe wrapper exists because some containers are only useful as a tightly-coupled pair, and the scheduler must never split them. If your app container lands on Worker Node 1, its sidecar lands there too — guaranteed. Concretely, in an Istio service mesh every application pod also runs an `istio-proxy` (Envoy) sidecar that intercepts all traffic; it only works because it shares the app\'s IP. Same story for a Fluent Bit log shipper tailing files from a shared `emptyDir` volume.\nWhat sharing a pod buys you:\n- One IP per pod — containers talk over `localhost:port`, no service discovery needed between them.\n- Shared volumes — one container writes, the other reads.\n- One lifecycle — created and garbage-collected as a unit; a Deployment scales pods, never individual containers.\n**Rule of thumb:** one main process per container, one tightly-coupled unit per pod. If two containers could sensibly scale independently, they belong in separate pods.',
  },
  {
    q: 'What does "desired state reconciliation" actually mean?',
    a: 'It means you declare a target ("3 replicas of nginx") and controllers run an endless loop that measures reality against that target and acts to close any gap. You never say "start a pod" — you say "3 should exist" and the cluster converges.\nMechanically, every controller follows the same three beats:\n- Observe — watch the API server for actual state (the ReplicaSet controller sees 2 running nginx pods).\n- Compare — diff against the desired state recorded in etcd (the spec says `replicas: 3`).\n- Act — issue the smallest correction (create 1 Pod object), then loop again.\nThis is why killing a pod with `kubectl delete pod nginx-xyz` looks like a restart but isn\'t: nothing "restarts" anything. The ReplicaSet controller simply notices 2 != 3 on its next pass and creates a fresh pod with a new name and IP. The same loop handles scale-ups (desired jumped to 10), node failures (pods vanished, recreate them elsewhere), and rollbacks — one mechanism, no special-case code. It also makes operations idempotent: applying the same manifest twice is a no-op because the diff is zero.\n**Interview tip:** if asked "how does Kubernetes self-heal?", the sharp answer is that there is no separate healing feature — the reconciliation loop IS the feature.',
  },
  {
    q: 'Why do I need a Service if every pod has an IP?',
    a: 'Because pod IPs are ephemeral: every reschedule, eviction, or rollout mints a brand-new one. A Service gives you a single stable virtual IP (ClusterIP) and DNS name that load-balances across whichever pods currently match its label selector.\nConsider the failure mode without one. Your frontend hardcodes `10.244.1.7` for a backend pod. A node drains during an upgrade, the pod comes back on another node as `10.244.3.12`, and the frontend is now pointing at nothing. During a rolling deploy of 10 replicas, all 10 IPs churn within a couple of minutes.\nHow a Service fixes it:\n- The Service gets a fixed ClusterIP (say `10.96.0.15`) and a DNS name like `backend.default.svc.cluster.local` that never change.\n- The endpoints controller continuously tracks which ready pods match the selector `app: backend`.\n- `kube-proxy` programs iptables/IPVS rules on every node so traffic to the ClusterIP is spread across the live pod IPs.\nReadiness probes plug into this: a pod failing its probe is removed from the endpoint list, so the Service silently stops routing to it — no client changes needed.\n**Rule of thumb:** never store a pod IP anywhere. Talk to Services — or a headless Service if you genuinely need per-pod addressing.',
  },
  {
    q: 'Deployment vs StatefulSet?',
    a: 'Use a Deployment for interchangeable, stateless pods — web servers, stateless APIs. Use a StatefulSet when each pod needs a durable identity and its own storage. Deployments treat pods as cattle; StatefulSets treat them as numbered pets.\nWhat "sticky identity" actually means in a StatefulSet:\n- Stable names — pods are `db-0`, `db-1`, `db-2`, not random suffixes like `web-7d4b9-x2k1p`. If `db-1` dies, its replacement is named `db-1` again and reattaches the same disk.\n- Per-pod storage — `volumeClaimTemplates` give each replica its own PersistentVolume that survives rescheduling.\n- Ordered operations — pods start 0 then 1 then 2 and terminate in reverse, so a follower never boots before its leader.\n- Stable DNS via a headless Service — `db-0.db.default.svc.cluster.local` always reaches that specific pod.\nThat is exactly what databases and quorum systems need: a Kafka broker or PostgreSQL replica must come back with the same identity and data, or the cluster treats it as a stranger and triggers expensive re-replication. An nginx pod needs none of this — any replica can serve any request, so a Deployment\'s cheap, parallel, identity-free replacement is ideal.\n**Common mistake:** reaching for a StatefulSet just because the app writes files. If the data is a cache or can be rebuilt, a Deployment (optionally with a PVC) is simpler.',
  },
]

export default function KubernetesVisualizer() {
  const steps = k8sSteps()
  const ctrl = useSteps(steps.length)
  const cur = steps[ctrl.step]
  const isActive = (k: string) => cur.active.includes(k)

  const compBox = (key: CompKey, group: 'control' | 'node1' | 'node2') => {
    const groupColors = { control: 'border-violet-300 dark:border-violet-700', node1: 'border-blue-300 dark:border-blue-700', node2: 'border-blue-300 dark:border-blue-700' }
    return (
      <div key={key} className={`text-center py-1.5 px-2 rounded-lg border text-xs font-medium transition-all duration-300 ${
        isActive(key)
          ? 'bg-violet-500 dark:bg-violet-600 text-white border-violet-600 scale-105 shadow-md'
          : `bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${groupColors[group]}`
      }`}>
        {COMP_LABELS[key]}
      </div>
    )
  }

  const podDot = (state: Step['podState'], show: boolean) => (
    <div className={`w-3 h-3 rounded-full transition-all duration-500 ${show ? POD_STATE_COLOR[state] : 'bg-slate-200 dark:bg-slate-700'}`} />
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kubernetes Architecture</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Follow a kubectl apply through the control plane until 3 nginx pods reach Running state</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">The Scenario</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          You want to deploy 3 nginx web servers. You declare the desired state in a YAML manifest and run <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">kubectl apply</code>.
          Kubernetes — not you — figures out which nodes to use, pulls the image, starts containers, and continuously reconciles reality to match your declaration.
          If a pod crashes, Kubernetes restarts it automatically.
        </p>
      </div>

      <MemoryTip>Declare the destination; controllers keep steering reality back toward it.</MemoryTip>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-1">The control loop (why K8s is declarative)</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Every K8s controller runs an infinite loop: <strong>observe</strong> actual state → <strong>compare</strong> with desired state → <strong>act</strong> to close the gap.
          etcd is the single source of truth for desired state. This means you never issue imperative commands ("start pod") — you declare <em>what you want</em>, and the cluster continuously converges to it.
        </p>
      </div>

      <div className="viz-container p-6 space-y-5">
        {/* Control Plane */}
        <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 p-4">
          <div className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-3 uppercase tracking-wider">Control Plane</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['apiserver', 'etcd', 'scheduler', 'controller'] as const).map(k => compBox(k, 'control'))}
          </div>
        </div>

        {/* Worker Nodes */}
        <div className="grid grid-cols-2 gap-4">
          {([['node1', 'kubelet1', [0, 1]] as const, ['node2', 'kubelet2', [2, 3]] as const]).map(([nodeKey, kubeletKey, podIdxs]) => (
            <div key={nodeKey} className="rounded-xl border-2 border-blue-200 dark:border-blue-800 p-3">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">
                {nodeKey === 'node1' ? 'Worker Node 1' : 'Worker Node 2'}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {compBox(nodeKey, nodeKey as 'node1' | 'node2')}
                {compBox(kubeletKey, nodeKey as 'node1' | 'node2')}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                <div className="text-[10px] text-slate-400 mb-1.5">Pods</div>
                <div className="flex gap-2">
                  {podIdxs.map(idx => (
                    <div key={idx} className="flex items-center gap-1">
                      {podDot(cur.podState, cur.podState !== 'none' && (nodeKey === 'node1' ? idx < 2 : idx >= 2))}
                      <span className="text-[10px] text-slate-500">nginx-{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pod state legend + kubectl user */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <div className={`w-4 h-4 rounded-lg ${isActive('user') ? 'bg-violet-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-500'} flex items-center justify-center text-[10px]`}>⌨</div>
            kubectl (you)
          </div>
          {(['pending', 'scheduled', 'creating', 'running'] as const).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${POD_STATE_COLOR[s]}`} />
              <span className="capitalize text-slate-600 dark:text-slate-400">{s}</span>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2.5 text-center">
          {cur.message}
        </div>
      </div>

      <StepControls ctrl={ctrl} />
      <CodeTabs doubts={DOUBTS} examples={CODE_EXAMPLES} />
    </div>
  )
}
