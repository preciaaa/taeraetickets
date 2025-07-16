const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
const FASTAPI_BACKEND_API_URL = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || API_BASE_URL;

export const apiRoutes = {

  users: `${API_BASE_URL}/users`,
  user: (userId: string) => `${API_BASE_URL}/users/${userId}`,
  userById: (id: string) => `${API_BASE_URL}/users/${id}`,

  authUsers: `${API_BASE_URL}/auth-users`,
  authUserById: (id: string) => `${API_BASE_URL}/auth-users/${id}`,

  verifyRecaptcha: `${API_BASE_URL}/verify-recaptcha`,

  events: `${API_BASE_URL}/events`,
  event: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
  createEvent: `${API_BASE_URL}/events/create`,

  allListings: `${API_BASE_URL}/listings/all`,
  getEventListings: (eventId: string) => `${API_BASE_URL}/listings/getEventListings/${eventId}`,
  getUserListings: (userId: string) => `${API_BASE_URL}/listings/getUserListings/${userId}`,
  listings: `${API_BASE_URL}/listings`,
  createListing: `${API_BASE_URL}/listings`,
  listingById: (listingId: string) => `${API_BASE_URL}/listings/${listingId}`,
  confirmListing: (listingId: string) => `${API_BASE_URL}/confirm-listing/${listingId}`,

  cart: (userId: string) => `${API_BASE_URL}/cart/${userId}`,
  addToCart: `${API_BASE_URL}/cart`,
  removeFromCart: (userId: string, ticketId: string) => `${API_BASE_URL}/cart/${userId}/${ticketId}`,

  payments: (userId: string) => `${API_BASE_URL}/payments/${userId}`,
  confirmPurchase: `${API_BASE_URL}/confirm-purchase`,
  reportSeller: `${API_BASE_URL}/report-seller`,
  checkout: `${API_BASE_URL}/checkout`,
  createStripeAccount: `${API_BASE_URL}/create-stripe-account`,


  health: `${API_BASE_URL}/health`,
  fastapiHealth: `${FASTAPI_BACKEND_API_URL}/health`,

// fastapis
  extractEmbedding: `${FASTAPI_BACKEND_API_URL}/extract-embeding`,
  compareFaces: `${FASTAPI_BACKEND_API_URL}/compare-faces`,
  searchEvent: `${FASTAPI_BACKEND_API_URL}/search-event`,
  checkDuplicate: `${FASTAPI_BACKEND_API_URL}/check-duplicate`,
  extractText: `${FASTAPI_BACKEND_API_URL}/extract-text/`,
};  