import scapy.all as scapy
import packet_processor as pp
import time
import threading

def start_sniffer(socketio):
    
    buffer = []
    buffer_lock = threading.Lock()

    def handle_packet(packet):
        processed = pp.process_packet(packet)
        if processed is None:
            return
        with buffer_lock:
            buffer.append(processed)
    def flush_buffer():
        while True:
            time.sleep(0.2)
            with buffer_lock:
                if len(buffer) == 0:
                    continue
                batch = buffer.copy()
                buffer.clear()
            socketio.emit('packet_batch', batch)
            
    flush_thread = threading.Thread(target=flush_buffer, daemon=True)
    flush_thread.start()

    print("Starting sniffer...")
    scapy.sniff(count=0, prn=handle_packet, store=False, iface="Wi-Fi", filter="ip")


