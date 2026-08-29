/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as angles from "../angles.js";
import type * as anglesActions from "../anglesActions.js";
import type * as auth from "../auth.js";
import type * as depth from "../depth.js";
import type * as depthActions from "../depthActions.js";
import type * as env from "../env.js";
import type * as http from "../http.js";
import type * as lib_replicate from "../lib/replicate.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  angles: typeof angles;
  anglesActions: typeof anglesActions;
  auth: typeof auth;
  depth: typeof depth;
  depthActions: typeof depthActions;
  env: typeof env;
  http: typeof http;
  "lib/replicate": typeof lib_replicate;
  tasks: typeof tasks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
