/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as days from "../days.js";
import type * as friends from "../friends.js";
import type * as generate from "../generate.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as rules from "../rules.js";
import type * as snapshot from "../snapshot.js";
import type * as strategies from "../strategies.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  days: typeof days;
  friends: typeof friends;
  generate: typeof generate;
  helpers: typeof helpers;
  http: typeof http;
  leaderboard: typeof leaderboard;
  rules: typeof rules;
  snapshot: typeof snapshot;
  strategies: typeof strategies;
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
