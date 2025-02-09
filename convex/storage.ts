import { v } from "convex/values";
import { query } from "./_generated/server";

export const getUrl = query({
    args: {storageId: v.id("_storage")},
    handler: async (ctx,{storageId})=> {
        return await ctx.storage.getUrl(storageId)
    }
})