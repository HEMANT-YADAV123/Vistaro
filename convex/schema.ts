import { defineSchema,defineTable } from "convex/server";
import { v } from "convex/values";//v for value type

export default defineSchema({
    //defining table of events.
    events: defineTable({
        name: v.string(),
        description: v.string(),
        location: v.string(),
        eventDate: v.number(),
        price: v.number(),
        totalTickets: v.number(),
        userId: v.string(),
        imageStorageId: v.optional(v.id("_storage")),
        is_cancelled: v.optional(v.boolean()),
    }),

    //defining table of tickets.
    tickets: defineTable({
        eventId: v.id("events"), // Foreign key linking to the 'events' table.
        userId: v.string(),
        purchasedAt: v.number(),
        status: v.union(
            v.literal("valid"),
            v.literal("used"),
            v.literal("refunded"),
            v.literal("cancelled")
        ),
        paymentIntentId: v.optional(v.string()),
        amount: v.optional(v.number())
    })
//index are used to find any ticked or event means it optimize the query process.
//e.g when we perform a query for finding all tickets purchased by a specific user the database checks if there's an index for the field(s) in your query. If an index exists, it uses it to locate the data faster. Without an index, the database would need to search through all rows in the table, which can be very slow for large datasets.
        .index("by_event",["eventId"])
        .index("by_user",["userId"])
        .index("by_user_event",["userId","eventId"])
        .index("by_payment_intent",["paymentIntentId"]),

    //waiting list table (imp for queue logic)
    waitingList: defineTable({
        eventId: v.id("events"),
        userId: v.string(),
        status: v.union(
            v.literal("waiting"),
            v.literal("offered"),
            v.literal("purchased"),
            v.literal("expired")
        ),
        offerExpiresAt: v.optional(v.number()),
    })    
        .index("by_event_status",["eventId", "status"])
        .index("by_user_event",["userId","eventId"])
        .index("by_user",["userId"]),
        
    //user table
    
    users: defineTable({
        name: v.string(),
        email: v.string(),
        userId: v.string(),
        stripeConnectId: v.optional(v.string()),
    })
        .index("by_user_id",["userId"])
        .index("by_email",["email"])
});