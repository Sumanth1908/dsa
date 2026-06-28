import React from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

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
      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
