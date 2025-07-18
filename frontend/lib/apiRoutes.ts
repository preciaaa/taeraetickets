const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
const FASTAPI_BACKEND_API_URL = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || API_BASE_URL;
const DEDUP_BACKEND_API_URL = process.env.NEXT_PUBLIC_DEDUP_BACKEND_API_URL || 'http://localhost:5003';

export const apiRoutes = {

  users: `${API_BASE_URL}/users`,
  user: (userId: string) => `${API_BASE_URL}/users/${userId}`,
  userById: (id: string) => `${API_BASE_URL}/users/${id}`,
  userVerification: (userId: string) => `${API_BASE_URL}/users/${userId}/verification`,
  userFaceEmbedding: (userId: string) => `${API_BASE_URL}/users/${userId}/face_embedding`, // PUT face embedding

  authUsers: `${API_BASE_URL}/auth-users`,
  authUserById: (id: string) => `${API_BASE_URL}/auth-users/${id}`,

  verifyRecaptcha: `${API_BASE_URL}/verify-recaptcha`,

  // Events
  events: `${API_BASE_URL}/events`,
  event: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
  searchEvent: `${FASTAPI_BACKEND_API_URL}/search-event`,
  createEvent: `${API_BASE_URL}/events/create`,
  addEventDate: (eventId: string) => `${API_BASE_URL}/events/${eventId}/add-date`,

  allListings: `${API_BASE_URL}/listings/all`,
  getEventListings: (eventId: string) => `${API_BASE_URL}/listings/getEventListings/${eventId}`,
  getUserListings: (userId: string) => `${API_BASE_URL}/listings/getUserListings/${userId}`,
  getListingByTicket: (ticketId: string) => `${API_BASE_URL}/listings/getListingByTicket/${ticketId}`,
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
  autoRelease: `${API_BASE_URL}/auto-release`,

  uploadTicket: `${API_BASE_URL}/upload-ticket`,

  health: `${API_BASE_URL}/health`,
  fastapiHealth: `${FASTAPI_BACKEND_API_URL}/health`,

// fastapis
  extractEmbedding: `${FASTAPI_BACKEND_API_URL}/extract-embedding`,
  compareFaces: `${FASTAPI_BACKEND_API_URL}/compare-faces`,
  checkDuplicate: `${FASTAPI_BACKEND_API_URL}/check-duplicate`,
  extractText: `${FASTAPI_BACKEND_API_URL}/extract-text/`,
};  