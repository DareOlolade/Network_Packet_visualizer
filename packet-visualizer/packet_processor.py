import scapy.all as scapy
def process_packet(packet):
    try:
        if not packet.haslayer(scapy.IP):
            return None
        ip_layer = packet[scapy.IP]
        source_ip = ip_layer.src
        destination_ip = ip_layer.dst
        size = len(packet)
        timestamp = packet.time
        
        if packet.haslayer(scapy.TCP):  # TCP:
            src_port = packet[scapy.TCP].sport
            dst_port = packet[scapy.TCP].dport
            protocol = "TCP"
        elif packet.haslayer(scapy.UDP):  # UDP:
            src_port = packet[scapy.UDP].sport
            dst_port = packet[scapy.UDP].dport
            protocol = "UDP"
        elif packet.haslayer(scapy.ICMP):  # ICMP:
            src_port = None
            dst_port = None
            protocol = "ICMP"
        else:
            protocol = "OTHER"        
            src_port = None
            dst_port = None 
        return {
            "source_ip": source_ip, 
            "destination_ip": destination_ip,
            "protocol": protocol,
            "size": size,
            "timestamp": timestamp,
            "src_port": src_port,
            "dst_port": dst_port
        }
    except Exception as e:
        return None
