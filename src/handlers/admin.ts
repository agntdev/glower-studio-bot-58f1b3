import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore } from "../toolkit/store.js";

const ADMIN_IDS: number[] = (() => {
  const raw = process.env.ADMIN_IDS ?? "";
  if (!raw) return [];
  return raw.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
})();

function isAdmin(userId: number): boolean {
  if (ADMIN_IDS.length === 0) return true;
  return ADMIN_IDS.includes(userId);
}

const composer = new Composer<Ctx>();

composer.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from!.id)) {
    await ctx.reply("You don't have admin access.");
    return;
  }
  await showAdminPanel(ctx);
});

composer.callbackQuery("admin:panel", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) {
    await ctx.reply("You don't have admin access.");
    return;
  }
  await showAdminPanel(ctx);
});

composer.callbackQuery("admin:bookings", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const store = getStore();
  const bookings = await store.getAllBookings();
  const pending = bookings.filter((b) => b.status === "pending");

  if (pending.length === 0) {
    await ctx.reply("No pending booking requests.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
    });
    return;
  }

  const rows = pending.map((b) => [
    inlineButton(
      `${b.clientName} — ${b.serviceName} (${b.requestedDatetime})`,
      `admin:booking:${b.id}`,
    ),
  ]);
  rows.push([inlineButton("⬅️ Back", "admin:panel")]);

  await ctx.reply(`Pending bookings (${pending.length}):`, {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^admin:booking:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const bookingId = ctx.match![1];
  const store = getStore();
  const booking = await store.getBooking(bookingId);

  if (!booking) {
    await ctx.reply("Booking not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
    });
    return;
  }

  const text =
    `📋 Booking #${booking.id}\n\n` +
    `👤 Client: ${booking.clientName}\n` +
    `💅 Service: ${booking.serviceName}\n` +
    `📅 When: ${booking.requestedDatetime}` +
    (booking.notes ? `\n📝 Notes: ${booking.notes}` : "") +
    (booking.phone ? `\n📞 Phone: ${booking.phone}` : "") +
    `\n📊 Status: ${booking.status}`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [
        inlineButton("✅ Confirm", `admin:confirm:${booking.id}`),
        inlineButton("❌ Decline", `admin:decline:${booking.id}`),
      ],
      [inlineButton("⬅️ Back", "admin:bookings")],
    ]),
  });
});

composer.callbackQuery(/^admin:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const bookingId = ctx.match![1];
  const store = getStore();
  await store.updateBooking(bookingId, { status: "confirmed" });

  await ctx.reply("Booking confirmed.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:bookings")]]),
  });
});

composer.callbackQuery(/^admin:decline:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const bookingId = ctx.match![1];
  const store = getStore();
  await store.updateBooking(bookingId, { status: "declined" });

  await ctx.reply("Booking declined.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:bookings")]]),
  });
});

composer.callbackQuery("admin:reviews", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const store = getStore();
  const reviews = await store.getReviews();

  if (reviews.length === 0) {
    await ctx.reply("No reviews yet.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
    });
    return;
  }

  const lines = reviews.map((r) => {
    const stars = "⭐".repeat(Math.min(r.rating, 5));
    const reply = r.adminReply ? `\n  Your reply: ${r.adminReply}` : "";
    return `${stars} — "${r.text}" by ${r.clientName}${reply}`;
  });

  await ctx.reply("Reviews:\n\n" + lines.join("\n\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
  });
});

composer.callbackQuery("admin:services", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!isAdmin(ctx.from!.id)) return;
  const store = getStore();
  const services = await store.getServices();

  if (services.length === 0) {
    await ctx.reply("No services configured.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
    });
    return;
  }

  const lines = services.map(
    (s) => `• ${s.name} — $${s.price} (${s.duration} min)`,
  );

  await ctx.reply("Services:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
  });
});

async function showAdminPanel(ctx: Ctx) {
  await ctx.reply("Admin panel — pick what you need:", {
    reply_markup: inlineKeyboard([
      [inlineButton("📋 Pending bookings", "admin:bookings")],
      [inlineButton("⭐ Reviews", "admin:reviews")],
      [inlineButton("💅 Services", "admin:services")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
}

export default composer;
