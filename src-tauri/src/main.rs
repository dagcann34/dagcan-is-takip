// Windows release derlemesinde ekstra konsol penceresi açılmasın.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dagcan_lib::run()
}
