use std::{env, fs, fs::File, io::BufWriter, path::PathBuf};

fn main() {
    let output = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR absent"));
    let icon_path = output.join("voice-forge.ico");
    let mut pixels = Vec::with_capacity(64 * 64 * 4);
    for y in 0..64 {
        for x in 0..64 {
            let distance = ((x as i32 - 32).pow(2) + (y as i32 - 32).pow(2)) as f32;
            let inside = distance < 29_f32.powi(2);
            let wave = matches!(x, 19 | 25 | 32 | 39 | 45)
                && (y as i32 - 32).unsigned_abs() < (12 - (x as i32 - 32).unsigned_abs() / 3);
            let color = if wave {
                [200, 255, 61, 255]
            } else if inside {
                [15, 18, 16, 255]
            } else {
                [0, 0, 0, 0]
            };
            pixels.extend_from_slice(&color);
        }
    }
    let manifest =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR absent"));
    let icons = manifest.join("icons");
    fs::create_dir_all(&icons).expect("Création du dossier icons impossible");
    let png_file = File::create(icons.join("icon.png")).expect("Création du PNG impossible");
    let mut encoder = png::Encoder::new(BufWriter::new(png_file), 64, 64);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    encoder
        .write_header()
        .expect("En-tête PNG impossible")
        .write_image_data(&pixels)
        .expect("Écriture PNG impossible");

    let image = ico::IconImage::from_rgba_data(64, 64, pixels);
    let mut directory = ico::IconDir::new(ico::ResourceType::Icon);
    directory.add_entry(ico::IconDirEntry::encode(&image).expect("Encodage de l'icône impossible"));
    directory
        .write(File::create(&icon_path).expect("Création de l'icône impossible"))
        .expect("Écriture de l'icône impossible");

    let windows = tauri_build::WindowsAttributes::new().window_icon_path(icon_path);
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("Configuration Tauri invalide");
}
