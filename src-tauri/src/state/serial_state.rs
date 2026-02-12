use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct SerialState {
    pub running: Arc<Mutex<bool>>,
}

impl Default for SerialState {
    fn default() -> Self {
        Self {
            running: Arc::new(Mutex::new(false)),
        }
    }
}

