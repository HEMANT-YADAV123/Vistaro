"use client";

import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/EventCard";
import { Search } from "lucide-react";
import Spinner from "@/components/Spinner";

export default function SearchPage() {
    // searchParams.get("q") extracts the value of the "q" parameter from the URL query string.
    // If "q" is not present in the URL, it defaults to an empty string ("").
    //https://yourwebsite.com/search?q=concert
    //query will be concert.
    //then this query goes to the api for searching.
  const searchParams = useSearchParams();//for retriveing query Parameters from URL and useParams for retriveing dynamic route parameter from URL.
  const query = searchParams.get("q") || "";
  const searchResults = useQuery(api.events.search, { searchTerm: query });

  if (!searchResults) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const upcomingEvents = searchResults
    .filter((event) => event.eventDate > Date.now())
    .sort((a, b) => a.eventDate - b.eventDate);

  const pastEvents = searchResults
    .filter((event) => event.eventDate <= Date.now())
    .sort((a, b) => b.eventDate - a.eventDate);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Results Header */}
        <div className="flex items-center gap-3 mb-8">
          <Search className="w-6 h-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Results for &quot;{query}&quot;
            </h1>
            <p className="text-gray-600 mt-1">
              Found {searchResults.length} events
            </p>
          </div>
        </div>

        {/* No Results State */}
        {searchResults.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No events found
            </h3>
            <p className="text-gray-600 mt-1">
              Try adjusting your search terms or browse all events
            </p>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Upcoming Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event._id} eventId={event._id} />
              ))}
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Past Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <EventCard key={event._id} eventId={event._id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}