"use server"
import { stripe } from "@/lib/stripe";

export async function createStripeConnectLoginLink(stripeAccountId: string)
{       
    if(!stripeAccountId)
    {
        throw new Error("No Stripe id provided")
    }

    try {
        const loginLink = stripe.accounts.createLoginLink(stripeAccountId);
        return (await loginLink).url;
    } catch (error) {
        console.error("Error creating stripe account login link",error);
        throw new Error("failed ro create stripe account login link");
    }
}