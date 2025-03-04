'use client'
import { useUser } from "@clerk/clerk-react"
import { Id } from "../../convex/_generated/dataModel"
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStorageUrl } from "@/lib/utils";
import Image from "next/image";
import { CalendarDays, Check, CircleArrowLeft, CircleArrowRight, LoaderCircle, LoaderCircleIcon, MapPin, PencilIcon, StarIcon, Ticket, XCircle } from "lucide-react";
import PurchaseTicket from "./PurchaseTicket";


const EventCard = ({eventId} : {eventId: Id<"events">}) => { //{eventId: Id<"events"> -> exact type of event Id from event id table
    const {user} = useUser();
    const router = useRouter()
    const event = useQuery(api.events.getById,{eventId})//we are fetching events by eventId in frontend.
    const availability = useQuery(api.events.getEventAvailability,{eventId});//get the availabiltiy of a particular event.

    const userTicket = useQuery(api.tickets.getUserTicketForEvent,{//fetch the user ticket, if user has got one.
        eventId,
        userId: user?.id ?? ""
    });

    const queuePosition = useQuery(api.waitingList.getQueuePosition,{ //it fetches the position of user in the queue.
      eventId,
      userId: user?.id ?? ""
    });

    const imageUrl = useStorageUrl(event?.imageStorageId);//we fetch the url of image storgae if it has any image storage id.

    if(!event || !availability) return null;

    const isPastEvent = event.eventDate < Date.now();
    const isEventOwner = user?.id === event?.userId

    const renderQueuePosition = ()=> {
      if(!queuePosition || queuePosition.status !== "waiting") return null;

      if(availability.purchasedCount >= availability.totalTickets){
        return (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Ticket className="w-5 h-5 text-gray-400 mr-2"/>
              <span className="text-gray-400">
                Event is sold out
              </span>
            </div>

          </div>
        )
      }
      if(queuePosition.position === 2)
      {
        return (
          <div className="flex flex-col lg:flex-row items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center">
              <CircleArrowRight className="w-5 h-5 text-amber-500 mr-2"/>
              <span className="text-amber-700 font-medium">
                You&apos;re next in line! (Queue position: {" "}
                {queuePosition.position})
              </span>
            </div>
            <div className="flex items-center">
                <LoaderCircle className="w-4 h-4 mr-1 animate-spin text-amber-500"/>
                <span className="text-amber-600 text-sm"> Waiting for ticket</span>
            </div>

          </div>
        )
      }

      return (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center">
              <LoaderCircle className="w-4 h-4 mr-2 animate-spin text-blue-500"/>
              <span className="text-blue-700">
                Queue position
              </span>
            </div>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              #{queuePosition.position}
            </span>
        </div>
      )
    }

    const renderTicketStatus = ()=> {
      if(!user) return null;
      if(isEventOwner) {
        return (
          <div className="mt-4">
            <button onClick={(e)=>{
              e.stopPropagation();
              router.push(`/seller/events/${eventId}/edit`);
            }}
            className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 shadow-sm flex items-center justify-center gap-2"
            >
              <PencilIcon className="w-5 h-5"/>
              Edit Event
            </button>
          </div>
        )
      }
      if(userTicket)
      {
        return (
          <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2"/>
              <span className="text-green-700 font-medium">
                You have a ticket!
              </span>
            </div>
            <button
            onClick={() => router.push(`/tickets/${userTicket._id}`)}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full font-medium shadow-sm transition-colors duration-200 flex items-center gap-1">
                View your ticket
            </button>
          </div>
        )
      }

      if(queuePosition)
      {
        return (
          <div className="mt-4">
            {queuePosition.status === 'offered' && (
              <PurchaseTicket eventId={eventId}/>
            )}

            {renderQueuePosition()}
            {queuePosition.status === "expired" && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-red-700 font-medium flex items-center">
                    <XCircle className="w-5 h-5 mr-2"/>
                    offer expired
                  </span>
              </div>
            )}
          </div>
        )
      }
      return null;
    }
  return (
    <div
    onClick={() => router.push(`./event/${eventId}`)}
    className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer overflow-hidden relative ${isPastEvent ? "opacity-75 hover:opacity-100": ""}`} 
    >
        {/* Event Image */}
        {imageUrl && (
          <div className="relative w-full h-48">
            <Image
            src={imageUrl}
            alt={event.name}
            fill
            className="object-cover"
            priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        {/* Event Details */}
        <div className={`p-6 ${imageUrl ? "relative" : ""}`}>
          <div className="flex justify-between items-start">
            {/* Event name and Owner Badge */}
            <div>
              <div className="flex flex-col items-start gap-2">
                {isEventOwner && (
                  <span className="inline-flex items-center gap-1 bg-blue-600/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                    <StarIcon className="w-3 h-3"/>
                    Your event
                  </span>
                )}
                <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
              </div>
              {isPastEvent && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                  Past events
                </span>
              )}
            </div>
          
          {/* Price tag */}
          <div className="flex flex-col items-end gap-2 ml-4">
            <span className={`px-4 py-1.5 font-semibold rounded-full ${
              isPastEvent
              ? "bg-gray-50 text-gray-500"
              : "bg-green-50 text-green-700"
              }`}
              >
                ₹{event.price.toFixed(2)}
            </span>
            {availability.purchasedCount >= availability.totalTickets && (
              <span className="px-4 py-1.5 bg-red-50 text-red-700 font-semibold rounded-full text-sm">
                Sold Out
              </span>
            )}
          </div>
          </div>
          {/* Event Details */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center text-gray-500">
              <MapPin className="w-4 h-4 mr-2"/>
              <span>{event.location}</span>
            </div>

            <div className="flex items-center text-gray-600">
              <CalendarDays className="w-4 h-4 mr-2"/>
              <span>
                {new Date(event.eventDate).toLocaleDateString()}{" "}
                {isPastEvent && "(Ended)"}
              </span>
            </div>

            <div className="flex items-center text-gray-600">
              <Ticket className="w-4 h-4 mr-2"/>
              <span>
                {availability.totalTickets - availability.purchasedCount} / {" "}
                {availability.totalTickets} available
                {!isPastEvent && availability.activeOffers > 0 && (
                  <span className="text-amber-600 text-sm ml-2">
                    ({availability.activeOffers}{" "}
                    {availability.activeOffers === 1 ? "person" : "people"} trying to buy
                    )
                  </span>
                )}
              </span>
            </div>
          </div>
          <p className="mt-4 text-gray-600 text-sm line-clamp-2">
                {event.description}
          </p>

{/* e.stopPropagation() prevents the click event from reaching parent elements.
In your code, it ensures that clicking inside the <div> does not trigger any onClick event of its parent. */}
          <div onClick={(e)=> e.stopPropagation()}> 
                {!isPastEvent && renderTicketStatus()}
          </div>
        </div>
    </div>
  )
}

export default EventCard
