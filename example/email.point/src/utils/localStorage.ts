export function getItem(key: string) {
  let response = window.localStorage.getItem(key);
  if (response) {
    response = JSON.parse(response);
  }
  return response;
}

export function setItem(key: string, value: any) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string) {
  window.localStorage.removeItem(key);
}
