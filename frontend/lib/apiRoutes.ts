// Centralized API route utility for backend endpoints
// Uses environment variables for base URLs

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
const FASTAPI_BACKEND_API_URL = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || API_BASE_URL;

export const apiRoutes = {
  // User
  user: (userId: string) => `${API_BASE_URL}/users/${userId}`,
  // Events
  event: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
  // Listings
  getUserListings: (userId: string) => `${API_URL}/listings/getUserListings/${userId}`,
  getEventListings: (eventId: string) => `${API_BASE_URL}/listings/getEventListings/${eventId}`,
  listings: `${API_BASE_URL}/listings`,
  listingById: (listingId: string) => `${API_URL}/listings/${listingId}`,
  // Ticket upload
  uploadTicket: `${API_URL}/upload-ticket`,
  // Payments
  payments: (userId: string) => `${API_BASE_URL}/payments/${userId}`,
  confirmPurchase: `${API_BASE_URL}/confirm-purchase`,
  reportSeller: `${API_BASE_URL}/report-seller`,
  // Cart
  cart: (userId: string) => `${API_BASE_URL}/cart/${userId}`,
  checkout: `${API_BASE_URL}/checkout`,
  // Stripe
  createStripeAccount: `${API_BASE_URL}/create-stripe-account`,
  // Face verification (FastAPI)
  extractEmbedding: `${FASTAPI_BACKEND_API_URL}/extract-embeding`,
  compareFaces: `${FASTAPI_BACKEND_API_URL}/compare-faces`,
  // Event search (FastAPI)
  searchEvent: `${FASTAPI_BACKEND_API_URL}/search-event`,
  // Face verification (custom endpoint)
  compareFacesCustom: (endpoint?: string) => endpoint || 'http://localhost:5002/compare-faces',
}; 