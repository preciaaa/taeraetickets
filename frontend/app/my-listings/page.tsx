'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Listing {
  id: string;
  user_id: string;
  image_url: string;
  parsed_fields: any;
  fingerprint: string;
  is_verified: boolean;
  status: string;
  created_at: string;
  verified_at?: string;
}

export default function MyListings() {
    const [listings, setListings] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        const fetchListings = async () => {
            setLoading(true)
            setError(null)
            if (!supabase) {
                setError('Supabase client not initialized.')
                setLoading(false)
                return
            }
            // Get current user2
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            console.log('User:', user, 'UserError:', userError)
            if (userError || !user) {
                setError('Could not fetch user.')
                setLoading(false)
                return
            }

            // Fetch listings for current user (no join with show/event)
            const { data, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .eq('original_owner_id', user.id)
            console.log('Listings:', data, listingsError)

            if (listingsError) {
                setError('Could not fetch listings: ' + listingsError.message)
            } else {
                setListings(data || [])
            }
            setLoading(false)
        }
        fetchListings();
        checkUser();
    }, [])

  
    const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        fetchListings2(session.user.id);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth/login');
    }
  };

    const fetchListings2 = async (userId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setListings([]);
          return;
        }
        throw new Error('Failed to fetch listings');
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON, treating as no listings');
        setListings([]);
        return;
      }
      
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      if (listings.length === 0) {
        setListings([]);
      } else {
        toast.error('Failed to load your listings');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteListing = async (listingId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete listing');
      }

      toast.success('Listing deleted successfully');
      fetchListings2(user.id);
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const confirmListing = async (listingId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/confirm-listing/${listingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm listing');
      }

      toast.success('Listing confirmed and published!');
      fetchListings2(user.id);
    } catch (error) {
      console.error('Error confirming listing:', error);
      toast.error('Failed to confirm listing');
    }
  };

  const getStatusBadge = (listing: Listing) => {
    if (listing.is_verified === true) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    } else if (listing.is_verified === null && listing.status === 'rejected') {
      return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    } else {
      return <Badge className="bg-gray-200 text-gray-700"><AlertCircle className="w-3 h-3 mr-1" />Unverified</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 overflow-x-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <div className="mb-10">
            <div className="rounded-2xl shadow-md bg-white/80 border border-gray-200 px-8 py-6 flex flex-col items-center md:items-start card-glass">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2 text-center md:text-left">My Listings</h1>
              <p className="text-gray-600 text-lg mb-4 text-center md:text-left">Manage your uploaded tickets here.</p>
              <Button 
                onClick={() => router.push('/my-listings/new')}
                className="bg-blue-600 hover:bg-blue-700 self-center md:self-end"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Listing
              </Button>
            </div>
          </div>
          {listings.length === 0 ? (
            <Card className="text-center py-16 bg-white/90 shadow-lg border border-gray-200 animate-fade-in-scale card-glass">
              <CardContent>
                <div className="mx-auto w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow">
                  <Plus className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-600 mb-8 text-lg">Start by uploading your first ticket for resale.</p>
                <Button 
                  onClick={() => router.push('/my-listings/new')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Listing
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {listings.map((listing, idx) => {
                const isPdf = listing.image_url && listing.image_url.toLowerCase().endsWith('.pdf');
                return (
                  <div key={listing.ticket_id} className="flex animate-fade-in-scale" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="card-accent flex-shrink-0" />
                    <Card className="overflow-hidden rounded-2xl card-glass shadow-lg border border-gray-200 transition-transform hover:scale-[1.025] hover:shadow-xl">
                      <div className="relative group">
                        <div
                          className="aspect-video bg-gray-100 flex items-center justify-center border-b border-gray-200 group-hover:border-blue-400 transition-all cursor-pointer"
                          onClick={() => window.open(listing.image_url, '_blank')}
                          title={isPdf ? 'View PDF' : 'View image'}
                        >
                          {isPdf ? (
                            <>
                              <embed
                                src={listing.image_url + '#toolbar=0&navpanes=0&scrollbar=0'}
                                type="application/pdf"
                                className="w-full h-full min-h-[180px] rounded-t-2xl bg-white"
                                style={{ maxHeight: 220 }}
                                onError={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (target) {
                                    (target as HTMLElement).style.display = 'none';
                                    const fallback = target.nextSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="flex-col items-center justify-center w-full h-full hidden" style={{ minHeight: 180 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="text-xs text-gray-500 mt-2">PDF Preview not available</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={(e) => { e.stopPropagation(); window.open(listing.image_url, '_blank'); }}
                                >
                                  View PDF
                                </Button>
                              </div>
                            </>
                          ) : (
                            <img
                              src={listing.image_url}
                              alt="Ticket"
                              className="w-full h-full object-cover rounded-t-2xl group-hover:opacity-90 transition-all"
                            />
                          )}
                          <div className="absolute top-2 left-2 z-10">
                            {getStatusBadge(listing)}
                          </div>
                        </div>
                      </div>
                      <CardHeader className="pb-2 pt-4 px-6">
                        <CardTitle className="text-xl font-extrabold text-gray-900 mb-1 truncate">
                          {listing.parsed_fields?.event_name || listing.event_name || 'Event Ticket'}
                        </CardTitle>
                        <CardDescription className="text-base text-gray-500">
                          {listing.parsed_fields?.event_date || listing.date || 'Date not specified'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 px-6 pb-4">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm">
                          {listing.parsed_fields?.venue && (
                            <div className="col-span-2 text-gray-700">
                              <span className="font-medium">Venue:</span> {listing.parsed_fields.venue}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Section:</span> {listing.parsed_fields?.section || listing.section || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Row:</span> {listing.parsed_fields?.row || listing.row || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Seat:</span> {listing.parsed_fields?.seat || listing.seat_number || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Price:</span> ${listing.parsed_fields?.price || listing.price || '-'}
                          </div>
                          <div className="col-span-2 text-gray-400 text-xs mt-2">
                            Uploaded: {formatDate(listing.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(listing.image_url, '_blank')}
                            className="flex-1"
                            title="View ticket image or PDF"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {!listing.is_verified && (
                            <Button
                              size="sm"
                              onClick={() => confirmListing(listing.ticket_id)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                              title="Verify this listing"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify Listing
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteListing(listing.ticket_id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                            title="Delete this listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )
}


