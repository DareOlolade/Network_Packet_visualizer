import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select("#graph");

const nodes = [];
const links = [];
const pendingLinks = [];

const drag = (simulation) => {
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
};

const simulation = d3
  .forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-100))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force(
    "link",
    d3.forceLink(links).id((d) => d.id),
  )
  .force("collision", d3.forceCollide().radius(20))
  .on("tick", ticked);

const linkGroup = svg.append("g").attr("class", "links");
const nodeGroup = svg.append("g").attr("class", "nodes");

let link = linkGroup.selectAll("line");
let node = nodeGroup.selectAll("circle");

function updateGraph() {
  while (pendingLinks.length > 0) {
    links.push(pendingLinks.shift());
  }

  console.log("nodes array length:", nodes.length);
  console.log("nodes:", nodes.map(n => n.id));
  console.log("links array length:", links.length);
  console.log("pending links:", pendingLinks);

  // Links
  link = linkGroup.selectAll("line").data(links, (d) => {
    const src = d.source && d.source.id ? d.source.id : d.source;
    const tgt = d.target && d.target.id ? d.target.id : d.target;
    return src + "-" + tgt;
  });

  link.exit().remove();

  link = link.enter().append("line").attr("class", "link").merge(link);

  // Nodes
  node = nodeGroup.selectAll("circle").data(nodes, (d) => d.id);

  node.exit().remove();

  node = node
    .enter()
    .append("circle")
    .attr("class", "node")
    .attr("r", 12)
    .call(drag(simulation))
    .merge(node);

  // Update simulation
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(0.3).restart();
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
}

let updateScheduled = false;

function scheduleUpdate() {
  if (updateScheduled) return;
  updateScheduled = true;
  setTimeout(() => {
    updateGraph();
    updateScheduled = false;
  }, 500);
}

const handlePacket = (packet) => {
  const sourceIP = packet.source_ip;
  const destinationIP = packet.destination_ip;
  const protocol = packet.protocol;

  // Add nodes if they don't exist
  const sourceExists = nodes.find((n) => n.id === sourceIP);
  if (!sourceExists) {
    nodes.push({ id: sourceIP });
  }

  const destinationExists = nodes.find((n) => n.id === destinationIP);
  if (!destinationExists) {
    nodes.push({ id: destinationIP });
  }

  // Add link
  const existsInLinks = links.find((l) => {
    const src = typeof l.source === "object" ? l.source.id : l.source;
    const tgt = typeof l.target === "object" ? l.target.id : l.target;
    return (
      (src === sourceIP && tgt === destinationIP) ||
      (src === destinationIP && tgt === sourceIP)
    );
  });

  const existsInPending = pendingLinks.find((l) => {
    return (
      (l.source === sourceIP && l.target === destinationIP) ||
      (l.source === destinationIP && l.target === sourceIP)
    );
  });

  if (!existsInLinks && !existsInPending) {
    pendingLinks.push({
      source: sourceIP,
      target: destinationIP,
      protocol: protocol,
    });
  }

  scheduleUpdate();
};

export { handlePacket };
