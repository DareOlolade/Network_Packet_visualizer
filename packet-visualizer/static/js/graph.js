import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select("#graph");

const nodeMap = new Map();
const linkMap = new Map();

const nodes = [];
const links = [];

const stats = {
  packets: 0,
  tcp: 0,
  udp: 0,
  icmp: 0,
  other: 0,
};

const protocolColor = {
  TCP: "#00ff88",
  UDP: "#00bfff",
  ICMP: "#ff6600",
  OTHER: "#666666",
};

const simulation = d3
  .forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force(
    "link",
    d3
      .forceLink(links)
      .id((d) => d.id)
      .distance(120),
  )
  .force("collision", d3.forceCollide().radius(35))
  .on("tick", ticked)
  .stop(); // Start with simulation stopped until we have data

const linkGroup = svg.append("g").attr("class", "links");
const nodeGroup = svg.append("g").attr("class", "nodes");
const labelGroup = svg.append("g").attr("class", "labels");

let link = linkGroup.selectAll("line");
let node = nodeGroup.selectAll("circle");
let label = labelGroup.selectAll("text");

function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

function addPacket(packet) {
  const srcIP = packet.source_ip;
  const dstIP = packet.destination_ip;
  const protocol = packet.protocol || "OTHER";

  if (!srcIP || !dstIP) return;

  stats.packets++;

  if (protocol === "TCP") stats.tcp++;
  else if (protocol === "UDP") stats.udp++;
  else if (protocol === "ICMP") stats.icmp++;
  else stats.other++;

  if (!nodeMap.has(srcIP)) {
    const newNode = { id: srcIP, packetCount: 0, firstSeen: Date.now() };
    nodeMap.set(srcIP, newNode);
    nodes.push(newNode);
  }
  nodeMap.get(srcIP).packetCount++;

  if (!nodeMap.has(dstIP)) {
    const newNode = { id: dstIP, packetCount: 0, firstSeen: Date.now() };
    nodeMap.set(dstIP, newNode);
    nodes.push(newNode);
  }
  nodeMap.get(dstIP).packetCount++;

  const linkKey1 = srcIP + "→" + dstIP;
  const linkKey2 = dstIP + "→" + srcIP;

  if (linkMap.has(linkKey1)) {
    linkMap.get(linkKey1).weight++;
  } else if (linkMap.has(linkKey2)) {
    linkMap.get(linkKey2).weight++;
  } else {
    const newLink = {
      source: srcIP,
      target: dstIP,
      weight: 1,
      protocol: protocol,
    };
    linkMap.set(linkKey1, newLink);
    links.push(newLink);
  }
}

function updateGraph() {

    // --------------------------------------------------------
    // LINKS
    // --------------------------------------------------------
    const linkUpdate = linkGroup
        .selectAll("line")
        .data(links, d => {
            const src = typeof d.source === "object" ? d.source.id : d.source;
            const tgt = typeof d.target === "object" ? d.target.id : d.target;
            return src + "-" + tgt;
        });

    linkUpdate.exit().remove();

    const linkEnter = linkUpdate.enter()
        .append("line")
        .attr("class", d => {
            const proto = (d.protocol || "OTHER").toLowerCase();
            return "link link-" + proto;
        });

    link = linkEnter.merge(linkUpdate);

    link.attr("stroke-width", d => Math.min(1 + Math.log(d.weight), 6));

    // --------------------------------------------------------
    // NODES
    // --------------------------------------------------------
    const nodeUpdate = nodeGroup
        .selectAll("circle")
        .data(nodes, d => d.id);

    nodeUpdate.exit().remove();

    const nodeEnter = nodeUpdate.enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 6)
        .attr("fill", "#00ff88")
        .attr("stroke", "#00ff8866")
        .attr("stroke-width", 2)
        .attr("filter", "url(#glow)")
        .call(drag(simulation));

    node = nodeEnter.merge(nodeUpdate);

    node.attr("r", d => Math.min(4 + Math.sqrt(d.packetCount), 20));

    // --------------------------------------------------------
    // LABELS
    // --------------------------------------------------------
    const labelUpdate = labelGroup
        .selectAll("text")
        .data(nodes, d => d.id);

    labelUpdate.exit().remove();

    const labelEnter = labelUpdate.enter()
        .append("text")
        .attr("class", "node-label")
        .text(d => d.id);

    label = labelEnter.merge(labelUpdate);

    // --------------------------------------------------------
    // UPDATE SIMULATION — safe order
    // --------------------------------------------------------

    // Step 1: Register nodes
    simulation.nodes(nodes);

    // Step 2: Clean unresolvable links
    for (let i = links.length - 1; i >= 0; i--) {
        const l = links[i];
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;

        if (!nodeMap.has(src) || !nodeMap.has(tgt)) {
            links.splice(i, 1);
            linkMap.delete(src + "→" + tgt);
            linkMap.delete(tgt + "→" + src);
        }
    }

    // Step 3: Register clean links
    simulation.force("link").links(links);

    // Step 4: Restart gently
    simulation.alpha(0.3).restart();

    // --------------------------------------------------------
    // UPDATE STATS UI
    // --------------------------------------------------------
    document.getElementById("stat-nodes").textContent   = nodeMap.size;
    document.getElementById("stat-links").textContent   = linkMap.size;
    document.getElementById("stat-packets").textContent = stats.packets;
    document.getElementById("stat-tcp").textContent     = stats.tcp;
    document.getElementById("stat-udp").textContent     = stats.udp;
    document.getElementById("stat-icmp").textContent    = stats.icmp;
}

function ticked() {
  link
    .filter((d) => {
      return (
        d.source &&
        d.target &&
        typeof d.source === "object" &&
        typeof d.target === "object" &&
        d.source.x !== undefined &&
        d.target.x !== undefined
      );
    })
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  // Only draw nodes that have coordinates
  node
    .filter((d) => d.x !== undefined && d.y !== undefined)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y);
  label
    .filter((d) => d.x !== undefined && d.y !== undefined)
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y - 15);
}

const MAX_LOG_LINES = 50;

function addLogLine(packet) {
  const terminal = document.getElementById("terminal-body");

  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  const proto = (packet.protocol || "OTHER").toUpperCase();
  const protoClass = "log-proto-" + proto.toLowerCase();

  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML =
    `<span class="log-time">${time}</span> ` +
    `<span class="${protoClass}">[${proto}]</span> ` +
    `<span class="log-ip">${packet.source_ip}</span>` +
    `<span class="log-arrow"> → </span>` +
    `<span class="log-ip">${packet.destination_ip}</span>`;

  terminal.appendChild(line);

  // Remove old lines if too many
  while (terminal.children.length > MAX_LOG_LINES) {
    terminal.removeChild(terminal.firstChild);
  }

  // Auto scroll to bottom
  terminal.scrollTop = terminal.scrollHeight;
}

let updateScheduled = false;

function handleBatch(batch) {
  // Process every packet in the batch
  for (const packet of batch) {
    addPacket(packet);
    addLogLine(packet);
  }

  // Throttle graph updates
  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(() => {
      updateGraph();
      updateScheduled = false;
    });
  }
}

export { handleBatch };
