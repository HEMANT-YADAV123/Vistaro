import { internalMutation,query,mutation } from "./_generated/server";
import {v} from 'convex/values'
import { WAITING_LIST_STATUS } from "./constants";

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
})