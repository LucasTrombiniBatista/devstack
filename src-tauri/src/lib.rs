//! Casca desktop do DevStack: a mesma interface da web, mais bandeja com a contagem
//! do timer, notificações nativas e busca de metadados de qualquer página (sem CORS).

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent, Wry,
};

/// Itens do menu da bandeja cujo texto muda conforme o timer.
struct TrayItems {
    open: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
    skip: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

/// Textos e estado que a interface manda para a bandeja (ela traduz; aqui só se aplica).
#[derive(serde::Deserialize)]
struct TrayStatus {
    tooltip: String,
    open: String,
    toggle: String,
    skip: String,
    quit: String,
    /// Há um timer para pausar ou continuar.
    active: bool,
    /// A fase atual pode ser pulada.
    can_skip: bool,
}

#[tauri::command]
fn tray_status(app: AppHandle, status: TrayStatus) -> Result<(), String> {
    let err = |e: tauri::Error| e.to_string();
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_tooltip(Some(&status.tooltip)).map_err(err)?;
    }
    let items = app.state::<TrayItems>();
    items.open.set_text(&status.open).map_err(err)?;
    items.toggle.set_text(&status.toggle).map_err(err)?;
    items.toggle.set_enabled(status.active).map_err(err)?;
    items.skip.set_text(&status.skip).map_err(err)?;
    items.skip.set_enabled(status.can_skip).map_err(err)?;
    items.quit.set_text(&status.quit).map_err(err)?;
    Ok(())
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![tray_status])
        .setup(|app| {
            // Atualização automática: o app confere o `latest.json` da última release
            // e só instala pacotes assinados com a chave cuja pública está no tauri.conf.json.
            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Textos provisórios: a interface troca pelos do idioma escolhido ao abrir.
            let items = TrayItems {
                open: MenuItem::with_id(app, "open", "Abrir", true, None::<&str>)?,
                toggle: MenuItem::with_id(app, "toggle", "Iniciar foco", true, None::<&str>)?,
                skip: MenuItem::with_id(app, "skip", "Pular", false, None::<&str>)?,
                quit: MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?,
            };
            let separator = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(
                app,
                &[&items.open, &items.toggle, &items.skip, &separator, &items.quit],
            )?;
            app.manage(items);

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("ícone do app"))
                .tooltip("DevStack")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    // Pausar, continuar e pular ficam com a interface, que é dona do timer.
                    action => {
                        let _ = app.emit("tray-action", action.to_string());
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        // Fechar a janela só esconde: o timer continua contando na bandeja.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o DevStack");
}
