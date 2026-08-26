import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { inviteCode, STARTERS } from "./helpers";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const username = String(params.username ?? params.email ?? "")
          .replace(/^@/, "")
          .replace(/\s/g, "");
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error("Username must be 3–20 letters, numbers, or underscores.");
        }
        if (params.flow === "signUp") {
          const name = String(params.name ?? "").trim();
          if (name.length < 2) throw new Error("Name needs at least 2 characters.");
          return { email: username, name, username };
        }
        return { email: username, username } as {
          email: string;
          name?: string;
          username?: string;
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return;
      const user = await ctx.db.get(userId);
      if (!user) return;
      let code = inviteCode();
      const users = await ctx.db.query("users").collect();
      const taken = new Set(users.map((u) => u.inviteCode).filter(Boolean));
      while (taken.has(code)) code = inviteCode();
      await ctx.db.patch(userId, {
        goals: user.goals ?? "",
        energy: user.energy ?? "steady",
        dailyTaskGoal: user.dailyTaskGoal ?? 3,
        theme: user.theme ?? "dark",
        notifyEvening: user.notifyEvening ?? true,
        notifyStreakRisk: user.notifyStreakRisk ?? true,
        notifyFriends: user.notifyFriends ?? false,
        inviteCode: user.inviteCode ?? code,
        showRulesToFriends: user.showRulesToFriends ?? true,
      });
      const existing = await ctx.db
        .query("strategies")
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      if (!existing) {
        for (const starter of STARTERS) {
          await ctx.db.insert("strategies", {
            userId,
            title: starter.title,
            description: starter.description,
            active: starter.active,
          });
        }
      }
    },
  },
});
