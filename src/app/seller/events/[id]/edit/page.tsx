"use client";

import { useParams } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "../../../../../../convex/_generated/dataModel"; 
import EventForm from "@/components/EventForm";
import { AlertCircle } from "lucide-react";

export default function EditEventPage() {
  const params = useParams();
  const event = useQuery(api.events.getById, { //get tyhe vents using api
    eventId: params.id as Id<"events">,//get eventId using useParams
  });

  if (!event) return null;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white">
          <h2 className="text-2xl font-bold">Edit Event</h2>
          <p className="text-blue-100 mt-2">Update your event details</p>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                Note: If you modify the total number of tickets, any tickets
                already sold will remain valid. You can only increase the total
                number of tickets, not decrease it below the number of tickets
                already sold.
              </p>
            </div>
          </div>
            {/* pass the initial data */}
          <EventForm mode="edit" initialData={event} />
        </div>
      </div>
    </div>
  );
}