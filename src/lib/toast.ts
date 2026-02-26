type ToastType = 'success' | 'error' | 'info';
type ToastFn = (type: ToastType, message: string) => void;

let _toastFn: ToastFn | null = null;

export function registerToastHandler(fn: ToastFn) {
  _toastFn = fn;
}

export function unregisterToastHandler() {
  _toastFn = null;
}

export function showToast(type: ToastType, message: string) {
  if (_toastFn) {
    _toastFn(type, message);
  } else if (type === 'error') {
    console.error(message);
  }
}
