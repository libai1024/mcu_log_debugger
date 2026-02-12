import { invoke } from '../../services/tauriClient.js';

export async function listSerialPorts() {
  return invoke('list_serial_ports');
}

export async function connectSerial({ path, baudRate }) {
  return invoke('connect_serial', { config: { path, baud_rate: baudRate } });
}

export async function disconnectSerial() {
  return invoke('disconnect_serial');
}

