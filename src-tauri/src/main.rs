#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::{self, File, OpenOptions},
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, RunEvent};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const NODE_PORT: u16 = 3210;
const ENGINE_PORT: u16 = 8210;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct PortableProcesses(Mutex<Vec<Child>>);

fn portable_root() -> Result<PathBuf, String> {
    if let Ok(root) = std::env::var("VOICE_FORGE_PORTABLE_ROOT") {
        return Ok(PathBuf::from(root));
    }
    std::env::current_exe()
        .map_err(|error| format!("Exécutable introuvable : {error}"))?
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Dossier portable introuvable.".to_string())
}

fn log_file(root: &Path, name: &str) -> Result<File, String> {
    let directory = root.join("logs");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(directory.join(name))
        .map_err(|error| error.to_string())
}

fn ensure_file(path: &Path, label: &str) -> Result<(), String> {
    if path.is_file() {
        Ok(())
    } else {
        Err(format!("{label} absent : {}", path.display()))
    }
}

fn spawn_portable_services(root: &Path) -> Result<Vec<Child>, String> {
    let python = root.join("runtime/python/python.exe");
    let node = root.join("runtime/node/node.exe");
    let inference = root.join("app/inference");
    let node_app = root.join("app");
    let models = root.join("models");
    let sox = root.join("runtime/sox");

    ensure_file(&python, "Runtime Python")?;
    ensure_file(&node, "Runtime Node.js")?;
    ensure_file(&inference.join("app.py"), "Moteur Qwen3-TTS")?;
    ensure_file(&node_app.join("src/server.js"), "Serveur d'interface")?;

    let mut path = sox.to_string_lossy().to_string();
    if let Some(existing) = std::env::var_os("PATH") {
        path.push(';');
        path.push_str(&existing.to_string_lossy());
    }

    let engine_log = log_file(root, "tts-engine.log")?;
    let engine_error = engine_log.try_clone().map_err(|error| error.to_string())?;
    let mut engine_command = Command::new(&python);
    engine_command
        .args([
            "-m",
            "uvicorn",
            "app:app",
            "--host",
            "127.0.0.1",
            "--port",
            &ENGINE_PORT.to_string(),
        ])
        .current_dir(&inference)
        .env("HF_HOME", &models)
        .env("HF_HUB_OFFLINE", "1")
        .env("TRANSFORMERS_OFFLINE", "1")
        .env("HF_HUB_DISABLE_TELEMETRY", "1")
        .env("TTS_DEVICE", "cuda")
        .env("TTS_DEFAULT_MODE", "custom")
        .env("TTS_POWER_PROFILE", "balanced")
        .env("TTS_CHUNK_CHARACTERS", "90")
        .env(
            "TTS_CUSTOM_MODEL_ID",
            models.join("repositories/custom-voice-0.6b"),
        )
        .env(
            "TTS_DESIGN_MODEL_ID",
            models.join("repositories/voice-design-1.7b"),
        )
        .env(
            "TTS_BASE_MODEL_ID",
            models.join("repositories/base-voice-clone-0.6b"),
        )
        .env("TTS_GPU_PAUSE_TEMP", "72")
        .env("TTS_GPU_RESUME_TEMP", "65")
        .env("TTS_GPU_ABORT_TEMP", "78")
        .env("TTS_GPU_COOLDOWN_SECONDS", "5")
        .env("PATH", &path)
        .stdin(Stdio::null())
        .stdout(Stdio::from(engine_log))
        .stderr(Stdio::from(engine_error));
    #[cfg(windows)]
    engine_command.creation_flags(CREATE_NO_WINDOW);
    let engine = engine_command
        .spawn()
        .map_err(|error| format!("Démarrage du moteur impossible : {error}"))?;

    let node_log = log_file(root, "interface.log")?;
    let node_error = node_log.try_clone().map_err(|error| error.to_string())?;
    let mut node_command = Command::new(&node);
    node_command
        .arg("src/server.js")
        .current_dir(&node_app)
        .env("PORT", NODE_PORT.to_string())
        .env("QWEN_TTS_URL", format!("http://127.0.0.1:{ENGINE_PORT}"))
        .env("TTS_DEFAULT_MODE", "custom")
        .env("NODE_ENV", "production")
        .stdin(Stdio::null())
        .stdout(Stdio::from(node_log))
        .stderr(Stdio::from(node_error));
    #[cfg(windows)]
    node_command.creation_flags(CREATE_NO_WINDOW);
    let node_process = node_command
        .spawn()
        .map_err(|error| format!("Démarrage de l'interface impossible : {error}"))?;

    Ok(vec![engine, node_process])
}

fn wait_for_port(port: u16, timeout: Duration) -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], port));
    let started = Instant::now();
    while started.elapsed() < timeout {
        if TcpStream::connect_timeout(&address, Duration::from_millis(300)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(250));
    }
    false
}

fn stop_children(app: &tauri::AppHandle) {
    let state = app.state::<PortableProcesses>();
    if let Ok(mut children) = state.0.lock() {
        for child in children.iter_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
        children.clear();
    };
}

fn main() {
    let app = tauri::Builder::default()
        .manage(PortableProcesses(Mutex::new(Vec::new())))
        .setup(|app| {
            let root = portable_root().map_err(std::io::Error::other)?;
            let children = spawn_portable_services(&root).map_err(std::io::Error::other)?;
            *app.state::<PortableProcesses>()
                .0
                .lock()
                .map_err(|_| std::io::Error::other("Verrou des processus empoisonné."))? = children;

            let handle = app.handle().clone();
            thread::spawn(move || {
                if wait_for_port(NODE_PORT, Duration::from_secs(30)) {
                    let window_handle = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        if let Some(window) = window_handle.get_webview_window("main") {
                            let _ = window.eval(&format!(
                                "window.location.replace('http://127.0.0.1:{NODE_PORT}')"
                            ));
                        }
                    });
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Impossible de construire Voice Forge Portable.");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            stop_children(app_handle);
        }
    });
}
