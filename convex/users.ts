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

export const getUserStripeConnectId = query({
    args:{userId:v.string()},

    handler: async (ctx,args) => {
        const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("userId"),args.userId))//filter where userId is equal to args.userId.
        .filter((q) => q.neq(q.field("stripeConnectId"),undefined))//filter where stripeConnectId is not undefined.
        .first()
        return user?.stripeConnectId;
    }
})

export const updateOrCreateUserStripeConnectId = mutation({
    args: {userId: v.string(),stripeConnectId: v.string()},
    handler: async (ctx,args) => {
        const user = await ctx.db
        .query("users")
        .withIndex("by_user_id",(q) => q.eq("userId",args.userId))
        .first();
        
        if(!user)
        {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id,{stripeConnectId: args.stripeConnectId});
        // ctx.db.patch(user._id, {...}) → Updates an existing record in the database.
        // Finds the user by user._id.
        // Updates only the stripeConnectId field without affecting other user data.
    } 
})