from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from sniffer import start_sniffer
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


socketio.on_event('connect', lambda: print("Client connected"))
socketio.on_event('disconnect', lambda: print("Client disconnected"))

sniffer_thread = threading.Thread(target=start_sniffer, daemon=True, args=(socketio,))
sniffer_thread.start()


if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=False)