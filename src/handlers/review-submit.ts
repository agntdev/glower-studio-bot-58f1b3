import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore, generateReviewId } from "../toolkit/store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("review:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const bookings = await store.getBookingsByClient(ctx.from!.id);
  const completed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");

  if (completed.length === 0) {
    await ctx.reply("No completed bookings to review yet.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.step = "review_awaiting_booking";

  const rows = completed.map((b) => [
    inlineButton(
      `${b.serviceName} — ${b.requestedDatetime}`,
      `review:pick:${b.id}`,
    ),
  ]);
  rows.push([inlineButton("Cancel", "review:cancel")]);

  await ctx.reply("Which appointment would you like to review?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery("review:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.reviewBookingId = undefined;
  ctx.session.reviewBookingLabel = undefined;
  ctx.session.reviewRating = undefined;
  ctx.session.reviewText = undefined;
  await ctx.reply("Review cancelled.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^review:pick:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const bookingId = ctx.match![1];
  const store = getStore();
  const booking = await store.getBooking(bookingId);

  if (!booking) {
    await ctx.reply("Booking not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.reviewBookingId = booking.id;
  ctx.session.reviewBookingLabel = `${booking.serviceName} — ${booking.requestedDatetime}`;
  ctx.session.step = "review_awaiting_rating";

  await ctx.reply(`How was your ${booking.serviceName}? Rate your experience:`, {
    reply_markup: inlineKeyboard([
      [
        inlineButton("⭐", "review:rate:1"),
        inlineButton("⭐⭐", "review:rate:2"),
        inlineButton("⭐⭐⭐", "review:rate:3"),
      ],
      [
        inlineButton("⭐⭐⭐⭐", "review:rate:4"),
        inlineButton("⭐⭐⭐⭐⭐", "review:rate:5"),
      ],
      [inlineButton("Cancel", "review:cancel")],
    ]),
  });
});

composer.callbackQuery(/^review:rate:(\d)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const rating = Number(ctx.match![1]);
  ctx.session.reviewRating = rating;
  ctx.session.step = "review_awaiting_text";

  await ctx.reply("Write a short review of your experience:", {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: "Type your review…",
    },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step === "review_awaiting_text") {
    const text = ctx.message.text.trim();
    if (text.length < 2) {
      await ctx.reply("Your review is too short — write a sentence or two.");
      return;
    }
    ctx.session.reviewText = text;
    ctx.session.step = "review_confirming";

    const stars = "⭐".repeat(ctx.session.reviewRating ?? 0);
    await ctx.reply(
      `Preview your review:\n\n${stars} — "${text}"\n\nSubmit this review?`,
      {
        reply_markup: inlineKeyboard([
          [
            inlineButton("✅ Submit", "review:confirm:yes"),
            inlineButton("❌ Cancel", "review:confirm:no"),
          ],
        ]),
      },
    );
    return;
  }

  return next();
});

composer.callbackQuery("review:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();

  const review = {
    id: generateReviewId(),
    bookingId: ctx.session.reviewBookingId!,
    clientTelegramId: ctx.from!.id,
    clientName: ctx.from!.first_name,
    rating: ctx.session.reviewRating!,
    text: ctx.session.reviewText!,
    photos: [],
    adminReply: "",
    createdAt: new Date().toISOString(),
  };

  await store.addReview(review);

  ctx.session.step = "idle";
  ctx.session.reviewBookingId = undefined;
  ctx.session.reviewBookingLabel = undefined;
  ctx.session.reviewRating = undefined;
  ctx.session.reviewText = undefined;

  await ctx.reply("Thanks for your review — it helps us improve.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery("review:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.reviewBookingId = undefined;
  ctx.session.reviewBookingLabel = undefined;
  ctx.session.reviewRating = undefined;
  ctx.session.reviewText = undefined;

  await ctx.reply("Review discarded. Tap /start to begin again.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
