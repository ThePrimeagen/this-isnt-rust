use std::{
    collections::HashMap,
    env,
    io::{BufRead, BufReader},
    ops::Index,
    process::{Command, Stdio},
    sync::{atomic::AtomicUsize, Arc},
};

use anyhow::Result;
use futures::{SinkExt, StreamExt};
use log::{error, warn};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{mpsc, Mutex},
};
use tokio_tungstenite::tungstenite::Message;

type Rx = mpsc::Receiver<String>;
type Tx = mpsc::Sender<String>;

async fn handle_connection(mut stream: TcpStream, mut rx: Rx) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("unable to do the handshake {}", e);
            return;
        }
    };

    let (mut writer, _) = ws_stream.split();

    while let Some(msg) = rx.recv().await {
        if let Err(e) = writer.send(Message::text(msg)).await {
            error!("error sending data down, closing down socket");
            break;
        }
    }

    if let Err(e) = writer.close().await {
        error!("tried to close writer but errored: {}", e);
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    let addr = env::args()
        .nth(1)
        .unwrap_or_else(|| "127.0.0.1:8080".to_string());

    // Create the event loop and TCP listener we'll accept connections on.
    let try_socket = TcpListener::bind(&addr).await;
    let listener = try_socket.expect("Failed to bind");
    let listeners: Arc<Mutex<HashMap<usize, Tx>>> =
        Arc::new(Mutex::new(HashMap::new()));
    let idx = Arc::new(AtomicUsize::new(0));

    warn!("Listening on: {}", addr);

    let inner_listener = listeners.clone();
    // ridji9981
    // koreanjedi5
    // camfilho
    tokio::spawn(async move {
        if let Ok(cmd) = Command::new("tail")
            .arg("-F")
            .arg("/tmp/twitch")
            .stdout(Stdio::piped())
            .spawn()
        {
            let reader = BufReader::new(cmd.stdout.unwrap());

            for line in reader.lines().filter_map(|line| line.ok()) {
                let listeners = inner_listener.lock().await;
                for (_, sender) in listeners.iter() {
                    sender.send(line.clone()).await.ok();
                }
            }
        }
    });

    // Let's spawn the handling of each connection in a separate task.
    while let Ok((stream, _)) = listener.accept().await {
        let (tx, rx) = mpsc::channel::<String>(10);
        let id = idx.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let listeners = listeners.clone();

        listeners.lock().await.insert(id, tx);

        tokio::spawn(async move {
            let listeners = listeners.clone();
            handle_connection(stream, rx).await;

            let mut listeners = listeners.lock().await;
            listeners.remove(&id);
        });
    }

    Ok(())
}

