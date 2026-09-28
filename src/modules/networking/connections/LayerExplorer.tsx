import { useState } from 'react'

const LAYERS = [
  {
    number: 7, name: 'Application', examples: 'HTTP · gRPC · WebSocket · DNS',
    job: 'Define what the two programs are asking for, and how they phrase messages to each other.',
    data: 'Requests, responses, and other application messages.',
    story: 'Your shopping app asks for product 123. HTTP turns that into a resource request. gRPC turns it into a method call. A WebSocket message can carry whatever your app defines.',
    connection: 'One connection can carry many application operations. A login session or a chat subscription has its own lifetime — separate from the connection underneath it.',
  },
  {
    number: 6, name: 'Presentation', examples: 'Encoding · serialization · encryption',
    job: 'Put information into a format both sides understand, and protect it when needed.',
    data: 'Encoded or encrypted data — for example JSON, Protobuf, or TLS-protected bytes.',
    story: 'The product data becomes bytes. TLS encrypts the traffic. The receiver decrypts it, then decodes the application data.',
    connection: 'TLS keeps its own encryption state, separate from TCP’s delivery state. Real protocols don’t sort cleanly into OSI’s seven boxes — TLS isn’t really a standalone layer on its own.',
  },
  {
    number: 5, name: 'Session', examples: 'Dialog coordination · session context',
    job: 'Organize an ongoing dialog — this is OSI’s label for that responsibility.',
    data: 'Conversation context: checkpoints or session info, depending on the protocol.',
    story: 'An app can remember a subscription and know which updates a client has already seen. Different systems put this logic in different places.',
    connection: 'A login session can outlive a TCP connection. In practice, most software builds session logic into the application layer instead of a separate session layer.',
  },
  {
    number: 4, name: 'Transport', examples: 'TCP · UDP',
    job: 'Move data between a port on one host and a port on another.',
    data: 'TCP segments (ordered bytes), or UDP datagrams.',
    story: 'For ordinary HTTPS, TCP tracks an ordered conversation between a client port and a server port. UDP just sends datagrams — no handshake first.',
    connection: 'A TCP connection is real state kept on both ends: sequence numbers, acknowledgments, buffers. QUIC builds its own connections on top of UDP for HTTP/3.',
  },
  {
    number: 3, name: 'Network', examples: 'IPv4 · IPv6 · routers',
    job: 'Address packets and route them across connected networks.',
    data: 'IP packets, each carrying a source and destination address.',
    story: 'Your laptop’s routing table picks a gateway for the remote server. Routers forward the packet one hop at a time toward its destination.',
    connection: 'IP is connectionless and best-effort. It just carries packets — including the ones that make up a TCP handshake.',
  },
  {
    number: 2, name: 'Data link', examples: 'Ethernet · Wi-Fi · MAC · switches',
    job: 'Deliver data across one local network.',
    data: 'Frames, addressed for delivery on that local link.',
    story: 'An Ethernet frame headed to the internet is addressed to your gateway’s MAC — not the remote server’s. A switch forwards the frame; the gateway routes the packet onward.',
    connection: 'A Wi-Fi or Ethernet link handles local delivery only. One link carries traffic for many separate connections at once.',
  },
  {
    number: 1, name: 'Physical', examples: 'Copper · fiber · radio · transceivers',
    job: 'Turn bits into signals, and turn signals back into bits.',
    data: 'Electrical, optical, or radio signals.',
    story: 'Your network card transmits onto a cable, fiber, or radio wave. The next device decodes the signal and forwards it on.',
    connection: 'A cable can be plugged in with zero TCP connections running. One physical link carries many connections at once. Loopback traffic never leaves the machine.',
  },
]

export default function LayerExplorer() {
  const [selected, setSelected] = useState(6)
  const layer = LAYERS[selected]

  return (
    <section aria-label="Explore every networking layer" className="rounded-xl border border-cyan-200 dark:border-cyan-800 p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">From your program to a wire — and back</h2>
        <p className="mt-2">Pick a layer to see its job, the data it handles, and what “connection” means there. Sending goes down the stack toward signals. Receiving goes back up toward the application.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div role="group" aria-label="OSI layers" className="space-y-2">
          {LAYERS.map((item, index) => (
            <button type="button" key={item.number} onClick={() => setSelected(index)} aria-pressed={selected === index}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${selected === index
                ? 'border-cyan-600 bg-cyan-50 text-cyan-900 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-100'
                : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'}`}>
              <span className="block font-semibold">Layer {item.number}: {item.name}</span>
              <span className="block text-xs mt-1">{item.examples}</span>
            </button>
          ))}
        </div>
        <div aria-live="polite" aria-atomic="true" className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800 space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Layer {layer.number}: {layer.name}</h3>
          <dl className="space-y-4">
            <div><dt className="font-semibold">Its job</dt><dd className="mt-1">{layer.job}</dd></div>
            <div><dt className="font-semibold">What it handles</dt><dd className="mt-1">{layer.data}</dd></div>
            <div><dt className="font-semibold">In the shopping-app example</dt><dd className="mt-1">{layer.story}</dd></div>
            <div><dt className="font-semibold">How it relates to a connection</dt><dd className="mt-1">{layer.connection}</dd></div>
          </dl>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">OSI describes responsibilities, not separate programs. Real software usually merges layers 5–7 into one application layer. The chapters below cover the hardware, protocols, and exceptions in detail.</p>
      <figure className="rounded-lg bg-slate-900 p-4 text-slate-100 min-w-0">
        <figcaption className="font-semibold mb-2">One end-to-end journey, many local links</figcaption>
        <pre className="overflow-x-auto whitespace-pre text-xs leading-6">{`YOUR COMPUTER                 SHARED NETWORK                 SERVER COMPUTER
App + libraries                                             App + libraries
      |                                                            ^
OS + sockets                                                OS + sockets
      |                                                            ^
Driver + NIC                                                Driver + NIC
      |                                                            ^
cable / radio -> switch / access point -> routers -> final link ----+

Signals cross individual links. Routers forward IP packets.
TCP endpoints keep the connection state. Applications understand the request.
The response travels back through the same kinds of layers.`}</pre>
      </figure>
    </section>
  )
}
