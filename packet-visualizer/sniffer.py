import scapy.all as scapy
import packet_processor as pp


def handle_packet(packet):
    if packet.haslayer(scapy.IP):
        ip_layer = packet[scapy.IP]
        print(f"Source: {ip_layer.src} -> Destination: {ip_layer.dst} -> Protocol: {ip_layer.proto}")
packets = scapy.sniff(count=0, prn=handle_packet, store=False, iface="Wi-Fi", filter="ip")

def start_sniffer():
    scapy.sniff(count=0, prn=handle_packet, store=False, iface="Wi-Fi", filter="ip")


