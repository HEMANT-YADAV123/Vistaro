import { v } from "convex/values";
import { query } from "./_generated/server"
import { TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";


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
})