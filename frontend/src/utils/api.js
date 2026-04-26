// API base URL: empty string = same origin (dev proxy), or set VITE_API_URL for separate backend
const BASE_URL = import.meta.env.VITE_API_URL || '';
export default BASE_URL;
