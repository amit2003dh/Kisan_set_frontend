import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
console.log("API Base URL:", API.defaults.baseURL);
console.log("Environment REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
console.log("Final baseURL:", API.defaults.baseURL);
// Request interceptor
API.interceptors.request.use(
  (config) => {
    console.log("API Request URL:", config.baseURL + config.url);
    // Add auth token if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || "Something went wrong";
      console.error("API Error:", message);
      return Promise.reject({ message, status: error.response.status });
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", "No response from server");
      return Promise.reject({ message: "Network error. Please check your connection.", status: 0 });
    } else {
      // Something else happened
      console.error("Error:", error.message);
      return Promise.reject({ message: error.message || "An unexpected error occurred", status: 0 });
    }
  }
);

// Helper function for API calls with better error handling
export const apiCall = async (apiFunction) => {
  try {
    const response = await apiFunction();
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error.message || "An error occurred" };
  }
};

export default API;
