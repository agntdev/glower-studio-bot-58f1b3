// AGNTDEV bot toolkit — persistent domain data store.
//
// Durable data (services, bookings, reviews, users) MUST use this store,
// never in-memory Maps or module-level variables. The harness uses an
// in-memory Map; production uses Redis when REDIS_URL is set.

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  photos: string[];
}

export interface PortfolioItem {
  id: string;
  photos: string[];
  caption: string;
  tags: string[];
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "completed";

export interface BookingRequest {
  id: string;
  clientTelegramId: number;
  clientName: string;
  serviceId: string;
  serviceName: string;
  requestedDatetime: string;
  notes: string;
  phone: string;
  status: BookingStatus;
  confirmedSlot?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientTelegramId: number;
  clientName: string;
  rating: number;
  text: string;
  photos: string[];
  adminReply: string;
  createdAt: string;
}

export interface User {
  telegramId: number;
  name: string;
  phone: string;
}

export interface Store {
  getServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  addService(service: Service): Promise<void>;

  getPortfolioItems(): Promise<PortfolioItem[]>;
  addPortfolioItem(item: PortfolioItem): Promise<void>;

  getBooking(id: string): Promise<BookingRequest | undefined>;
  getBookingsByClient(telegramId: number): Promise<BookingRequest[]>;
  getAllBookings(): Promise<BookingRequest[]>;
  addBooking(booking: BookingRequest): Promise<void>;
  updateBooking(id: string, updates: Partial<BookingRequest>): Promise<void>;

  getReviews(): Promise<Review[]>;
  addReview(review: Review): Promise<void>;
  updateReview(id: string, updates: Partial<Review>): Promise<void>;

  getUser(telegramId: number): Promise<User | undefined>;
  upsertUser(user: User): Promise<void>;
}

let _nextId = 1;
function generateId(): string {
  return String(_nextId++);
}

class InMemoryStore implements Store {
  private services: Service[] = [
    {
      id: "svc_1",
      name: "Manicure & Nail Art",
      duration: 60,
      price: 45,
      description: "Classic or gel manicure with nail art options.",
      photos: [],
    },
    {
      id: "svc_2",
      name: "Deep Cleansing Facial",
      duration: 75,
      price: 80,
      description: "Deep cleansing facial with moisturising mask.",
      photos: [],
    },
    {
      id: "svc_3",
      name: "Hair Styling",
      duration: 90,
      price: 65,
      description: "Cut, blow-dry, and style for any occasion.",
      photos: [],
    },
    {
      id: "svc_4",
      name: "Eyebrow Shaping",
      duration: 30,
      price: 25,
      description: "Precision eyebrow shaping and tinting.",
      photos: [],
    },
  ];

  private portfolio: PortfolioItem[] = [
    {
      id: "port_1",
      photos: [],
      caption: "Summer nail art collection — pastel ombré tips",
      tags: ["nails", "summer"],
    },
    {
      id: "port_2",
      photos: [],
      caption: "Bridal updo — classic elegance for your special day",
      tags: ["hair", "bridal"],
    },
    {
      id: "port_3",
      photos: [],
      caption: "Glow facial results — radiant, hydrated skin",
      tags: ["facial", "skincare"],
    },
  ];

  private bookings: BookingRequest[] = [];
  private reviews: Review[] = [];
  private users: Map<number, User> = new Map();

  async getServices(): Promise<Service[]> {
    return [...this.services];
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.find((s) => s.id === id);
  }

  async addService(service: Service): Promise<void> {
    this.services.push(service);
  }

  async getPortfolioItems(): Promise<PortfolioItem[]> {
    return [...this.portfolio];
  }

  async addPortfolioItem(item: PortfolioItem): Promise<void> {
    this.portfolio.push(item);
  }

  async getBooking(id: string): Promise<BookingRequest | undefined> {
    return this.bookings.find((b) => b.id === id);
  }

  async getBookingsByClient(telegramId: number): Promise<BookingRequest[]> {
    return this.bookings.filter((b) => b.clientTelegramId === telegramId);
  }

  async getAllBookings(): Promise<BookingRequest[]> {
    return [...this.bookings];
  }

  async addBooking(booking: BookingRequest): Promise<void> {
    this.bookings.push(booking);
  }

  async updateBooking(id: string, updates: Partial<BookingRequest>): Promise<void> {
    const idx = this.bookings.findIndex((b) => b.id === id);
    if (idx >= 0) {
      this.bookings[idx] = { ...this.bookings[idx], ...updates };
    }
  }

  async getReviews(): Promise<Review[]> {
    return [...this.reviews];
  }

  async addReview(review: Review): Promise<void> {
    this.reviews.push(review);
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<void> {
    const idx = this.reviews.findIndex((r) => r.id === id);
    if (idx >= 0) {
      this.reviews[idx] = { ...this.reviews[idx], ...updates };
    }
  }

  async getUser(telegramId: number): Promise<User | undefined> {
    return this.users.get(telegramId);
  }

  async upsertUser(user: User): Promise<void> {
    this.users.set(user.telegramId, user);
  }
}

let _store: Store | undefined;

export function getStore(): Store {
  if (!_store) {
    _store = new InMemoryStore();
  }
  return _store;
}

export function resetStore(): void {
  _store = new InMemoryStore();
}

export function generateBookingId(): string {
  return `bk_${generateId()}`;
}

export function generateReviewId(): string {
  return `rv_${generateId()}`;
}

export function generateServiceId(): string {
  return `svc_${generateId()}`;
}

export function generatePortfolioId(): string {
  return `port_${generateId()}`;
}
