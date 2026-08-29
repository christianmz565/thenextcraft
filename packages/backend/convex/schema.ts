import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Example table — replace with your domain model
  tasks: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }).index("by_completed", ["completed"]),

  // Add your tables here, e.g.:
  // users: defineTable({
  //   name: v.string(),
  //   email: v.string(),
  // }).index("by_email", ["email"]),
});
