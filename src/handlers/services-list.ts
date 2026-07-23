import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../toolkit/store.js";

registerMainMenuItem({ label: "💅 Services", data: "services:list", order: 10 });

const composer = new Composer<Ctx>();

composer.callbackQuery("services:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const services = await store.getServices();

  if (services.length === 0) {
    await ctx.reply("No services available yet — check back soon.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = services.map(
    (s) => `• ${s.name} — $${s.price} (${s.duration} min)\n  ${s.description}`,
  );

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
