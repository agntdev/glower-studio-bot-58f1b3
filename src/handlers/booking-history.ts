import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../toolkit/store.js";

registerMainMenuItem({ label: "📋 My Bookings", data: "booking:history", order: 50 });

const composer = new Composer<Ctx>();

composer.callbackQuery("booking:history", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const bookings = await store.getBookingsByClient(ctx.from!.id);

  if (bookings.length === 0) {
    await ctx.reply("No bookings yet — tap 📅 Book to schedule one.", {
      reply_markup: inlineKeyboard([
        [inlineButton("📅 Book now", "booking:start")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }

  const statusEmoji: Record<string, string> = {
    pending: "⏳",
    confirmed: "✅",
    declined: "❌",
    completed: "✔️",
  };

  const lines = bookings.map((b) => {
    const emoji = statusEmoji[b.status] ?? "❓";
    return `${emoji} ${b.serviceName} — ${b.requestedDatetime} (${b.status})`;
  });

  await ctx.reply("Your bookings:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
