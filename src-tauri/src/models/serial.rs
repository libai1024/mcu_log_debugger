use serde::Deserialize;

#[derive(Deserialize, Clone, Debug)]
pub struct SerialConfig {
    pub path: String,
    pub baud_rate: u32,
}

