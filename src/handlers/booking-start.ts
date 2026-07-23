import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getStore, generateBookingId } from "../toolkit/store.js";

registerMainMenuItem({ label: "📅 Book", data: "booking:start", order: 40 });

const composer = new Composer<Ctx>();

composer.callbackQuery("booking:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();
  const services = await store.getServices();

  if (services.length === 0) {
    await ctx.reply("No services available yet — check back soon.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.step = "booking_awaiting_service";

  const rows = services.map((s) => [
    inlineButton(`${s.name} — $${s.price}`, `booking:pick:${s.id}`),
  ]);
  rows.push([inlineButton("Cancel", "booking:cancel")]);

  await ctx.reply("Which service would you like to book?", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery("booking:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.bookingServiceId = undefined;
  ctx.session.bookingServiceName = undefined;
  ctx.session.bookingDatetime = undefined;
  ctx.session.bookingNotes = undefined;
  ctx.session.bookingPhone = undefined;
  await ctx.reply("Booking cancelled. Tap /start to begin again.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.callbackQuery(/^booking:pick:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const serviceId = ctx.match![1];
  const store = getStore();
  const service = await store.getService(serviceId);

  if (!service) {
    await ctx.reply("That service isn't available. Try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.bookingServiceId = service.id;
  ctx.session.bookingServiceName = service.name;
  ctx.session.step = "booking_awaiting_datetime";

  await ctx.reply(
    `Great choice — ${service.name} (${service.duration} min, $${service.price}).\n\nWhen would you like to come in? Enter a date and time (e.g. "Tomorrow 2pm" or "2026-07-25 14:00").`,
    {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "Enter date and time…",
      },
    },
  );
});

composer.callbackQuery("booking:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getStore();

  const booking = {
    id: generateBookingId(),
    clientTelegramId: ctx.from!.id,
    clientName: ctx.from!.first_name,
    serviceId: ctx.session.bookingServiceId!,
    serviceName: ctx.session.bookingServiceName!,
    requestedDatetime: ctx.session.bookingDatetime!,
    notes: ctx.session.bookingNotes ?? "",
    phone: ctx.session.bookingPhone ?? "",
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  await store.addBooking(booking);

  ctx.session.step = "idle";
  ctx.session.bookingServiceId = undefined;
  ctx.session.bookingServiceName = undefined;
  ctx.session.bookingDatetime = undefined;
  ctx.session.bookingNotes = undefined;
  ctx.session.bookingPhone = undefined;

  await ctx.reply(
    `Booking request submitted!\n\n📋 Service: ${booking.serviceName}\n📅 When: ${booking.requestedDatetime}${booking.notes ? `\n📝 Notes: ${booking.notes}` : ""}\n\nWe'll confirm your appointment shortly.`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

composer.callbackQuery("booking:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.bookingServiceId = undefined;
  ctx.session.bookingServiceName = undefined;
  ctx.session.bookingDatetime = undefined;
  ctx.session.bookingNotes = undefined;
  ctx.session.bookingPhone = undefined;

  await ctx.reply("Booking cancelled. Tap /start to begin again.", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;

  if (step === "booking_awaiting_datetime") {
    const text = ctx.message.text.trim();
    if (text.length < 3) {
      await ctx.reply("That doesn't look like a valid date/time. Try again (e.g. \"Tomorrow 2pm\").");
      return;
    }
    ctx.session.bookingDatetime = text;
    ctx.session.step = "booking_awaiting_notes";

    await ctx.reply(
      "Any notes or requests? Type them now, or tap Skip to proceed without notes.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("Skip", "booking:notes:skip")],
        ]),
      },
    );
    return;
  }

  if (step === "booking_awaiting_notes") {
    ctx.session.bookingNotes = ctx.message.text.trim();
    ctx.session.step = "booking_awaiting_phone";

    await ctx.reply(
      "Last thing — your phone number (optional). Type it now, or tap Skip.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("Skip", "booking:phone:skip")],
        ]),
      },
    );
    return;
  }

  if (step === "booking_awaiting_phone") {
    ctx.session.bookingPhone = ctx.message.text.trim();
    await showConfirmation(ctx);
    return;
  }

  return next();
});

composer.callbackQuery("booking:notes:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.bookingNotes = "";
  ctx.session.step = "booking_awaiting_phone";

  await ctx.reply(
    "Last thing — your phone number (optional). Type it now, or tap Skip.",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("Skip", "booking:phone:skip")],
      ]),
    },
  );
});

composer.callbackQuery("booking:phone:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.bookingPhone = "";
  await showConfirmation(ctx);
});

async function showConfirmation(ctx: Ctx) {
  ctx.session.step = "booking_confirming";

  const text =
    `Confirm your booking:\n\n` +
    `📋 Service: ${ctx.session.bookingServiceName}\n` +
    `📅 When: ${ctx.session.bookingDatetime}` +
    (ctx.session.bookingNotes ? `\n📝 Notes: ${ctx.session.bookingNotes}` : "") +
    (ctx.session.bookingPhone ? `\n📞 Phone: ${ctx.session.bookingPhone}` : "");

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([
      [
        inlineButton("✅ Confirm", "booking:confirm:yes"),
        inlineButton("❌ Cancel", "booking:confirm:no"),
      ],
    ]),
  });
}

export default composer;
