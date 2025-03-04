"use server";

import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function createStripeConnectAccountLink(account: string) {
  try {
    const headersList = await headers(); //next/headers to fetch the request headers.
    const origin = headersList.get("origin") || "";//Extracts the origin (e.g., "https://yourdomain.com") to use for redirect URLs.

    const accountLink = await stripe.accountLinks.create({//Calls stripe.accountLinks.create() to generate an onboarding URL for the account (Stripe account ID).
      account,
      refresh_url: `${origin}/connect/refresh/${account}`,//refresh_url: If onboarding fails, Stripe redirects the user here.
      return_url: `${origin}/connect/return/${account}`,//return_url: If onboarding succeeds, Stripe redirects the user here.
      type: "account_onboarding",
    });

    return { url: accountLink.url };//Returns the URL (accountLink.url) so the user can be redirected.
  } catch (error) {
    console.error(
      "An error occurred when calling the Stripe API to create an account link:",
      error
    );
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred");
  }
}

//then create stripe checkout session.