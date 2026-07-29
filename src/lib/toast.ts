/*
  Global toast suppression.
  Replace all app imports that currently point to your toast utility
  with this file, or update your existing toast helper to match this.
*/

type ToastArgs = {
  title?: string;
  description?: string;
  duration?: number;
};

export function showToast(_args?: ToastArgs) {
  return null;
}

export function successToast(_message?: string) {
  return null;
}

export function errorToast(_message?: string) {
  return null;
}

export function infoToast(_message?: string) {
  return null;
}
