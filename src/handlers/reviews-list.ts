import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../toolkit/store.js";

registerMainMenuItem({ label: "⭐ Reviews", data: "reviews:list", order: 30 });

const composer = new Composer<Ctx>();

composer.callbackQuery("reviews:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const reviews = await store.getReviews();

  if (reviews.length === 0) {
    await ctx.reply("No reviews yet — be the first to leave one after your appointment.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = reviews.map((r) => {
    const stars = "⭐".repeat(Math.min(r.rating, 5));
    const reply = r.adminReply ? `\n  💬 Reply: ${r.adminReply}` : "";
    return `${stars} — "${r.text}"${reply}`;
  });

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
