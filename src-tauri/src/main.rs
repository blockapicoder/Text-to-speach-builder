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
const DOCKER_NODE_PORT: u16 = 3000;
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

fn docker_enabled(root: &Path) -> bool {
    match std::env::var("VOICE_FORGE_BACKEND") {
        Ok(value) if value.eq_ignore_ascii_case("docker") => return true,
        Ok(value) if value.eq_ignore_ascii_case("portable") => return false,
        _ => {}
    }
    root.join("USE_DOCKER").is_file() || root.join("docker.enabled").is_file()
}

fn find_compose_root(root: &Path) -> Option<PathBuf> {
    let mut candidates = vec![root.to_path_buf(), root.join("app")];
    if let Some(parent) = root.parent() {
        candidates.push(parent.to_path_buf());
        if let Some(grand_parent) = parent.parent() {
            candidates.push(grand_parent.to_path_buf());
        }
    }
    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir);
    }

    candidates
        .into_iter()
        .find(|candidate| candidate.join("docker-compose.yml").is_file())
}

fn docker_info_ok() -> bool {
    Command::new("docker")
        .arg("info")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn start_docker_desktop_if_present() {
    let candidates = [
        r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
        r"C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe",
    ];
    for candidate in candidates {
        let path = Path::new(candidate);
        if path.is_file() {
            let mut command = Command::new(path);
            command
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());
            command.creation_flags(CREATE_NO_WINDOW);
            let _ = command.spawn();
            break;
        }
    }
}

#[cfg(not(windows))]
fn start_docker_desktop_if_present() {}

fn wait_for_docker(timeout: Duration) -> bool {
    if docker_info_ok() {
        return true;
    }
    start_docker_desktop_if_present();
    let started = Instant::now();
    while started.elapsed() < timeout {
        if docker_info_ok() {
            return true;
        }
        thread::sleep(Duration::from_secs(2));
    }
    false
}

fn spawn_docker_services(root: &Path) -> Result<Vec<Child>, String> {
    let compose_root = find_compose_root(root).ok_or_else(|| {
        "docker-compose.yml introuvable. Gardez le dossier dist dans le repo ou lancez depuis le dossier du projet."
            .to_string()
    })?;

    if !wait_for_docker(Duration::from_secs(120)) {
        return Err("Docker n'est pas pret. Demarrez Docker Desktop puis relancez VoiceForge.".to_string());
    }

    let docker_log = log_file(root, "docker-compose.log")?;
    let docker_error = docker_log.try_clone().map_err(|error| error.to_string())?;
    let use_gpu = std::env::var("VOICE_FORGE_DOCKER_GPU")
        .map(|value| value != "0" && !value.eq_ignore_ascii_case("false"))
        .unwrap_or(true);

    let mut docker_command = Command::new("docker");
    docker_command.arg("compose").arg("-f").arg("docker-compose.yml");
    if use_gpu && compose_root.join("docker-compose.gpu.yml").is_file() {
        docker_command.arg("-f").arg("docker-compose.gpu.yml");
    }
    docker_command
        .arg("up")
        .arg("--build")
        .current_dir(&compose_root)
        .stdin(Stdio::null())
        .stdout(Stdio::from(docker_log))
        .stderr(Stdio::from(docker_error));
    #[cfg(windows)]
    docker_command.creation_flags(CREATE_NO_WINDOW);

    let docker = docker_command
        .spawn()
        .map_err(|error| format!("Demarrage Docker impossible : {error}"))?;

    Ok(vec![docker])
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

fn spawn_services(root: &Path) -> Result<(Vec<Child>, u16), String> {
    if docker_enabled(root) {
        return spawn_docker_services(root).map(|children| (children, DOCKER_NODE_PORT));
    }
    spawn_portable_services(root).map(|children| (children, NODE_PORT))
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
            let (children, target_port) = spawn_services(&root).map_err(std::io::Error::other)?;
            *app.state::<PortableProcesses>()
                .0
                .lock()
                .map_err(|_| std::io::Error::other("Verrou des processus empoisonné."))? = children;

            let handle = app.handle().clone();
            thread::spawn(move || {
                if wait_for_port(target_port, Duration::from_secs(900)) {
                    let window_handle = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        if let Some(window) = window_handle.get_webview_window("main") {
                            let _ = window.eval(&format!(
                                "window.location.replace('http://127.0.0.1:{target_port}')"
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
