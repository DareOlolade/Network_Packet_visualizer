Phase 0: Understand the Concepts First
Before writing a single line of code, you need to understand what's actually happening. Don't skip this.

0.1 — What Is a Network Packet?
text

Every piece of data sent over a network is broken into small chunks
called "packets." Each packet has:

┌─────────────────────────────────────────────────────┐
│  PACKET                                             │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Headers    │  │   Headers    │  │  Payload  │ │
│  │  (Layer 2)   │  │  (Layer 3+)  │  │  (Data)   │ │
│  │  MAC addrs   │  │  IP addrs    │  │           │ │
│  │              │  │  Ports       │  │           │ │
│  │              │  │  Protocol    │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
What to study:

 OSI Model (focus on Layers 2, 3, and 4)
 What an IP address is (source vs. destination)
 What TCP, UDP, and ICMP are at a high level
 What a port number represents
 Open Wireshark, capture for 30 seconds, and just look at the packets
Resources:

Search: "OSI model explained simply"
Open Wireshark → start capturing → browse a website → stop → inspect 5 packets manually
Read the packet details: source IP, destination IP, protocol, length

0.2 — What Is Packet Sniffing?
text

Your Network Interface Card (NIC) normally only processes
packets addressed TO your machine.

"Promiscuous mode" tells the NIC: "Give me EVERYTHING you see."

Normal mode:      Only your packets
Promiscuous mode: All packets on the network segment
What to study:

 Why sniffing requires root/admin privileges
 What "promiscuous mode" means
 The difference between sniffing on WiFi vs. Ethernet
 Legal and ethical considerations (only sniff YOUR network)
0.3 — What Is a Force-Directed Graph?
text

Nodes = circles (IP addresses)
Edges = lines connecting them (packets sent between IPs)

Physics simulation:
  - Nodes REPEL each other (like magnets with same pole)
  - Edges ACT AS SPRINGS (pull connected nodes together)
  - Result: connected clusters group together naturally

     ○ ─── ○
    / \     |
   ○   ○   ○
       |
       ○
What to study:

 Play with this: https://d3js.org/d3-force
 Understand: nodes, links, forces (charge, center, link)
 Open the D3 force graph example and modify values to see what changes
 Understand what a simulation "tick" is
 0.4 — What Is WebSocket Communication?
text

Traditional HTTP:
  Client: "Any new data?" → Server: "No."
  Client: "Any new data?" → Server: "No."
  Client: "Any new data?" → Server: "Yes! Here."
  (Wasteful polling)

WebSocket:
  Client ←──persistent connection──→ Server
  Server: "Here's new data!" (pushes instantly)
  Server: "Here's more!" (pushes instantly)
  (Real-time, efficient)
What to study:

 HTTP request/response vs. WebSocket persistent connection
 Why WebSockets are essential for real-time applications
 What Socket.IO is and why it's easier than raw WebSockets
Phase 1: Set Up Your Environment
1.1 — Choose Your Tech Stack
text

Here's what you'll use and WHY:

┌─────────────────────────────────────────────────────────┐
│  BACKEND (Python)                                       │
│                                                         │
│  Scapy ──── Captures raw packets from your NIC          │
│             WHY: Most powerful Python packet library     │
│             WHY: Can parse ALL protocol layers           │
│                                                         │
│  Flask ──── Lightweight web server                      │
│             WHY: Serves your HTML/JS frontend            │
│             WHY: Minimal boilerplate                     │
│                                                         │
│  Flask-SocketIO ── Real-time WebSocket bridge            │
│             WHY: Pushes packet data to browser instantly │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FRONTEND (Browser)                                     │
│                                                         │
│  D3.js ──── Force-directed graph rendering              │
│             WHY: Industry standard for data viz          │
│             WHY: Built-in force simulation               │
│                                                         │
│  Socket.IO client ── Receives real-time packet data     │
│             WHY: Matches Flask-SocketIO on backend       │
│                                                         │
│  Canvas or SVG ── Actual drawing surface                │
│             WHY: Canvas for performance with many nodes  │
└─────────────────────────────────────────────────────────┘
1.2 — Install Prerequisites
text

Step-by-step:

1. Make sure you have Python 3.8+ installed
   $ python3 --version

2. Create a project directory
   $ mkdir packet-visualizer
   $ cd packet-visualizer

3. Create a virtual environment (isolates your dependencies)
   $ python3 -m venv venv
   $ source venv/bin/activate        # Linux/Mac
   $ venv\Scripts\activate            # Windows

4. Install Python packages
   $ pip install scapy flask flask-socketio eventlet

5. Create your project structure:

   packet-visualizer/
   ├── sniffer.py              # Packet capture logic
   ├── app.py                  # Flask server + WebSocket
   ├── packet_processor.py     # Parse raw packets into clean data
   ├── static/
   │   ├── js/
   │   │   ├── graph.js        # D3 force graph
   │   │   ├── socket.js       # WebSocket client
   │   │   └── effects.js      # Visual effects
   │   └── css/
   │       └── style.css       # Dark theme styling
   └── templates/
       └── index.html          # Main page
1.3 — Verify Scapy Works
text

This is your FIRST checkpoint. Don't proceed until this works.

$ sudo python3          # Must be root/admin for sniffing!

>>> from scapy.all import sniff
>>> packets = sniff(count=5)
>>> packets.summary()

You should see 5 captured packets printed out.
If this fails, troubleshoot before moving on.

Common issues:
  - Not running as root/sudo
  - On macOS: may need to install libpcap
  - On Windows: need Npcap installed (from npcap.com)
  - Firewall blocking promiscuous mode
Phase 2: Build the Packet Capture Backend
2.1 — Understand Scapy's sniff() Function
Python

# Study these parameters — you'll use all of them:

sniff(
    iface="eth0",          # Which network interface to listen on
    prn=callback_function, # Function called for EACH packet
    filter="ip",           # BPF filter (like Wireshark filters)
    store=False,           # Don't store packets in memory (important!)
    count=0                # 0 = infinite, sniff forever
)

# The 'prn' callback is the KEY concept:
# Every time a packet arrives, YOUR function gets called with that packet.
# This is event-driven programming.
Task: Write a script that sniffs 20 packets and prints the source IP, destination IP, and protocol of each one. Get this working before anything else.

2.2 — Build the Packet Processor
text

This module takes a raw Scapy packet and extracts ONLY
what you need for visualization.

For each packet, extract:
┌──────────────────────────────────────┐
│  source_ip:    "192.168.1.5"         │
│  dest_ip:      "142.250.80.46"       │
│  protocol:     "TCP" / "UDP" / etc.  │
│  size:         1420 (bytes)          │
│  src_port:     54321 (if applicable) │
│  dst_port:     443   (if applicable) │
│  timestamp:    1699999999.123        │
└──────────────────────────────────────┘

Things to handle:
  - Packets without IP layer (ARP, etc.) → skip or handle separately
  - IPv6 packets → decide: support or filter out initially
  - Packets without transport layer → still capture, protocol = "OTHER"
Task: Build a function process_packet(packet) that:

Checks if the packet has an IP layer
Extracts the fields listed above
Returns a dictionary (or None if packet should be skipped)
Test it with 50 live packets and print the dictionaries
2.3 — Think About Threading
text

CRITICAL CONCEPT:

Scapy's sniff() is BLOCKING — it runs forever and never returns.
Your web server ALSO needs to run continuously.
They cannot run in the same thread.

Solution: Run the sniffer in a BACKGROUND THREAD.

Main Thread:     Flask web server (serves pages, handles WebSocket)
Background Thread: Scapy sniffer (captures packets, sends to main thread)

How they communicate:
  Option A: Python Queue (thread-safe)
  Option B: Direct callback that emits via SocketIO

Start with Option B — it's simpler:
  The sniff callback directly calls socketio.emit()
What to study:

 Python threading module basics
 What "thread-safe" means
 What a daemon thread is (and why you want the sniffer to be one)
 How threading.Thread(target=func, daemon=True).start() works
2.4 — Add Rate Limiting
text

PROBLEM: A busy network can generate hundreds of packets per second.
If you send every single one to the browser, you'll:
  1. Overwhelm the WebSocket connection
  2. Crash the browser trying to render all of them
  3. Make the graph unreadable

SOLUTION: Batch and throttle.

Strategy:
  - Collect packets for 100-200ms
  - Send them as a BATCH to the frontend
  - On the frontend, animate them in over time

Implementation approach:
  - Use a list/buffer to accumulate processed packets
  - Use a periodic timer (every 200ms) to flush the buffer
  - Send the batch via WebSocket, then clear the buffer
Task: Implement a batching system:

Sniffer callback adds processed packets to a shared list
A separate timer (or SocketIO background task) runs every 200ms
Timer grabs all accumulated packets, emits them, clears the list
Use a threading Lock to make the shared list safe
Phase 3: Build the Real-Time Communication Layer
3.1 — Set Up Flask + SocketIO Server
text

Your app.py needs to do these things:

1. Create a Flask app
2. Wrap it with SocketIO
3. Serve the index.html template at route "/"
4. Handle WebSocket events:
   - "connect": client connected → maybe send current graph state
   - "disconnect": client disconnected → clean up
5. Start the sniffer thread when the server starts
6. Emit packet batches on a channel like "packet_batch"

Structure your app.py like this (pseudocode):

    create flask app
    create socketio wrapper

    @route("/") → render index.html

    @socketio.on("connect") → log "client connected"
    @socketio.on("disconnect") → log "client disconnected"

    function start_sniffer():
        run sniff() in background thread

    function emit_batch():
        every 200ms:
            if buffer has packets:
                socketio.emit("packet_batch", buffer)
                clear buffer

    if __name__ == "__main__":
        start background task for emit_batch
        start sniffer thread
        socketio.run(app)
Task: Get a minimal version running:

Flask serves a blank HTML page
Page connects via SocketIO (check browser console for "connected")
Backend emits a test message every second
Frontend receives and logs it to console
THEN integrate actual packet data
3.2 — Design Your Data Protocol
text

Define EXACTLY what data structure gets sent over the wire.
This is a contract between backend and frontend.

Emitted event: "packet_batch"
Payload:
{
  "packets": [
    {
      "src": "192.168.1.5",
      "dst": "142.250.80.46",
      "protocol": "TCP",
      "size": 1420,
      "port": 443,
      "timestamp": 1699999999.123
    },
    // ... more packets
  ]
}

WHY define this explicitly:
  - You can test the frontend with FAKE data matching this format
  - You can test the backend by printing this format
  - When you connect them, they just work
  - This is how professional software is built: interface-first design
Task: Before connecting real packets, build a "mock mode":

Backend sends fake packet data in the exact format above
Random source/destination IPs from a pool of 10-15 addresses
Random protocols (TCP, UDP, ICMP, DNS)
This lets you develop the frontend without needing sudo/root
Phase 4: Build the Force Graph Frontend
4.1 — Set Up the HTML Canvas
HTML

<!--
Your index.html needs:
  1. A full-screen canvas (or SVG) element
  2. Socket.IO client library (CDN is fine)
  3. D3.js library (CDN is fine)
  4. Your custom JS files

Think about load order:
  1. Libraries first (D3, Socket.IO)
  2. Your graph.js (sets up the visualization)
  3. Your socket.js (connects and feeds data to the graph)
-->

<!--
Study: what's the difference between Canvas and SVG for this?

SVG:
  + Each node is a DOM element (easy to style, click, hover)
  + D3 bindis data directly to elements
  - Slow with > 500 nodes (too many DOM elements)

Canvas:
  + Fast with thousands of nodes
  - You draw pixels, not elements (harder to do hover/click)
  - Need to manually track what's at each position

RECOMMENDATION: Start with SVG. Switch to Canvas only if needed.
-->
4.2 — Build the Force Simulation (Core of the Visualization)
text

This is the MOST IMPORTANT part. Take your time here.

STEP 1: Understand D3 Force Simulation

  const simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-100))
    .force("center", d3.forceCenter(width/2, height/2))
    .force("link", d3.forceLink(links).id(d => d.id))
    .force("collision", d3.forceCollide().radius(20))
    .on("tick", ticked);

  What each force does:
    charge:    Nodes repel each other (negative = repel)
    center:    Pulls everything toward center of screen
    link:      Connected nodes attract each other (spring)
    collision: Prevents nodes from overlapping

  The "tick" event fires every animation frame.
  In your tick handler, you UPDATE node positions on screen.

STEP 2: Data Structures You Need

  // Nodes: one per unique IP address
  nodes = [
    { id: "192.168.1.5", group: "local", packetCount: 42 },
    { id: "142.250.80.46", group: "external", packetCount: 128 },
    // ...
  ]

  // Links: one per unique connection (src→dst pair)
  links = [
    { source: "192.168.1.5", target: "142.250.80.46", weight: 15, protocol: "TCP" },
    // ...
  ]

STEP 3: The Update Cycle

  When new packets arrive:
    1. For each packet, check if source IP node exists
       - YES → increment its packetCount
       - NO  → create new node, add to nodes array
    2. Same for destination IP
    3. Check if link between src→dst exists
       - YES → increment its weight
       - NO  → create new link, add to links array
    4. Tell the simulation about the updated data
    5. Restart the simulation (so new nodes get positioned)
Task — Build this incrementally:

text

Checkpoint A: Static graph
  - Hardcode 5 nodes and 4 links
  - Get them rendering on screen with D3 force
  - Make sure they move and settle into position
  - Add drag behavior (D3 has built-in drag for force graphs)

Checkpoint B: Dynamic addition
  - Add a button that adds a random node + link when clicked
  - The graph should smoothly accommodate the new elements
  - This tests your update logic

Checkpoint C: Live data
  - Connect to your WebSocket
  - Feed real packet data into the graph
  - Nodes should appear and links should form as packets flow
4.3 — Graph State Management
text

You need a "graph manager" — a module that maintains the current
state of nodes and links and provides clean methods to update them.

Think about these data structures:

  nodeMap = new Map()   // key: IP address, value: node object
  linkMap = new Map()   // key: "srcIP→dstIP", value: link object

  function addPacket(packet):
      // Ensure source node exists
      if not nodeMap.has(packet.src):
          node = { id: packet.src, packetCount: 0, firstSeen: now() }
          nodeMap.set(packet.src, node)

      // Ensure destination node exists
      if not nodeMap.has(packet.dst):
          node = { id: packet.dst, packetCount: 0, firstSeen: now() }
          nodeMap.set(packet.dst, node)

      // Increment counts
      nodeMap.get(packet.src).packetCount += 1
      nodeMap.get(packet.dst).packetCount += 1

      // Ensure link exists
      linkKey = packet.src + "→" + packet.dst
      if not linkMap.has(linkKey):
          link = { source: packet.src, target: packet.dst, weight: 0 }
          linkMap.set(linkKey, link)

      linkMap.get(linkKey).weight += 1

      return { nodes: [...nodeMap.values()], links: [...linkMap.values()] }

WHY a Map and not just an array?
  - Looking up "does this IP exist?" is O(1) with a Map
  - With an array, you'd need to search through every element: O(n)
  - When processing hundreds of packets/second, this matters
4.4 — Updating D3 Without Resetting
text

THE TRICKY PART: D3 force simulations don't like having their
data arrays replaced. You need to MUTATE the existing arrays.

WRONG approach:
  simulation.nodes(newNodesArray)    // Replaces everything
                                      // Positions reset, looks janky

RIGHT approach:
  // Add new nodes to the EXISTING array
  newNodes.forEach(node => existingNodesArray.push(node))

  // Update the simulation
  simulation.nodes(existingNodesArray)
  simulation.force("link").links(existingLinksArray)
  simulation.alpha(0.3).restart()    // Reheat gently, not fully

  // alpha is the simulation's "energy"
  // 1.0 = full energy, everything moves a lot
  // 0.0 = frozen, nothing moves
  // 0.3 = gentle reheat, new nodes settle in without disrupting existing ones

Study:
  - [ ] D3 General Update Pattern (enter, update, exit)
  - [ ] What simulation.alpha() and simulation.alphaTarget() do
  - [ ] What simulation.restart() does
Phase 5: Add the "Hacker Movie" Visual Polish
5.1 — Color Scheme and Base Styling
CSS

/*
The "hacker movie" aesthetic:

Background:  Near-black (#0a0a0a to #111111)
Primary:     Neon green (#00ff41) or cyan (#00d4ff)
Secondary:   Electric blue (#0066ff)
Warning:     Hot pink/red (#ff0044) for anomalies
Text:        Monospace font, slight glow

Study CSS properties:
  - background-color
  - text-shadow (for glow effect)
  - box-shadow (for element glow)
  - filter: blur() (for background effects)
  - mix-blend-mode (for layered glow effects)
*/

/* Key technique — CSS glow effect: */
.node-label {
    fill: #00ff41;
    text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41;
    font-family: 'Courier New', monospace;
}
5.2 — Node Styling
text

Map visual properties to data properties:

NODE SIZE → packet count (busier IPs appear larger)
  radius = Math.sqrt(node.packetCount) * 2 + 5
  WHY sqrt: prevents monster nodes. Linear scaling makes
  high-traffic nodes comically large.

NODE COLOR → categorization
  Your machine's IP:     bright green (#00ff41)
  Local network IPs:     cyan (#00d4ff)
  External IPs:          blue (#3366ff)
  Known services:        special colors
    Google DNS 8.8.8.8:  yellow
    etc.

NODE GLOW → recent activity
  When a node receives a packet, briefly increase its glow
  Then fade it back over 500ms
  This creates the "pulsing" effect

How to detect local vs external:
  - 192.168.x.x → local
  - 10.x.x.x    → local
  - 172.16-31.x.x → local
  - Everything else → external
5.3 — Link Styling
text

LINK THICKNESS → packet count between those two IPs
  strokeWidth = Math.log(link.weight + 1) * 2
  WHY log: same reason as sqrt for nodes — tames outliers

LINK COLOR → protocol
  TCP:  cyan (#00d4ff)
  UDP:  green (#00ff41)
  ICMP: yellow (#ffff00)
  DNS:  orange (#ff9900)
  Other: dim gray

ANIMATED PARTICLES along links → active traffic
  This is the "wow" effect. When a packet travels between two IPs,
  a small dot animates along the link from source to destination.

  How to implement:
    1. When a packet arrives, create a small circle at the source node position
    2. Animate it along the link path to the destination node
    3. Remove it when it arrives
    4. Use requestAnimationFrame for smooth animation
    5. The particle's color matches the protocol
5.4 — Implementing the Particle Animation
text

This is the signature visual effect. Study it carefully.

Approach using SVG animation:

  function animatePacket(sourceNode, destNode, protocol) {
      // 1. Create a small circle element
      // 2. Position it at sourceNode's current x, y
      // 3. Animate x, y to destNode's current x, y over ~800ms
      // 4. Apply glow effect matching protocol color
      // 5. Fade out and remove at the end

      // Use d3.transition() for this:
      //   particle.transition()
      //     .duration(800)
      //     .attr("cx", destNode.x)
      //     .attr("cy", destNode.y)
      //     .style("opacity", 0)
      //     .remove()
  }

Approach using Canvas (if you switched to Canvas):

  // Maintain an array of active particles
  // Each particle has: x, y, targetX, targetY, progress (0→1), color
  // In each animation frame:
  //   - Update progress += speed
  //   - Interpolate position: x = lerp(startX, endX, progress)
  //   - Draw circle with glow
  //   - Remove when progress >= 1

Performance note:
  - Limit active particles to ~200 at a time
  - If too many packets arrive, only animate a sample
  - Or skip animation for "background noise" packets
5.5 — Additional Visual Elements
text

HUD OVERLAY (Heads-Up Display) — the dashboard elements:

┌──────────────────────────────────────────────────────────┐
│  PACKETS/SEC: 147  │  NODES: 23  │  CONNECTIONS: 45    │
│                                                          │
│                                                          │
│              ┌─── Force Graph Lives Here ───┐            │
│              │                              │            │
│              │         ○ ─── ○              │            │
│              │        / \     |              │            │
│              │       ○   ○   ○              │            │
│              │                              │            │
│              └──────────────────────────────┘            │
│                                                          │
│  RECENT PACKETS:                                         │
│  ▸ 192.168.1.5 → 142.250.80.46  TCP/443   1.2KB        │
│  ▸ 192.168.1.5 → 8.8.8.8       UDP/53    128B          │
│  ▸ 10.0.0.1   → 192.168.1.5    ICMP      64B           │
└──────────────────────────────────────────────────────────┘

Elements to build:
  1. Stats bar (top) — update every second
  2. Packet log (bottom or side) — scrolling list, newest at top
  3. Protocol breakdown — small pie or bar chart
  4. Maybe a mini world map showing IP geolocations (stretch goal)
5.6 — Scanline & CRT Effects (Optional but Cool)
CSS

/* Subtle scanline overlay — makes it look like a monitor */
.scanlines::after {
    content: "";
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;  /* Don't block mouse events! */
    z-index: 9999;
}

/* Subtle screen flicker — use sparingly */
@keyframes flicker {
    0%   { opacity: 0.97; }
    50%  { opacity: 1.00; }
    100% { opacity: 0.98; }
}
Phase 6: Handle Edge Cases & Harden
6.1 — Memory Management
text

PROBLEM: If your sniffer runs for hours, you'll accumulate
thousands of nodes and links. The graph becomes unusable
and the browser slows to a crawl.

SOLUTIONS (implement at least one):

Option A: Time-based expiry
  - Each node/link tracks its lastSeen timestamp
  - Every 30 seconds, remove nodes not seen in last 5 minutes
  - Fade them out visually before removing (smooth transition)

Option B: Maximum node count
  - Set a cap: max 150 nodes
  - When limit reached, remove the least-recently-active node
  - Priority queue sorted by last activity

Option C: Aggregation
  - After a subnet has many IPs (e.g., 10 IPs from 142.250.x.x),
    collapse them into a single "Google" super-node
  - More advanced but looks cool

Task: Implement Option A first — it's the most straightforward.
6.2 — Filtering
text

Let users filter what they see:

1. Protocol filters: toggle TCP / UDP / ICMP / DNS on/off
2. IP filters: exclude specific IPs (like broadcast 255.255.255.255)
3. Port filters: show only web traffic (80, 443), or only DNS (53)

Where to filter — BACKEND vs FRONTEND:

Backend filtering (BPF filter in Scapy):
  + Reduces data sent to browser
  + More efficient
  - Requires restarting the sniffer to change

Frontend filtering:
  + User can toggle instantly
  + No backend changes needed
  - All data still sent over WebSocket (wasteful)

RECOMMENDATION: Basic BPF filter on backend (skip obvious noise),
detailed filtering on the frontend for interactivity.

Common noise to filter out:
  - mDNS (224.0.0.251)
  - SSDP (239.255.255.250)
  - ARP (no IP layer)
  - Broadcast traffic (255.255.255.255)
6.3 — Error Handling
text

Things that WILL go wrong:

1. Scapy loses access to interface
   → Detect, log, attempt reconnect, show error in UI

2. WebSocket disconnects
   → Client: auto-reconnect with exponential backoff
   → Show "reconnecting..." indicator in UI

3. Browser tab becomes inactive
   → requestAnimationFrame stops when tab is hidden
   → Buffer incoming data, catch up when tab returns
   → Or: pause processing when document.hidden is true

4. Malformed packets
   → Scapy can crash on weird packets
   → Wrap packet processing in try/except ALWAYS
   → Log errors, skip packet, continue

5. Interface selection on machines with multiple NICs
   → Let user choose or auto-detect the active one
   → Scapy: conf.iface gives the default
Phase 7: Stretch Goals
Once the core works, pick any of these to level up:

7.1 — DNS Resolution
text

Instead of showing raw IP addresses like "142.250.80.46",
resolve them to hostnames like "lax17s55-in-f14.1e100.net"
or better yet, identify the service: "Google"

Approach:
  - Use Python's socket.gethostbyaddr() on the backend
  - Cache results (DNS lookups are slow)
  - Send hostname along with IP in your data
  - Show hostname as label, IP as tooltip

IMPORTANT: Do DNS resolution in a separate thread or async.
Never block the sniffer or web server waiting for DNS.
7.2 — GeoIP Mapping
text

Map external IP addresses to geographic locations.
Show a world map or globe with connections drawn on it.

Use MaxMind's free GeoLite2 database.
Python library: geoip2

This lets you say:
  "142.250.80.46 is in Mountain View, California, USA"
  And draw a line from your location to there.
7.3 — Protocol Deep Inspection
text

Click on a node or link to see detailed info:
  - For DNS traffic: show the domain being queried
  - For HTTP traffic: show the URL (if unencrypted)
  - For TLS traffic: show the SNI (Server Name Indication)
  - Packet size distribution
  - Traffic over time chart for that connection

This requires extracting more data from packets in Scapy.
7.4 — Anomaly Detection
text

Highlight unusual patterns:
  - Port scan detection: one IP contacting many ports on another
  - Traffic spike: sudden burst from one IP
  - New device: IP never seen before on local network
  - Unusual protocol: something other than TCP/UDP/ICMP

Color these events in red/pink and show an alert.
7.5 — Recording & Playback
text

Save captured sessions to a file (JSON or PCAP).
Replay them later with time controls (play, pause, speed up).
Great for demos and teaching.
Debugging Checklist
When things don't work (and they won't, at first), debug layer by layer:

text

Layer 1: Can Scapy capture packets?
  $ sudo python3 -c "from scapy.all import sniff; sniff(count=3).summary()"
  If NO → fix Scapy installation, permissions, or interface

Layer 2: Does your processor extract the right data?
  Print the output of process_packet() for 10 packets
  If NO → check your Scapy layer parsing code

Layer 3: Does Flask start and serve the HTML page?
  Open http://localhost:5000 in browser
  If NO → check Flask route, template path

Layer 4: Does WebSocket connect?
  Check browser console for Socket.IO connection messages
  If NO → check Socket.IO versions match (client and server)

Layer 5: Does data arrive at the frontend?
  Add console.log() in your socket event handler
  If NO → check event name matches between emit() and on()

Layer 6: Does D3 render the graph?
  Start with hardcoded data, no WebSocket
  If NO → check D3 code, SVG element dimensions

Layer 7: Does the graph update with live data?
  If NO → check your update logic (enter/update/exit pattern)
Recommended Learning Order
text

WEEK 1: Foundations
  Day 1-2: Study networking concepts (OSI, packets, protocols)
  Day 3-4: Play with Scapy in Python REPL
  Day 5-7: Build standalone packet capture script that prints clean output

WEEK 2: Backend + Communication
  Day 1-2: Build Flask server with basic SocketIO
  Day 3-4: Integrate Scapy with Flask in background thread
  Day 5-7: Get packet data flowing to browser via WebSocket

WEEK 3: Visualization
  Day 1-3: Learn D3 force graphs with static data
  Day 4-5: Connect live WebSocket data to D3 graph
  Day 6-7: Get basic live graph working (ugly is fine!)

WEEK 4: Polish
  Day 1-2: Dark theme, node/link styling
  Day 3-4: Particle animations
  Day 5-6: HUD overlay, stats, packet log
  Day 7:   Edge cases, filtering, memory management
Key Principles for Teaching This Project
text

When you teach this to others, emphasize:

1. SEPARATION OF CONCERNS
   Backend captures → Processor cleans → WebSocket transports → Frontend renders
   Each piece can be built and tested independently.

2. INTERFACE-FIRST DESIGN
   Define the data format BEFORE building either side.
   Mock data lets frontend and backend develop in parallel.

3. INCREMENTAL BUILDING
   Never try to build everything at once.
   Each checkpoint should produce something visible and testable.

4. PERFORMANCE AWARENESS
   Networks are fast. Humans are slow. Browsers have limits.
   Batching, throttling, and cleanup are not optional.

5. SECURITY & ETHICS
   Packet sniffing is powerful. Only use it on networks you own.
   Never capture other people's traffic without authorization.
   This project is for LEARNING, not surveillance.
You now have everything you need to plan, build, debug, and teach this project. Start at Phase 0, don't skip checkpoints, and build incrementally. Every phase produces something testable. Good luck.