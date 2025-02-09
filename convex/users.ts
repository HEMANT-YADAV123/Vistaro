import {v} from 'convex/values'
import { mutation,query } from './_generated/server'

export const getUserById = query({
    args:{userId: v.string()},
    handler: async (ctx, {userId}) => {
        const user = await ctx.db //ctx: Context object provided by Convex, used for database interactions.
        .query("users")
        .withIndex("by_user_id", (q)=> q.eq("userId",userId))
        .first()

        return user
    }
})

export const updateUser = mutation({
    args:{
        userId:v.string(),
        name:v.string(),
        email:v.string()
    },
    handler: async(ctx,{userId,name,email})=>{
        //check if existing user
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_user_id", (q) => q.eq("userId",userId))
            .first();

        if(existingUser) 
        {
            //update the user
            await ctx.db.patch(existingUser._id,{
                name,
                email,
            });
            return existingUser._id;
        }
        
        //Create new user
        const newUserId= await ctx.db.insert("users",{
            userId,
            name,
            email,
            stripeConnectId: undefined,
        });

        return newUserId;
    },
})