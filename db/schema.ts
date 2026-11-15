import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  scope: text("scope").primaryKey(),
  version: integer("version").notNull(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const providerCache = sqliteTable("provider_cache", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(),
  status: text("status").notNull(),
  payload: text("payload"),
  createdAt: integer("created_at").notNull(),
});
export const providerUsage = sqliteTable("provider_usage", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
});
