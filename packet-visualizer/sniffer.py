import scapy.all as scapy
import packet_processor as pp

def start_sniffer(socketio):

    def handle_packet(packet):
        processed = pp.process_packet(packet)
        if processed:
            socketio.emit('new_packet', processed)
    
    print("Starting sniffer...")
    scapy.sniff(count=0, prn=handle_packet, store=False, iface="Wi-Fi", filter="ip")


