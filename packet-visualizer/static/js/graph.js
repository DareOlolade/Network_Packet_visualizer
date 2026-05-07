import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// setup
const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select("#graph");

// returns true if IP is a private/local address
function isLocalIP(ip) {
    return ip.startsWith("192.168.") ||
           ip.startsWith("10.") ||
           ip.startsWith("172.16.") ||
           ip.startsWith("172.17.") ||
           ip.startsWith("172.18.") ||
           ip.startsWith("172.19.") ||
           ip.startsWith("172.20.") ||
           ip.startsWith("172.21.") ||
           ip.startsWith("172.22.") ||
           ip.startsWith("172.23.") ||
           ip.startsWith("172.24.") ||
           ip.startsWith("172.25.") ||
           ip.startsWith("172.26.") ||
           ip.startsWith("172.27.") ||
           ip.startsWith("172.28.") ||
           ip.startsWith("172.29.") ||
           ip.startsWith("172.30.") ||
           ip.startsWith("172.31.") ||
           ip === "127.0.0.1";
}

// graph state using Maps for O(1) lookups
const nodeMap = new Map();
const linkMap = new Map();

// D3 works with arrays — we mutate these, never replace them
const nodes = [];
const links = [];

// global stats counters
const stats = {
    packets: 0,
    tcp: 0,
    udp: 0,
    icmp: 0,
    other: 0
};

// protocol color mapping
const protocolColor = {
    TCP: "#00ff88",
    UDP: "#D10000",
    ICMP: "#00bfff",
    OTHER: "#666666"
};

// returns the color of the most-used protocol for a node
function getNodeColor(d) {
    const counts = [
        { proto: "TCP", count: d.tcp },
        { proto: "UDP", count: d.udp },
        { proto: "ICMP", count: d.icmp },
        { proto: "OTHER", count: d.other }
    ];
    let dominant = counts[0];
    for (const c of counts) {
        if (c.count > dominant.count) {
            dominant = c;
        }
    }
    return protocolColor[dominant.proto];
}

// returns a dimmer version of node color for stroke
function getNodeStroke(d) {
    return getNodeColor(d) + "44";
}

// force simulation — stopped until data arrives
const simulation = d3
    .forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("link", d3.forceLink(links).id(d => d.id).distance(120))
    .force("collision", d3.forceCollide().radius(35))
    .velocityDecay(0.1)
    .on("tick", ticked)
    .stop();

// svg groups — order matters: links behind nodes behind labels
const linkGroup = svg.append("g").attr("class", "links");
const nodeGroup = svg.append("g").attr("class", "nodes");
const labelGroup = svg.append("g").attr("class", "labels");

// selections — reassigned during update
let link = linkGroup.selectAll("line");
let node = nodeGroup.selectAll("circle");
let label = labelGroup.selectAll("text");

// drag behavior factory
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
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
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

// tooltip element reference
const tooltip = document.getElementById("tooltip");

// show tooltip with full node details on hover
function showTooltip(event, d) {
    const type = isLocalIP(d.id) ? "LOCAL DEVICE" : "EXTERNAL SERVER";
    const connections = links.filter(l => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src === d.id || tgt === d.id;
    }).length;
    const counts = [
        { proto: "TCP", count: d.tcp },
        { proto: "UDP", count: d.udp },
        { proto: "ICMP", count: d.icmp },
        { proto: "OTHER", count: d.other }
    ];
    let dominant = counts[0];
    for (const c of counts) {
        if (c.count > dominant.count) dominant = c;
    }
    tooltip.innerHTML =
        `<div class="tooltip-ip">${d.id}</div>` +
        `<div><span class="tooltip-label">TYPE: </span><span class="tooltip-value">${type}</span></div>` +
        `<div><span class="tooltip-label">PACKETS: </span><span class="tooltip-value">${d.packetCount}</span></div>` +
        `<div><span class="tooltip-label">CONNECTIONS: </span><span class="tooltip-value">${connections}</span></div>` +
        `<div><span class="tooltip-label">DOMINANT: </span><span class="tooltip-value" style="color:${protocolColor[dominant.proto]}">${dominant.proto}</span></div>` +
        `<div style="margin-top:4px; border-top:1px solid #00ff8822; padding-top:4px;">` +
        `<span style="color:#00ff88">TCP:${d.tcp}</span> ` +
        `<span style="color:#00bfff">UDP:${d.udp}</span> ` +
        `<span style="color:#ff6600">ICMP:${d.icmp}</span>` +
        `</div>`;
    tooltip.style.display = "block";
    tooltip.style.left = (event.pageX + 15) + "px";
    tooltip.style.top = (event.pageY - 15) + "px";
}

// move tooltip to follow mouse
function moveTooltip(event) {
    tooltip.style.left = (event.pageX + 15) + "px";
    tooltip.style.top = (event.pageY - 15) + "px";
}

// hide tooltip when mouse leaves node
function hideTooltip() {
    tooltip.style.display = "none";
}

// add a single packet to graph state
function addPacket(packet) {
    const srcIP = packet.source_ip;
    const dstIP = packet.destination_ip;
    const protocol = packet.protocol || "OTHER";

    // reject malformed packets
    if (!srcIP || !dstIP) return;

    // update global stats
    stats.packets++;
    if (protocol === "TCP") stats.tcp++;
    else if (protocol === "UDP") stats.udp++;
    else if (protocol === "ICMP") stats.icmp++;
    else stats.other++;

    // ensure source node exists
    if (!nodeMap.has(srcIP)) {
        const newNode = { id: srcIP, packetCount: 0, firstSeen: Date.now(), tcp: 0, udp: 0, icmp: 0, other: 0 };
        nodeMap.set(srcIP, newNode);
        nodes.push(newNode);
    }

    // increment source node counts
    const srcNode = nodeMap.get(srcIP);
    srcNode.packetCount++;
    if (protocol === "TCP") srcNode.tcp++;
    else if (protocol === "UDP") srcNode.udp++;
    else if (protocol === "ICMP") srcNode.icmp++;
    else srcNode.other++;

    // ensure destination node exists
    if (!nodeMap.has(dstIP)) {
        const newNode = { id: dstIP, packetCount: 0, firstSeen: Date.now(), tcp: 0, udp: 0, icmp: 0, other: 0 };
        nodeMap.set(dstIP, newNode);
        nodes.push(newNode);
    }

    // increment destination node counts
    const dstNode = nodeMap.get(dstIP);
    dstNode.packetCount++;
    if (protocol === "TCP") dstNode.tcp++;
    else if (protocol === "UDP") dstNode.udp++;
    else if (protocol === "ICMP") dstNode.icmp++;
    else dstNode.other++;

    // check if link already exists in either direction
    const linkKey1 = srcIP + "→" + dstIP;
    const linkKey2 = dstIP + "→" + srcIP;

    if (linkMap.has(linkKey1)) {
        // link exists forward — increment weight
        linkMap.get(linkKey1).weight++;
    } else if (linkMap.has(linkKey2)) {
        // link exists reverse — increment weight
        linkMap.get(linkKey2).weight++;
    } else {
        // new link — only add if both nodes exist
        if (nodeMap.has(srcIP) && nodeMap.has(dstIP)) {
            const newLink = { source: srcIP, target: dstIP, weight: 1, protocol: protocol };
            linkMap.set(linkKey1, newLink);
            links.push(newLink);
        }
    }
}

// update all D3 visuals and simulation
function updateGraph(dataChanged = true) {

    // bind links data with unique key
    const linkUpdate = linkGroup
        .selectAll("line")
        .data(links, d => {
            const src = typeof d.source === "object" ? d.source.id : d.source;
            const tgt = typeof d.target === "object" ? d.target.id : d.target;
            return src + "-" + tgt;
        });

    // remove old links
    linkUpdate.exit().remove();

    // create new link elements with protocol-based class
    const linkEnter = linkUpdate.enter()
        .append("line")
        .attr("class", d => {
            const proto = (d.protocol || "OTHER").toLowerCase();
            return "link link-" + proto;
        });

    // merge enter + update selections
    link = linkEnter.merge(linkUpdate);

    // update thickness based on traffic weight
    link.attr("stroke-width", d => Math.min(1 + Math.log(d.weight), 6));

    // bind nodes data with IP as key
    const nodeUpdate = nodeGroup
        .selectAll("circle")
        .data(nodes, d => d.id);

    // remove old nodes
    nodeUpdate.exit().remove();

    // create new node elements
    const nodeEnter = nodeUpdate.enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 0)
        .attr("filter", "url(#glow)")
        .call(drag(simulation))
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    // animate new nodes growing in
    nodeEnter
        .transition()
        .duration(500)
        .attr("r", 6);

    // merge enter + update selections
    node = nodeEnter.merge(nodeUpdate);

    // update all nodes — color by dominant protocol, size by packet count
    node
        .attr("r", d => Math.min(4 + Math.sqrt(d.packetCount), 20))
        .attr("fill", d => getNodeColor(d))
        .attr("stroke", d => getNodeStroke(d))
        .attr("stroke-width", 2);

    // bind labels only for nodes with significant traffic
    const labelUpdate = labelGroup
        .selectAll("text")
        .data(nodes.filter(n => n.packetCount > 10), d => d.id);

    // remove old labels
    labelUpdate.exit().remove();

    // create new label elements
    const labelEnter = labelUpdate.enter()
        .append("text")
        .attr("class", "node-label")
        .text(d => d.id);

    // merge enter + update selections
    label = labelEnter.merge(labelUpdate);

    // register nodes with simulation first
    simulation.nodes(nodes);

    // clean unresolvable links before giving to simulation
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

    // register clean links with simulation
    simulation.force("link").links(links);

    // only reheat simulation if new nodes or links appeared
    if (dataChanged) {
        simulation.alpha(0.1).restart();
    }

    // update stats panel
    document.getElementById("stat-nodes").textContent = nodeMap.size;
    document.getElementById("stat-links").textContent = linkMap.size;
    document.getElementById("stat-packets").textContent = stats.packets;
    document.getElementById("stat-tcp").textContent = stats.tcp;
    document.getElementById("stat-udp").textContent = stats.udp;
    document.getElementById("stat-icmp").textContent = stats.icmp;
}

// position update every animation frame
function ticked() {
    // clamp nodes inside screen with 20px padding
    const padding = 20;

    // update node positions — clamped to screen boundaries
    node
        .attr("cx", d => {
            d.x = Math.max(padding, Math.min(width - padding, d.x));
            return d.x;
        })
        .attr("cy", d => {
            d.y = Math.max(padding, Math.min(height - padding, d.y));
            return d.y;
        });

    // update link positions — only for fully resolved links
    link
        .filter(d => d.source && d.target && typeof d.source === "object" && typeof d.target === "object")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    // update label positions — float above nodes
    label
        .attr("x", d => d.x)
        .attr("y", d => d.y - 15);
}

// max lines to show in terminal
const MAX_LOG_LINES = 20;

// buffer for log lines
const logBuffer = [];

// format a packet into an HTML string — does NOT touch the DOM
function formatLogLine(packet) {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const proto = (packet.protocol || "OTHER").toUpperCase();
    const protoClass = "log-proto-" + proto.toLowerCase();
    const size = packet.size ? `${packet.size}B` : "";
    const port = packet.dst_port ? `:${packet.dst_port}` : "";
    return `<div class="log-line">` +
        `<span class="log-time">${time}</span> ` +
        `<span class="${protoClass}">[${proto}]</span> ` +
        `<span class="log-ip">${packet.source_ip}</span>` +
        `<span class="log-arrow"> → </span>` +
        `<span class="log-ip">${packet.destination_ip}${port}</span> ` +
        `<span class="log-time">${size}</span>` +
        `</div>`;
}

// flush all buffered log lines into the terminal at once
function flushLog() {
    if (logBuffer.length === 0) return;

    const terminal = document.getElementById("terminal-body");

    // build all new lines as one HTML string — single DOM write
    const html = logBuffer.join("");
    logBuffer.length = 0;

    // append all at once using insertAdjacentHTML — much faster than createElement
    terminal.insertAdjacentHTML("beforeend", html);

    // trim old lines
    while (terminal.children.length > MAX_LOG_LINES) {
        terminal.removeChild(terminal.firstChild);
    }

    // auto scroll once — not per packet
    terminal.scrollTop = terminal.scrollHeight;
}
// throttle flag for graph updates
let updateScheduled = false;

// process a batch of packets from backend
// process a batch of packets from backend
function handleBatch(batch) {
    // track if graph structure actually changed
    const previousNodeCount = nodes.length;
    const previousLinkCount = links.length;

    // process every packet in the batch
    for (const packet of batch) {
        addPacket(packet);
        // buffer the log line instead of writing to DOM immediately
        logBuffer.push(formatLogLine(packet));
    }

    // check if new nodes or links were added
    const nodesChanged = nodes.length !== previousNodeCount;
    const linksChanged = links.length !== previousLinkCount;

    // throttle graph updates to one per animation frame
    if (!updateScheduled) {
        updateScheduled = true;
        requestAnimationFrame(() => {
            updateGraph(nodesChanged || linksChanged);
            // flush terminal log once per frame — not per packet
            flushLog();
            updateScheduled = false;
        });
    }
}

export { handleBatch };