// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Available free bytes on the filesystem containing `path`.
/// Used by the game launcher to check space before downloading.
#[tauri::command]
fn free_space(path: String) -> Result<u64, String> {
    use sysinfo::Disks;
    let target = std::path::Path::new(&path);
    let disks = Disks::new_with_refreshed_list();
    let mut best_len = 0usize;
    let mut best_space = 0u64;
    for disk in &disks {
        let mp = disk.mount_point();
        if target.starts_with(mp) {
            let len = mp.as_os_str().len();
            if len >= best_len {
                best_len = len;
                best_space = disk.available_space();
            }
        }
    }
    if best_len > 0 {
        Ok(best_space)
    } else {
        Err("Could not determine free space".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let _ = app;
            println!("new app instance opened with {argv:?}, deep-link event already triggered");
        }));
    }

    builder = builder.setup(|app| {
        #[cfg(any(windows, target_os = "linux"))]
        {
            use tauri_plugin_deep_link::DeepLinkExt;
            app.deep_link().register_all()?;
        }
        Ok(())
    });

    builder
        .invoke_handler(tauri::generate_handler![greet, free_space])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
