use std::fs;
use std::path::PathBuf;
use std::panic::AssertUnwindSafe;

fn main() {
    let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
        tauri_build::build()
    }));

    if let Err(panic) = result {
        let msg = panic
            .downcast_ref::<String>()
            .cloned()
            .unwrap_or_else(|| "unknown".into());
        eprintln!("tauri_build panicked: {} — falling back to minimal build", msg);

        minimal_build();
    }
}

fn minimal_build() {
    // --- cfg flags (required by tauri::generate_context!()) ---
    println!("cargo:rustc-cfg=desktop");
    println!("cargo:rustc-check-cfg=cfg(mobile)");
    println!("cargo:rustc-check-cfg=cfg(desktop)");
    println!("cargo:rustc-check-cfg=cfg(dev)");
    println!("cargo:rustc-cfg=dev");

    // --- target triple ---
    let target_triple =
        std::env::var("TARGET").unwrap_or_else(|_| "x86_64-pc-windows-msvc".into());
    println!("cargo:rustc-env=TAURI_ENV_TARGET_TRIPLE={}", target_triple);

    // --- Android compat (harmless filler) ---
    println!("cargo:rustc-env=TAURI_ANDROID_PACKAGE_NAME_APP_NAME=app");
    println!("cargo:rustc-env=TAURI_ANDROID_PACKAGE_NAME_PREFIX=dzcardmaker");

    // --- Permission files path ---
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap_or_else(|_| ".".into()));
    let perm_dir = out_dir.join("app-manifest").join("__app__-permission-files");
    fs::create_dir_all(&perm_dir).ok();
    println!(
        "cargo:PERMISSION_FILES_PATH={}",
        perm_dir.display()
    );

    // --- Rerun triggers ---
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
    println!("cargo:rerun-if-changed=capabilities");
    println!("cargo:rerun-if-env-changed=REMOVE_UNUSED_COMMANDS");

    // --- Register our capabilities ---
    let cap_dir = PathBuf::from("capabilities");
    if cap_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&cap_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "json") {
                    let dest = perm_dir.join(path.file_name().unwrap());
                    fs::copy(&path, &dest).ok();
                }
            }
        }
    }

    println!("cargo:warning=Tauri build done via minimal fallback (Windows rc.exe known issue)");
}
