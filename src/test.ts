import WebSocket from "ws";

const ws = new WebSocket("ws://127.0.0.1:8080")

ws.on("open", function() {
    console.log("we open babye");
});

ws.on("close", function() {
    console.log("we closed");
});

ws.on("error", function(e) {
    console.log("we error", e);
});

ws.on("message", function(m) {
    console.log("we message", m.toString());
});

