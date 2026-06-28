import React, { useState } from 'react'
import { useSteps } from '@/hooks/useSteps'
import StepControls from '@/components/shared/StepControls'
import CodeBlock from '@/components/shared/CodeBlock'

interface PipelineStep {
  stage: string
  icon: string
  description: string
  detail: string
  outputs?: string[]
  color: string
  bg: string
  border: string
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    stage: 'Upload', icon: '⬆️',
    description: 'Raw video lands in object storage (S3)',
    detail: 'Client uploads to pre-signed S3 URL directly — bypasses your server. After upload, S3 triggers an event to kick off processing.',
    outputs: ['s3://raw/uuid/video.mp4'],
    color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700',
  },
  {
    stage: 'Transcode', icon: '🎬',
    description: 'FFmpeg generates 3 quality levels in parallel',
    detail: 'Transcoding is CPU-bound. Workers pull from SQS queue. Each worker converts to one quality: 1080p (H.264), 720p, 480p. Takes ~2 min per minute of video.',
    outputs: ['1080p (H.264, ~4 Mbps)', '720p (H.264, ~2 Mbps)', '480p (H.264, ~1 Mbps)'],
    color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700',
  },
  {
    stage: 'Segment', icon: '✂️',
    description: 'Each quality split into 6-second chunks',
    detail: 'HLS (HTTP Live Streaming) chunks each quality into small .ts files. Smaller chunks = faster quality switches. 6s is the industry sweet spot.',
    outputs: ['1080p/000.ts, 001.ts, 002.ts…', '720p/000.ts, 001.ts…', '480p/000.ts, 001.ts…'],
    color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700',
  },
  {
    stage: 'Manifest', icon: '📋',
    description: 'HLS .m3u8 playlist files generated',
    detail: 'A master playlist lists all quality variants. Each variant has its own playlist listing chunk URLs and durations. The player reads the master first, then fetches a variant playlist.',
    outputs: ['master.m3u8', '1080p/index.m3u8', '720p/index.m3u8', '480p/index.m3u8'],
    color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    stage: 'CDN Push', icon: '🌐',
    description: 'All chunks pushed to CDN origin, distributed to edge nodes',
    detail: 'Origin server → CDN pull (lazy) or CDN push (proactive). Popular videos pre-warmed on edges. Edge server chosen by GeoDNS based on viewer location.',
    outputs: ['edge-us-east/', 'edge-eu-west/', 'edge-ap-south/'],
    color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-300 dark:border-sky-700',
  },
  {
    stage: 'Play', icon: '▶️',
    description: 'Client fetches master.m3u8, starts downloading chunks',
    detail: 'Player picks starting quality based on network speed. ABR algorithm monitors download speed each chunk and switches quality up/down. User sees no buffering.',
    outputs: ['Adaptive Bitrate (ABR) streaming'],
    color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-700',
  },
]

const CHUNK_SEQUENCE = [
  { from: 'Player', to: 'CDN Edge', msg: 'GET /master.m3u8', latency: '8ms' },
  { from: 'CDN', to: 'Player', msg: 'master.m3u8 (lists 1080p, 720p, 480p variants)', latency: '8ms' },
  { from: 'Player', to: 'CDN Edge', msg: 'GET /720p/index.m3u8 (starts at 720p — moderate network)', latency: '8ms' },
  { from: 'CDN', to: 'Player', msg: '720p playlist: chunk 000 at t=0, chunk 001 at t=6…', latency: '8ms' },
  { from: 'Player', to: 'CDN Edge', msg: 'GET /720p/000.ts', latency: '22ms' },
  { from: 'CDN', to: 'Player', msg: '6s chunk (2MB) — plays while chunk 001 downloads', latency: '95ms' },
  { from: 'Player', to: 'CDN Edge', msg: 'GET /1080p/001.ts (ABR: bandwidth improved → upgrade)', latency: '18ms' },
  { from: 'CDN', to: 'Player', msg: '6s chunk at 1080p quality — seamless switch', latency: '180ms' },
  { from: 'Player', to: 'CDN Edge', msg: 'GET /480p/002.ts (ABR: poor WiFi detected → downgrade)', latency: '12ms' },
  { from: 'CDN', to: 'Player', msg: '6s chunk at 480p — no buffering, degraded quality', latency: '45ms' },
]

const CODE_EXAMPLES = [
  {
    lang: 'python' as const, label: 'Python (FFmpeg transcode)',
    code: `import subprocess
import boto3
import json
from pathlib import Path

s3 = boto3.client("s3")

# ─── TRANSCODE ONE QUALITY LEVEL ─────────────────────────────
def transcode(input_path: str, output_dir: str, quality: str) -> str:
    profiles = {
        "1080p": {"size": "1920x1080", "bitrate": "4000k", "audio": "192k"},
        "720p":  {"size": "1280x720",  "bitrate": "2000k", "audio": "128k"},
        "480p":  {"size": "854x480",   "bitrate": "1000k", "audio": "96k"},
    }
    p = profiles[quality]
    output_path = f"{output_dir}/{quality}"
    Path(output_path).mkdir(parents=True, exist_ok=True)

    # -hls_time 6 → 6-second chunks
    # -hls_segment_filename → chunk naming pattern
    # -hls_playlist_type vod → complete playlist on finish
    subprocess.run([
        "ffmpeg", "-i", input_path,
        "-vf", f"scale={p['size']}",
        "-c:v", "libx264", "-b:v", p["bitrate"], "-preset", "fast",
        "-c:a", "aac", "-b:a", p["audio"],
        "-hls_time", "6",
        "-hls_list_size", "0",
        "-hls_segment_filename", f"{output_path}/%03d.ts",
        "-hls_playlist_type", "vod",
        f"{output_path}/index.m3u8"
    ], check=True)
    return output_path

# ─── GENERATE MASTER PLAYLIST ─────────────────────────────────
def create_master_playlist(video_id: str) -> str:
    return f"""#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
https://cdn.example.com/{video_id}/1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
https://cdn.example.com/{video_id}/720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480
https://cdn.example.com/{video_id}/480p/index.m3u8
"""

# ─── WORKER (triggered by SQS) ────────────────────────────────
def process_video(sqs_event: dict):
    for record in sqs_event["Records"]:
        body = json.loads(record["body"])
        video_id = body["videoId"]
        s3_key = body["s3Key"]

        # Download from S3
        input_path = f"/tmp/{video_id}.mp4"
        s3.download_file("raw-videos", s3_key, input_path)

        # Transcode all 3 qualities in parallel (real impl: 3 separate workers)
        for quality in ["1080p", "720p", "480p"]:
            transcode(input_path, f"/tmp/{video_id}", quality)

        # Upload chunks + playlists to S3 CDN origin
        # ... (upload all .ts files and .m3u8 playlists)

        # Create master playlist
        master = create_master_playlist(video_id)
        s3.put_object(Bucket="cdn-origin", Key=f"{video_id}/master.m3u8", Body=master)`,
  },
  {
    lang: 'javascript' as const, label: 'JavaScript (HLS.js player)',
    code: `import Hls from 'hls.js'

// ─── HLS ADAPTIVE BITRATE PLAYER ──────────────────────────────
const initPlayer = (videoId, videoElement) => {
    if (!Hls.isSupported()) {
        // Safari supports HLS natively
        videoElement.src = \`https://cdn.example.com/\${videoId}/master.m3u8\`
        return
    }

    const hls = new Hls({
        // ABR (Adaptive Bitrate) configuration
        startLevel: -1,          // -1 = auto-detect starting quality
        abrEwmaDefaultEstimate: 500000,  // initial bandwidth estimate: 500kbps
        abrBandWidthFactor: 0.95,        // use 95% of measured bandwidth (safety margin)
        abrBandWidthUpFactor: 0.7,       // be conservative switching UP
        maxBufferLength: 30,             // buffer up to 30s of video ahead
        maxMaxBufferLength: 600,
    })

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const qualities = ['480p', '720p', '1080p']
        console.log(\`Quality switched to: \${qualities[data.level]}\`)
    })

    hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        // data.stats.bw = measured bandwidth in bits/s for this fragment
        const mbps = (data.stats.bw / 1_000_000).toFixed(1)
        console.log(\`Chunk loaded, measured bandwidth: \${mbps} Mbps\`)
    })

    hls.loadSource(\`https://cdn.example.com/\${videoId}/master.m3u8\`)
    hls.attachMedia(videoElement)
    hls.on(Hls.Events.MANIFEST_PARSED, () => videoElement.play())

    return hls
}

// ─── CLOUDFRONT CACHE INVALIDATION ────────────────────────────
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'

const invalidateVideo = async (videoId) => {
    const cf = new CloudFrontClient({})
    await cf.send(new CreateInvalidationCommand({
        DistributionId: process.env.CF_DISTRIBUTION_ID,
        InvalidationBatch: {
            CallerReference: \`del-\${videoId}-\${Date.now()}\`,
            Paths: { Quantity: 1, Items: [\`/\${videoId}/*\`] },
        },
    }))
}`,
  },
  {
    lang: 'java' as const, label: 'Java (AWS Lambda worker)',
    code: `import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;
import com.amazonaws.services.lambda.runtime.*;

public class VideoProcessor implements RequestHandler<SQSEvent, Void> {
    private final S3Client s3 = S3Client.create();
    private final String ffmpegPath = "/opt/bin/ffmpeg";  // Lambda layer

    // Record = one SQS message = one video to process
    @Override
    public Void handleRequest(SQSEvent event, Context context) {
        event.getRecords().parallelStream().forEach(record -> {
            var body = Json.parse(record.getBody());
            String videoId = body.get("videoId").asText();
            String s3Key = body.get("s3Key").asText();

            try {
                processVideo(videoId, s3Key);
            } catch (Exception e) {
                context.getLogger().log("Failed to process " + videoId + ": " + e.getMessage());
                throw new RuntimeException(e);  // message returns to queue for retry
            }
        });
        return null;
    }

    private void processVideo(String videoId, String s3Key) throws Exception {
        // Download from S3 to /tmp (Lambda has 10GB ephemeral storage)
        Path inputPath = Path.of("/tmp/" + videoId + ".mp4");
        s3.getObject(r -> r.bucket("raw-videos").key(s3Key), inputPath);

        // Transcode all 3 quality levels in parallel threads
        List.of("1080p", "720p", "480p").parallelStream().forEach(quality -> {
            try {
                transcode(inputPath.toString(), videoId, quality);
            } catch (Exception e) {
                throw new RuntimeException("Transcode failed for " + quality, e);
            }
        });

        // Upload outputs to CDN origin bucket
        uploadOutputs(videoId);

        // Update DB: video status = "ready"
        videoRepository.updateStatus(videoId, VideoStatus.READY);
    }

    private void transcode(String input, String videoId, String quality) throws Exception {
        Map<String, String[]> profiles = Map.of(
            "1080p", new String[]{"1920x1080", "4000k"},
            "720p",  new String[]{"1280x720",  "2000k"},
            "480p",  new String[]{"854x480",   "1000k"}
        );
        // Run ffmpeg with HLS segmentation (-hls_time 6)
        // ... (ProcessBuilder call)
    }
}`,
  },
]

export default function VideoProcessingViz() {
  const [activeStage, setActiveStage] = useState<number | null>(null)
  const [tab, setTab] = useState<'pipeline' | 'stream'>('pipeline')
  const steps = CHUNK_SEQUENCE
  const ctrl = useSteps(steps.length)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Video Processing Pipeline</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          From raw upload to adaptive bitrate streaming — how YouTube, Netflix, and TikTok process video at scale
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          A 10-minute 1080p video uploaded by a creator becomes ~40 files — 3 qualities × ~13 chunks each — plus 4 playlist files, distributed across edge servers on every continent. This pipeline runs in ~20 minutes after upload.
        </p>
      </div>

      <div className="flex gap-2">
        {[{ id: 'pipeline' as const, label: 'Processing Pipeline' }, { id: 'stream' as const, label: 'Adaptive Bitrate (ABR)' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="viz-container p-6">
        {tab === 'pipeline' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 text-center">Click a stage to see details</p>
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i}>
                <button
                  onClick={() => setActiveStage(activeStage === i ? null : i)}
                  className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    activeStage === i ? `${step.border} ${step.bg}` : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}>
                  <span className="text-2xl flex-shrink-0">{step.icon}</span>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${activeStage === i ? step.color : 'text-slate-700 dark:text-slate-300'}`}>{step.stage}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{step.description}</div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && activeStage !== i && (
                    <span className="text-slate-300 dark:text-slate-600 text-sm">→</span>
                  )}
                  <span className="text-slate-400 text-xs">{activeStage === i ? '▲' : '▼'}</span>
                </button>
                {activeStage === i && (
                  <div className={`rounded-b-xl border-2 border-t-0 ${step.border} ${step.bg} px-6 py-4 space-y-3`}>
                    <p className={`text-sm ${step.color}`}>{step.detail}</p>
                    {step.outputs && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Outputs</div>
                        <div className="flex flex-wrap gap-2">
                          {step.outputs.map((o, j) => (
                            <span key={j} className="font-mono text-xs px-2 py-1 rounded bg-white/70 dark:bg-black/20 border border-current border-opacity-30">{o}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'stream' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Step through an HLS session — watch the player switch quality based on network conditions
            </p>
            <div className="space-y-1.5">
              {steps.map((s, i) => {
                const isActive = i === ctrl.step - 1
                const isPast = i < ctrl.step - 1
                const isPlayer = s.from === 'Player'
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 transition-all duration-300 ${
                    isActive ? 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 scale-[1.01]' :
                    isPast ? 'border-slate-100 dark:border-slate-800 opacity-60' :
                    'border-transparent opacity-30'
                  }`}>
                    <span className={`text-xs font-bold w-16 flex-shrink-0 mt-0.5 ${isPlayer ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {s.from} →
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{s.msg}</span>
                    {(isActive || isPast) && (
                      <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{s.latency}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <StepControls ctrl={ctrl} />
          </div>
        )}
      </div>

      <CodeBlock examples={CODE_EXAMPLES} />
    </div>
  )
}
