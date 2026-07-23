import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../toolkit/store.js";

registerMainMenuItem({ label: "🖼️ Portfolio", data: "portfolio:gallery", order: 20 });

const composer = new Composer<Ctx>();

composer.callbackQuery("portfolio:gallery", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const items = await store.getPortfolioItems();

  if (items.length === 0) {
    await ctx.reply("Portfolio coming soon — stay tuned.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = items.map((item) => {
    const tags = item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";
    return `• ${item.caption}${tags}`;
  });

  await ctx.reply(lines.join("\n\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
