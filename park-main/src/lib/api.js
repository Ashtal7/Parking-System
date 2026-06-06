export const getAuthToken = () => localStorage.getItem('park_smart_token');

export const setAuthToken = (token) => localStorage.setItem('park_smart_token', token);

export const removeAuthToken = () => localStorage.removeItem('park_smart_token');

export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !url.includes('/api/login') && !url.includes('/api/register')) {
    removeAuthToken();
    // Only redirect if we're not already on a public page
    if (!['/', '/login', '/register', '/forgot-password'].includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  }

  return response;
};
