'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
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
        fetchListings(session.user.id);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/auth/login');
    }
  };

    const fetchListings = async (userId: string) => {
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
      fetchListings(user.id);
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
      fetchListings(user.id);
    } catch (error) {
      console.error('Error confirming listing:', error);
      toast.error('Failed to confirm listing');
    }
  };

  const getStatusBadge = (listing: Listing) => {
    if (listing.is_verified) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else if (listing.status === 'pending_verification') {
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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
      <>
        <div className="px-6 py-10">
            <h1 className="text-2xl font-bold mb-4">My listings</h1>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
            {!loading && !error && (
                listings.length === 0 ? (
                    <div>No tickets listed for resale.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                        {listings.map((listing) => (
                            <div
                                key={listing.id || listing.resale_ticket_id}
                                className="bg-white rounded-lg shadow-md border p-6 flex flex-col gap-2"
                            >
                                <div className="text-lg font-bold mb-1">
                                    {listing.event_name || 'Event'}
                                </div>
                                <div className="text-sm text-gray-600 mb-1">
                                    Section: {listing.section ?? '-'}, Row: {listing.row ?? '-'}, Seat: {listing.seat_number ?? '-'}
                                </div>
                                <div>
                                    <span className="font-semibold">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs ${listing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{listing.status}</span>
                                </div>
                                <div>
                                    <span className="font-semibold">Price:</span> ${listing.price}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
        <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
          <p className="text-gray-600 mt-2">Manage your uploaded tickets</p>
        </div>
        <Button 
          onClick={() => router.push('/my-listings/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Listing
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">Start by uploading your first ticket</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={listing.image_url}
                  alt="Ticket"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  {getStatusBadge(listing)}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {listing.parsed_fields?.event_name || 'Event Ticket'}
                </CardTitle>
                <CardDescription>
                  {listing.parsed_fields?.event_date || 'Date not specified'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2 mb-4">
                  {listing.parsed_fields?.venue && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Venue:</span> {listing.parsed_fields.venue}
                    </p>
                  )}
                  {listing.parsed_fields?.seat && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Seat:</span> {listing.parsed_fields.seat}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Uploaded: {formatDate(listing.created_at)}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(listing.image_url, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {!listing.is_verified && listing.status === 'pending_verification' && (
                    <Button
                      size="sm"
                      onClick={() => confirmListing(listing.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirm
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteListing(listing.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
      </>
    )
}


