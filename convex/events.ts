import { v } from "convex/values";
import { mutation, query } from "./_generated/server"
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { internal } from "./_generated/api";
import { processQueue } from "./waitingList";

export type Metrics = {
  soldTickets: number;
  refundedTickets: number;
  cancelledTickets: number;
  revenue: number;
};


export const get = query({
    args:{},
    handler: async (ctx) => {//it is a query that get into the database and get all the events that are not cancelled.And and then collect them.
        return await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("is_cancelled"),undefined))//is cancelled = undefined means all events which are not cancelled.
        .collect();
    }
})

export const getById = query({ 
    args: {eventId: v.id("events")},//event Id provided must be valid event Id.
    handler: async (ctx,{eventId}) => {
        return await ctx.db.get(eventId);//Retrieves a specific event from the "events" collection using the given eventId.
    }
});

export const getEventAvailability = query({
    args:{eventId: v.id("events")},
    handler: async (ctx,{eventId}) => {
        const event = await ctx.db.get(eventId)
        if(!event) throw new Error("Event not found");

        //count the no of ticket purchased
        const purchasedCount = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId",eventId))
        .collect()
        .then(
            (tickets) => 
                tickets.filter(
                    (t) =>
                        t.status === TICKET_STATUS.VALID ||
                        t.status === TICKET_STATUS.USED
                ).length
        );
        //count current valid offers means tickets which are offered to somebody means somebody is in waiting list for that event ticket.
        const now = Date.now();
        const activeOffers = await ctx.db
        .query("waitingList")
        .withIndex("by_event_status" , (q) =>
            q.eq("eventId",eventId).eq("status" , WAITING_LIST_STATUS.OFFERED)
        )
        .collect()
        .then(
            (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
        );

        const totalReserved = purchasedCount + activeOffers;

        return {
            isSoldOut: totalReserved >= event.totalTickets,
            totalTickets: event.totalTickets,
            purchasedCount,
            activeOffers,
            remainingTickets: Math.max(0,event.totalTickets - totalReserved)
        }
    }
});

//Helper function to check ticket availability for this event.
export const checkAvailability = query({
    args: { eventId: v.id("events")},
    handler: async (ctx, {eventId}) => {
        const event = await ctx.db.get(eventId);
        if(!event) throw new Error("Event not found")
        
            //count the number of total purchased tickets.
            const purchasedCount = await ctx.db
            .query("tickets")
            .withIndex("by_event",(q)=> q.eq("eventId",eventId))
            .collect()
            .then(
                (tickets) =>
                    tickets.filter(
                        (t) =>
                            t.status === TICKET_STATUS.VALID ||
                            t.status === TICKET_STATUS.USED
                    ).length
            );

            //count current valid offers
            const now = Date.now();
            const activeOffers = await ctx.db
            .query("waitingList")
            .withIndex("by_event_status",(q) => 
                q.eq("eventId",eventId).eq("status",WAITING_LIST_STATUS.OFFERED)
            )
            .collect()
            .then(
                (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
            );

            const availableSpots = event.totalTickets - (purchasedCount + activeOffers);

            return {
                available: availableSpots > 0,
                availableSpots,
                totalTickets: event.totalTickets,
                purchasedCount,
                activeOffers
            }
    }
})

//Join waiting list for an event.
export const joinWaitingList = mutation({
    //function takes eventId and userId as a argument.
    args:{eventId: v.id("events"),userId: v.string()},
    handler: async(ctx, { eventId,userId }) => {
        // first check if user already have an active entry in waiting list for this event.
        //active means any status except expired EXPIRED.
        const existingEntry = await ctx.db
        .query("waitingList")
        .withIndex("by_user_event",(q) =>
            q.eq("userId",userId).eq("eventId",eventId)
        )
        .filter((q) => q.neq(q.field("status"),WAITING_LIST_STATUS.EXPIRED))
        .first();

        //Dont allow duplicate entries.
        if(existingEntry)
        {
            throw new Error("Already in the waiting list for this event");
        }

        //verify if the event exists.
        const event = await ctx.db.get(eventId);
        if(!event) throw new Error("Event not found");

        //check if there are any available tickets now.
        const {available} = await checkAvailability(ctx,{eventId});
        const now = Date.now();
        if(available){
        //if tickets are available, create an offer entry.
        const waitingListId = await ctx.db.insert("waitingList",{
            eventId,
            userId,
            status:WAITING_LIST_STATUS.OFFERED,
            offerExpiresAt: now + DURATIONS.TICKET_OFFER,//set expiration time.
        });

        //schedule a job to expire this offer after the offer duration.
        await ctx.scheduler.runAfter(
            DURATIONS.TICKET_OFFER,
            internal.waitingList.expireOffer,
            {
                waitingListId,
                eventId
            }
        )
    } else {
        //if no tickets available, add to waiting list.
        await ctx.db.insert("waitingList", {
            eventId,
            userId,
            status: WAITING_LIST_STATUS.WAITING,
        });
    }

    //Return an message.
    return {
        success: true,
        status: available
                ? WAITING_LIST_STATUS.OFFERED //if available , status os offered.
                : WAITING_LIST_STATUS.WAITING, //if not available , status os offered.
            message: available
                ? `Ticket offered - you have ${DURATIONS.TICKET_OFFER / (60 * 1000)} minutes to purchase`
                : "Addedto waiting list - you'll be notified when a ticket becomes available",
    };
},
})

export const create = mutation({

    args: {
        name: v.string(),
        description: v.string(),
        location: v.string(),
        eventDate: v.number(), // Store as timestamp
        price: v.number(),
        totalTickets: v.number(),
        userId: v.string(),
      },

      handler: async (ctx, args) => {
        const eventId = await ctx.db.insert("events", {
          name: args.name,
          description: args.description,
          location: args.location,
          eventDate: args.eventDate,
          price: args.price,
          totalTickets: args.totalTickets,
          userId: args.userId,
        });
        return eventId;
      },
})


export const updateEvent = mutation({
    args: {
      eventId: v.id("events"),
      name: v.string(),
      description: v.string(),
      location: v.string(),
      eventDate: v.number(),
      price: v.number(),
      totalTickets: v.number(),
    },
    handler: async (ctx, args) => {
        const { eventId, ...updates } = args;

    // Get current event to check tickets sold
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const soldTickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();

    // Ensure new total tickets is not less than sold tickets
    if (updates.totalTickets < soldTickets.length) {
      throw new Error(
        `Cannot reduce total tickets below ${soldTickets.length} (number of tickets already sold)`
      );
    }
    await ctx.db.patch(eventId, updates);
    return eventId;
  },

  });


  // Purchase ticket
export const purchaseTicket = mutation({
    args: {
      eventId: v.id("events"),
      userId: v.string(),
      waitingListId: v.id("waitingList"),
      paymentInfo: v.object({
        paymentIntentId: v.string(),
        amount: v.number(),
      }),
    },
    handler: async (ctx, { eventId, userId, waitingListId, paymentInfo }) => {

        console.log("Starting purchaseTicket handler", {
            eventId,
            userId,
            waitingListId,
          });
      
          // Verify waiting list entry exists and is valid
          const waitingListEntry = await ctx.db.get(waitingListId);
          console.log("Waiting list entry:", waitingListEntry);
      
          if (!waitingListEntry) {
            console.error("Waiting list entry not found");
            throw new Error("Waiting list entry not found");
          }
      
          if (waitingListEntry.status !== WAITING_LIST_STATUS.OFFERED) {
            console.error("Invalid waiting list status", {
              status: waitingListEntry.status,
            });
            throw new Error(
              "Invalid waiting list status - ticket offer may have expired"
            );
          }
      //if user id not match
          if (waitingListEntry.userId !== userId) {
            console.error("User ID mismatch", {
              waitingListUserId: waitingListEntry.userId,
              requestUserId: userId,
            });
            throw new Error("Waiting list entry does not belong to this user");
          }
      
          // Verify event exists and is active
          const event = await ctx.db.get(eventId);
          console.log("Event details:", event);
      
          if (!event) {
            console.error("Event not found", { eventId });
            throw new Error("Event not found");
          }
      
          if (event.is_cancelled) {
            console.error("Attempted purchase of cancelled event", { eventId });
            throw new Error("Event is no longer active");
          }
      
          try {
            console.log("Creating ticket with payment info", paymentInfo);
            // Create ticket with payment info
            await ctx.db.insert("tickets", {
              eventId,
              userId,
              purchasedAt: Date.now(),
              status: TICKET_STATUS.VALID,
              paymentIntentId: paymentInfo.paymentIntentId,
              amount: paymentInfo.amount,
            });
      
            console.log("Updating waiting list status to purchased");
            await ctx.db.patch(waitingListId, {
              status: WAITING_LIST_STATUS.PURCHASED,
            });
      
            console.log("Processing queue for next person");
            // Process queue for next person
            await processQueue(ctx, { eventId });
      
            console.log("Purchase ticket completed successfully");
          } catch (error) {
            console.error("Failed to complete ticket purchase:", error);
            throw new Error(`Failed to complete ticket purchase: ${error}`);
          }
    },
  });


  // Get user's tickets with event information
export const getUserTickets = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
  
      const ticketsWithEvents = await Promise.all( //get all the tickets of user.
        tickets.map(async (ticket) => {
          const event = await ctx.db.get(ticket.eventId);
          return {
            ...ticket,
            event,
          };
        })
      );
  
      return ticketsWithEvents;
    },
  });
  
  export const search = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, { searchTerm }) => {
      const events = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("is_cancelled"), undefined))
        .collect();
  
      return events.filter((event) => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          event.name.toLowerCase().includes(searchTermLower) ||
          event.description.toLowerCase().includes(searchTermLower) ||
          event.location.toLowerCase().includes(searchTermLower)
        );
      });
    },
  });

  export const getSellerEvents = query({
    args: { userId: v.string() },
    handler: async (ctx, { userId }) => {
      const events = await ctx.db //get all the events with using its id.
        .query("events")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
  
      // For each event, get ticket sales data
      const eventsWithMetrics = await Promise.all(
        events.map(async (event) => {
          const tickets = await ctx.db
            .query("tickets")
            .withIndex("by_event", (q) => q.eq("eventId", event._id))
            .collect();
  
          const validTickets = tickets.filter( //get the valid tickets which are not cancelled.
            (t) => t.status === "valid" || t.status === "used"
          );
          const refundedTickets = tickets.filter((t) => t.status === "refunded");//refunded tickets.
          const cancelledTickets = tickets.filter(//cancelled
            (t) => t.status === "cancelled"
          );
  
          const metrics: Metrics = {
            soldTickets: validTickets.length,
            refundedTickets: refundedTickets.length,
            cancelledTickets: cancelledTickets.length,
            revenue: validTickets.length * event.price,
          };
  
          return {
            ...event,
            metrics,//return events and metrices(sold tickets means valid, refunded etc)
          };
        })
      );
  
      return eventsWithMetrics;
    },
  });

  export const cancelEvent = mutation({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
      const event = await ctx.db.get(eventId);
      if (!event) throw new Error("Event not found");
  
      // Get all valid tickets for this event
      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
        )
        .collect();
  
      if (tickets.length > 0) {
        throw new Error(
          "Cannot cancel event with active tickets. Please refund all tickets first."
        );
      }
  
      // Mark event as cancelled
      await ctx.db.patch(eventId, {
        is_cancelled: true,
      });
  
      // Delete any waiting list entries
      const waitingListEntries = await ctx.db
        .query("waitingList")
        .withIndex("by_event_status", (q) => q.eq("eventId", eventId))
        .collect();
  
      for (const entry of waitingListEntries) {
        await ctx.db.delete(entry._id);
      }
  
      return { success: true };
    },
  });