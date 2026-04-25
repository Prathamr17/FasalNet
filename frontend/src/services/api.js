// services/api.js — v10 + Spoilage XGBoost integration
import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const api  = axios.create({ baseURL: BASE, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("fasalnet_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Generic error extractor
export const apiError = (err) =>
  err?.response?.data?.error || err?.message || "An unexpected error occurred.";

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  signup:      (data) => api.post("/api/auth/signup",  data),
  login:       (data) => api.post("/api/auth/login",   data),
  me:          ()     => api.get("/api/auth/me"),
  googleLogin: (data) => api.post("/api/auth/google",  data),
};

// ── OTP (Email verification & Forgot Password) ────────────────────
export const otpAPI = {
  send:          (data) => api.post("/api/otp/send",            data),
  verify:        (data) => api.post("/api/otp/verify",          data),
  signupWithOtp: (data) => api.post("/api/otp/signup-with-otp", data),
  resetPassword: (data) => api.post("/api/otp/reset-password",  data),
};

// ── Farmer ────────────────────────────────────────────────────────
export const farmerAPI = {
  predictRisk:       (data)     => api.post("/api/predict-risk",       data),
  listStorages:      (params)   => api.get("/api/storages",            { params }),
  recommendStorages: (data)     => api.post("/api/storages/recommend", data),
  getCustomerOrders: ()         => api.get("/api/farmer/orders"),
  createProduct:     (data)     => api.post("/api/farmer/products",    data),
  updateProduct:     (id, data) => api.put(`/api/farmer/products/${id}`, data),
  deleteProduct:     (id)       => api.delete(`/api/farmer/products/${id}`),
  getMyProducts:     ()         => api.get("/api/farmer/products"),
};

// ── Booking (farmer) ──────────────────────────────────────────────
export const bookingAPI = {
  create:  (data)           => api.post("/api/book",                    data),
  list:    ()               => api.get("/api/bookings"),
  modify:  (id, data)       => api.put(`/api/bookings/${id}`,           data),
  cancel:  (id)             => api.post(`/api/bookings/${id}/cancel`),
  pay:     (id, data)       => api.post(`/api/bookings/${id}/pay`,      data),
  approve: (data)           => api.post("/api/approve",                 data),
  reject:  (data)           => api.post("/api/reject",                  data),
};

// ── Operator ──────────────────────────────────────────────────────
export const operatorAPI = {
  dashboard:           ()           => api.get("/api/operator/dashboard"),
  updateStorage:       (data)       => api.put("/api/storage/update",           data),
  getOrders:           ()           => api.get("/api/operator/orders"),
  approveOrder:        (id, data)   => api.post(`/api/orders/${id}/approve`,    data),
  rejectOrder:         (id, data)   => api.post(`/api/orders/${id}/reject`,     data),
  getConnectedFarmers: ()           => api.get("/api/operator/connected-farmers"),
  getDeliveryBoys:     ()           => api.get("/api/operator/delivery-boys"),
  assignDelivery:      (id, data)   => api.post(`/api/orders/${id}/assign-delivery`, data),
};

// ── Customer ──────────────────────────────────────────────────────
export const customerAPI = {
  getProducts:      (params) => api.get("/api/products",          { params }),
  getProduct:       (id)     => api.get(`/api/products/${id}`),
  placeOrder:       (data)   => api.post("/api/orders",           data),
  getOrders:        ()       => api.get("/api/orders"),
  cancelOrder:      (id)     => api.post(`/api/orders/${id}/cancel`),
  getInventory:     (params) => api.get("/api/inventory",         { params }),
  getNotifications: ()       => api.get("/api/notifications"),
  markRead:         (id)     => api.patch(`/api/notifications/${id}/read`),
};

// ── Settings ──────────────────────────────────────────────────────
export const settingsAPI = {
  getProfile:     ()     => api.get("/api/settings/profile"),
  updateProfile:  (data) => api.put("/api/settings/profile",          data),
  changePassword: (data) => api.post("/api/settings/change-password", data),
  changePhone:    (data) => api.post("/api/settings/change-phone",    data),
  paymentHistory: ()     => api.get("/api/settings/payment-history"),
};

// ── Delivery Boy ──────────────────────────────────────────────────
export const deliveryAPI = {
  getMyDeliveries:    ()           => api.get("/api/delivery/my-deliveries"),
  updateStatus:       (id, status) => api.put(`/api/delivery/${id}/status`, { status }),
  completeDelivery:   (id, data)   => api.post(`/api/delivery/${id}/complete`, data),
  getDeliveryDetails: (id)         => api.get(`/api/delivery/${id}`),
};

export default api;

// ── ML Predictions ────────────────────────────────────────────────────────
export const mlAPI = {
  // Price / market models (loaded from Google Drive)
  metadata:    ()     => api.get("/api/predict/metadata"),
  price:       (data) => api.post("/api/predict/price",       data),
  priceClass:  (data) => api.post("/api/predict/price-class", data),
  market:      (data) => api.post("/api/predict/market",      data),

  // Spoilage XGBoost model (bundled with backend)
  spoilage:     (data) => api.post("/api/predict/spoilage",      data),
  spoilageMeta: ()     => api.get("/api/predict/spoilage/meta"),
};