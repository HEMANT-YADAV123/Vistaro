import { internalMutation,query,mutation } from "./_generated/server";
import {v} from 'convex/values'
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { internal } from "./_generated/api";

export const getQueuePosition = query({
    args: {
        eventId: v.id('events'),
        userId: v.string()
    },
    handler: async (ctx,{eventId,userId})=>{
        //get entry for this specific user and event combination.
        const entry = await ctx.db //checking if the user in the waitignList , his ticket is expired or not means he has entry for event or not.
        .query("waitingList")
        .withIndex('by_user_event',(q) =>q.eq('userId',userId).eq('eventId',eventId)) //neq-> not equal to
        .filter((q) =>q.neq(q.field('status'),WAITING_LIST_STATUS.EXPIRED))
        .first()

        if (!entry) return null
        //get total number of people ahead in the line.
        const peopleAhead = await ctx.db
        .query('waitingList')
        .withIndex('by_event_status',(q)=> q.eq("eventId",eventId))
        .filter((q)=>
          q.and(
            //get all entries before our user ticket entry
            q.lt(q.field('_creationTime'),entry._creationTime), //lt-> less than
            q.or(
            q.eq(q.field('status'),WAITING_LIST_STATUS.WAITING),
            q.eq(q.field('status'),WAITING_LIST_STATUS.OFFERED)
            )
          )
        )
        .collect()
        .then((entries) => entries.length)
        
        return {
            ...entry,
            position: peopleAhead+1
        }
    }
});

// Internal mutation to expire a single offer and process queue for next person.
// Called by scheduled job when offer timer expires.

export const expireOffer = internalMutation({
  args: {
    waitingListId: v.id("waitingList"),
    eventId: v.id("events"),
  },
  handler: async (ctx, {waitingListId , eventId}) => {
      const offer = await ctx.db.get(waitingListId);
      // if offer is not found or is not on OFFERED status, do nothing.
      if(!offer || offer.status !== WAITING_LIST_STATUS.OFFERED) return;

      await ctx.db.patch(waitingListId,{
        status: WAITING_LIST_STATUS.EXPIRED
      });

      await processQueue(ctx, {eventId});
  },

});
// Mutation to process the waiting list queue and offer ticket to next eligible users.
// check current availability considering purchased tickets and active offers.
export const processQueue = mutation({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx,{eventId}) => {
      const event = await ctx.db.get(eventId);
      if(!event) throw new Error("Event not found")

      const {availableSpots} = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("_id"),eventId))
      .first()
      .then(async (event) => {
          if(!event) throw new Error("Event not found");

          const purchasedCount = await ctx.db
          .query("tickets")
          .withIndex("by_event",(q) => q.eq("eventId",eventId))
          .collect()
          .then(
            (tickets) =>
              tickets.filter(
                (t) => 
                  t.status === TICKET_STATUS.VALID ||
                t.status === TICKET_STATUS.USED
              ).length
          );
          const now = Date.now();
          const activeOffers = await ctx.db
          .query("waitingList")
          .withIndex("by_event_status",(q)=>
          q.eq("eventId",eventId).eq("status",WAITING_LIST_STATUS.OFFERED)
        )
        .collect()
        .then(
          (entries) =>
            entries.filter((e) => (e.offerExpiresAt ?? 0) > now).length
        );
        return {
          availableSpots: event.totalTickets - (purchasedCount + activeOffers)
        }
      });  
      if(availableSpots <=0) return;

      //get next user in line
      const waitingUsers = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status",(q)=>
      q.eq("eventId",eventId).eq("status",WAITING_LIST_STATUS.WAITING)
    )
    .order("asc")
    .take(availableSpots)

    //Create time-limited offers for selected offers.
    const now = Date.now()
    for(const user of waitingUsers) {
      //update the waiting list entry to OFFERED status.
      await ctx.db.patch(user._id,{
        status: WAITING_LIST_STATUS.OFFERED,
        offerExpiresAt: now + DURATIONS.TICKET_OFFER,
      });

      //Schedule expiration job for this offer.//after giving any ticked update the scheduler in the cron.
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.waitingList.expireOffer,
        {
          waitingListId: user._id,
          eventId
        }
      )
    }
  }
})

export const releaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    waitingListId: v.id("waitingList"),
  },
  handler: async (ctx,{eventId,waitingListId}) => {
      const entry = await ctx.db.get(waitingListId);

      if(!entry || entry.status !== WAITING_LIST_STATUS.OFFERED) 
      { 
        throw new Error("No valid ticket offer found");
      }

      //Mark the entry as expired.
      await ctx.db.patch(waitingListId, {
        status: WAITING_LIST_STATUS.EXPIRED,
      });

      //process the queue to offer the ticket to next person.
      await processQueue(ctx, {eventId}); //means when we are offered a ticket in the queue and we decided to release it the it will process the queue and offer the ticket to next eligible user.
  },
})