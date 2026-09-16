export const API_BASE = 'https://api.codingboss.in/herbal';

export const API_HEADERS = {
  'ngrok-skip-browser-warning': 'true'
};

export const getOrdersUrl = (timestamp = Date.now()) => {
  return `${API_BASE}/orders/?_t=${timestamp}`;
};
