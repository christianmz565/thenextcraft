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
    // Colored version of the same map. Visualization only — never sampled.
    colorStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    modelVersion: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_scene", ["userId", "sceneStorageId"]),
  // Product photos re-rendered from a different camera angle. `sourceStorageId` may
  // itself be a previous result, which is how angles get chained.
  productAngles: defineTable({
    userId: v.id("users"),
    sourceStorageId: v.id("_storage"),
    resultStorageId: v.optional(v.id("_storage")),
    rotateDegrees: v.number(),
    verticalTilt: v.number(),
    // Optional framing controls. Persisted so a run can be inspected or repeated.
    moveForward: v.optional(v.number()),
    useWideAngle: v.optional(v.boolean()),
    prompt: v.optional(v.string()),
    seed: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    modelVersions: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_source", ["userId", "sourceStorageId"]),
  // Foreground subject extracted from a photo with an alpha channel. The layer that
  // makes "text behind subject" possible: background at the back, text in the middle,
  // this cutout on top.
  subjectCutouts: defineTable({
    userId: v.id("users"),
    sourceStorageId: v.id("_storage"),
    resultStorageId: v.optional(v.id("_storage")),
    threshold: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    modelVersions: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_source", ["userId", "sourceStorageId"]),
  userFiles: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("object"), v.literal("scene")),
    createdAt: v.number(),
  }).index("by_user_storage", ["userId", "storageId"]),
});
