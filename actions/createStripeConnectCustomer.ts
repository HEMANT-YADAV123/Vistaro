"use server"

import { auth } from "@clerk/nextjs/server";
import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { stripe } from "@/lib/stripe";


if(!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set")
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL); //create a convex http client

export async function createStripeConnectCustomer() {
    const {userId} = await auth();//get client from clerk.

    if(!userId)
    {
        throw new Error("Not authenticated");
    }

    // Check if user already has a connect account.
    // useQuery() is a React Hook designed to be used inside functional React components.
    // It runs on the client side, making real-time queries to the database.
    // It cannot be used outside of React components, such as in server functions.
    const existingStripeConnectId = await convex.query( //it is different from useQuery ,convex.query() directly fetches data from Convex on the server.
        api.users.getUserStripeConnectId,
        {
            userId,
        }
    );

    if(existingStripeConnectId)
    {
        return {account: existingStripeConnectId}
    }

    //create new connect account.
    const account = await stripe.accounts.create({
        type: "express",//express stripe connect connection
        capabilities: {
            card_payments: {requested: true},
            transfers: {requested: true},
        }
    });

    //update the Database of user with stripe connect Id.
    await convex.mutation(api.users.updateOrCreateUserStripeConnectId,{
        userId,
        stripeConnectId: account.id
    });

    return {account: account.id};
}