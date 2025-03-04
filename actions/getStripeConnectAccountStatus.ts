"use server"

import { stripe } from "@/lib/stripe";

export type AccountStatus = {  //this is a type object (AccountStatus).
    isActive: boolean
    requiresInformation: boolean
    requirements: {
        currently_due: string[];
        eventually_due: string[];
        past_due: string[];
    }
    chargesEnabled: boolean
    payoutsEnabled: boolean
};

//  a function getStripeConnectAccountStatus that will return an AccountStatus object based on a given stripeAccountId
export async function getStripeConnectAccountStatus(stripeAccountId: string): Promise<AccountStatus> {
    if(!stripeAccountId)
    {
        throw new Error("No stripe account ID provided");
    }

    try {
        const account = await stripe.accounts.retrieve(stripeAccountId);//fetch account details from Stripe.

        return {
            isActive: account.details_submitted && !account.requirements?.currently_due?.length,
            requiresInformation: !!( //double exclamation mark (!!) is used to convert a value into a boolean explicitly.
                account.requirements?.currently_due?.length || //account.requirements has field currently_due, etc
                account.requirements?.eventually_due?.length ||
                account.requirements?.past_due?.length
            ),
            requirements: {
                currently_due: account.requirements?.currently_due || [],
                eventually_due: account.requirements?.eventually_due || [],
                past_due: account.requirements?.past_due || [],
            },
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
        }
    
    }
    catch (error) {
        console.error("error fetching stripe connect account status",error)
        throw new Error("Failed to fetch stripe connect account status");
    } 
}
//now we have an account now we have to link it so createAccountLink.