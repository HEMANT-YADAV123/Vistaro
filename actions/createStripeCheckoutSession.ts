"use server";

import { stripe } from "@/lib/stripe";
import { getConvexClient } from "../src/lib/convex";
import { api } from "../convex/_generated/api"; 
import { Id } from "../convex/_generated/dataModel";
import baseUrl from "../src/lib/baseUrl";
import { auth } from "@clerk/nextjs/server";
import { DURATIONS } from "../convex/constants";

export type StripeCheckoutMetaData = {
  eventId: Id<"events">;
  userId: string;
  waitingListId: Id<"waitingList">;
};

export async function createStripeCheckoutSession({
  eventId,
}: {
  eventId: Id<"events">;
}) {
  const { userId } = await auth();// Uses auth() to check if the user is logged in.
  if (!userId) throw new Error("Not authenticated");

  const convex = getConvexClient();

  // Get event details
  const event = await convex.query(api.events.getById, { eventId });//Retrieves event details from the database.
  if (!event) throw new Error("Event not found");

  // Get waiting list entry
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, {//Checks if the user has a valid ticket offer in the waiting list.
    eventId,
    userId,
  });

  if (!queuePosition || queuePosition.status !== "offered") {
    throw new Error("No valid ticket offer found");
  }

  const stripeConnectId = await convex.query( //Fetches the Stripe account ID of the event creator(owner).
    api.users.getUserStripeConnectId,
    {
      userId: event.userId,
    }
  );

  if (!stripeConnectId) {
    throw new Error("Stripe Connect ID not found for owner of the event!");
  }

  if (!queuePosition.offerExpiresAt) {
    throw new Error("Ticket offer has no expiration date");
  }

  const metadata: StripeCheckoutMetaData = {
    eventId,
    userId,
    waitingListId: queuePosition._id,
  };

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create( //Create a Stripe Checkout Session
    {
      payment_method_types: ["card"],//Defines the payment method (card).
      line_items: [
        {
          price_data: {
            currency: "inr",  //INR 
            product_data: {
              name: event.name,
              description: event.description,
            },
            unit_amount: Math.round(event.price * 100),// Convert INR to paise
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(event.price * 100 * 0.01),//1% fee.the platform owner will make.
      },
      expires_at: Math.floor(Date.now() / 1000) + DURATIONS.TICKET_OFFER / 1000, // 30 minutes (stripe checkout minimum expiration time)
      mode: "payment",
      success_url: `${baseUrl}/tickets/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/event/${eventId}`,
      metadata,
    },
    {
      stripeAccount: stripeConnectId,//stripe connect Id for the event owner(seller).
    }
  );

  return { sessionId: session.id, sessionUrl: session.url };//Returns the session ID and checkout URL, allowing the user to proceed with payment.
}