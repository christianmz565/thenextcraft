import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completed"]),
  depthMaps: defineTable({
    userId: v.id("users"),
    objectStorageId: v.id("_storage"),
    sceneStorageId: v.id("_storage"),
    depthStorageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
    modelVersion: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_scene", ["userId", "sceneStorageId"]),
  userFiles: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("object"), v.literal("scene")),
    createdAt: v.number(),
  }).index("by_user_storage", ["userId", "storageId"]),
});
