import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Row = {
  name: string;
  isVeg: boolean;
  rupees: number;
  description: string;
  prepMinutes: number;
};

const CATEGORIES = [
  { name: "Italian, Pizzas & Burgers", slug: "italian", emoji: "🍕", sortOrder: 0 },
  { name: "Main Course & Breads", slug: "mains", emoji: "🍛", sortOrder: 1 },
  { name: "Quick Bites & Snacks", slug: "quick-bites", emoji: "🥪", sortOrder: 2 },
  { name: "Beverages & Sweets", slug: "beverages", emoji: "☕", sortOrder: 3 },
  { name: "Chef's Specials", slug: "specials", emoji: "⭐", sortOrder: 4 },
];

const MENU: Record<string, Row[]> = {
  italian: [
    { name: "Creamy White Sauce Pasta", isVeg: true, rupees: 130, description: "Penne in rich cheesy garlic cream sauce with herbs.", prepMinutes: 13 },
    { name: "Cheesy Garlic Bread (4 pcs)", isVeg: true, rupees: 85, description: "Toasted baguette, garlic herb butter, melted mozzarella.", prepMinutes: 9 },
    { name: "Farmhouse Veggie Pizza (8-inch)", isVeg: true, rupees: 180, description: "Capsicum, onion, sweet corn, mushrooms and cheese.", prepMinutes: 16 },
    { name: "Crispy Aloo Tikki Burger", isVeg: true, rupees: 70, description: "Spiced potato patty, mint mayo, crunchy lettuce.", prepMinutes: 8 },
    { name: "Spicy Chicken Arrabbiata Pasta", isVeg: false, rupees: 150, description: "Penne with spiced chicken in a fiery tomato-herb sauce.", prepMinutes: 16 },
    { name: "Chicken Keema Garlic Bread", isVeg: false, rupees: 110, description: "Garlic bread topped with spiced chicken keema & mozzarella.", prepMinutes: 11 },
    { name: "BBQ Chicken Delight Pizza (8-inch)", isVeg: false, rupees: 210, description: "Smoky barbecue chicken, red onions and mozzarella.", prepMinutes: 17 },
    { name: "Crispy Fried Chicken Burger", isVeg: false, rupees: 120, description: "Golden fried chicken fillet, spicy garlic mayo, lettuce.", prepMinutes: 12 },
  ],
  mains: [
    { name: "Dal Tadka with Steamed Rice Bowl", isVeg: true, rupees: 100, description: "Arhar dal tempered with garlic & cumin over basmati.", prepMinutes: 12 },
    { name: "Rajma Chawal Bowl", isVeg: true, rupees: 120, description: "Punjabi rajma curry over fragrant jeera rice.", prepMinutes: 12 },
    { name: "Paneer Butter Masala + 2 Naan", isVeg: true, rupees: 160, description: "Makhani gravy with paneer and 2 butter garlic naans.", prepMinutes: 15 },
    { name: "Butter Tandoori Roti (2 pcs)", isVeg: true, rupees: 30, description: "Whole wheat clay-oven rotis brushed with butter.", prepMinutes: 6 },
    { name: "Dum Chicken Biryani Bowl", isVeg: false, rupees: 180, description: "Hyderabadi spiced chicken biryani with mint raita.", prepMinutes: 18 },
  ],
  "quick-bites": [
    { name: "Paneer Tikka Frankie", isVeg: true, rupees: 110, description: "Chargrilled spiced paneer rolled in flaky paratha.", prepMinutes: 9 },
    { name: "Butter Masala Dosa", isVeg: true, rupees: 80, description: "Crispy butter crepe, potato masala, sambar & chutney.", prepMinutes: 9 },
    { name: "Idli-Vada Combo", isVeg: true, rupees: 65, description: "2 steamed idlis and 1 medu vada with sambar & chutney.", prepMinutes: 8 },
    { name: "Double Cheese Masala Maggi", isVeg: true, rupees: 70, description: "Classic masala Maggi loaded with butter and cheese.", prepMinutes: 7 },
    { name: "Chicken Kathi Roll", isVeg: false, rupees: 130, description: "Tandoori chicken chunks in an egg-layered paratha.", prepMinutes: 10 },
    { name: "Mumbai Egg Bhurji Pav (2 Pav)", isVeg: false, rupees: 85, description: "Spicy scrambled egg masala with 2 butter-toasted pavs.", prepMinutes: 9 },
  ],
  beverages: [
    { name: "Coca-Cola Can (300ml)", isVeg: true, rupees: 40, description: "Chilled classic Coca-Cola can.", prepMinutes: 2 },
    { name: "Thums Up Can (300ml)", isVeg: true, rupees: 40, description: "Strong fizzy cola can.", prepMinutes: 2 },
    { name: "Monster Energy Drink (350ml)", isVeg: true, rupees: 125, description: "Chilled Monster Energy can for late-night fuel.", prepMinutes: 2 },
    { name: "Adrak Elaichi Cutting Chai", isVeg: true, rupees: 25, description: "Strong Assam tea brewed with ginger and cardamom.", prepMinutes: 4 },
    { name: "Cold Coffee with Ice Cream", isVeg: true, rupees: 75, description: "Chilled blended coffee topped with a vanilla scoop.", prepMinutes: 5 },
    { name: "Chocolate Brownie with Ice Cream", isVeg: true, rupees: 95, description: "Warm chocolate walnut brownie with vanilla ice cream.", prepMinutes: 4 },
  ],
};

const SPECIALS: Array<Row & { day: number }> = [
  { day: 0, name: "Dal Makhani & 2 Butter Kulcha", isVeg: true, rupees: 150, description: "Slow-simmered black lentils with 2 soft tandoori kulchas.", prepMinutes: 15 },
  { day: 0, name: "Butter Chicken Roll", isVeg: false, rupees: 140, description: "Shredded makhani chicken rolled in flaky paratha.", prepMinutes: 12 },
  { day: 1, name: "Pav Bhaji Platter (Extra Butter)", isVeg: true, rupees: 110, description: "Spiced vegetable mash with 2 buttered ladi pavs.", prepMinutes: 12 },
  { day: 1, name: "Chicken Keema Pav (2 Pav)", isVeg: false, rupees: 130, description: "Spicy minced chicken masala with 2 butter-toasted pavs.", prepMinutes: 12 },
  { day: 2, name: "Hakka Noodles + Chilli Paneer", isVeg: true, rupees: 140, description: "Wok-tossed noodles with crispy paneer in chilli sauce.", prepMinutes: 14 },
  { day: 2, name: "Fried Rice + Chilli Chicken", isVeg: false, rupees: 165, description: "Egg-chicken fried rice with wok-tossed chilli chicken.", prepMinutes: 15 },
  { day: 3, name: "Mysore Masala Dosa (Ghee Roast)", isVeg: true, rupees: 95, description: "Crispy crepe with red garlic chutney, potato mash & ghee.", prepMinutes: 10 },
  { day: 3, name: "Andhra Chicken Roast with Parotta", isVeg: false, rupees: 170, description: "Fiery pepper chicken roast with 2 Malabar parottas.", prepMinutes: 18 },
  { day: 4, name: "Paneer Tikka Pizza (10-inch)", isVeg: true, rupees: 220, description: "Thin crust with tandoori paneer, peppers & mozzarella.", prepMinutes: 17 },
  { day: 4, name: "Chicken Shawarma Loaded Fries", isVeg: false, rupees: 150, description: "Crispy fries with chicken shawarma, garlic dip & jalapeños.", prepMinutes: 12 },
  { day: 5, name: "Veg Dum Biryani + Paneer 65", isVeg: true, rupees: 160, description: "Saffron basmati rice with crispy fried Paneer 65 & salan.", prepMinutes: 16 },
  { day: 5, name: "Special Mutton Dum Biryani", isVeg: false, rupees: 240, description: "Tender mutton in fragrant basmati rice with mirchi salan.", prepMinutes: 22 },
  { day: 6, name: "Loaded Nachos Grande", isVeg: true, rupees: 130, description: "Tortilla chips baked with salsa, beans & cheese sauce.", prepMinutes: 10 },
  { day: 6, name: "Crispy Chicken Wings (6 pcs)", isVeg: false, rupees: 170, description: "Crunchy fried wings tossed in Peri-Peri or BBQ glaze.", prepMinutes: 14 },
];

const LOCATIONS = [
  { name: "Campus Kitchen", kind: "hub", x: 50, y: 50, isHub: true },
  { name: "Hostel A (Boys)", kind: "hostel", x: 18, y: 20 },
  { name: "Hostel B (Boys)", kind: "hostel", x: 30, y: 80 },
  { name: "Hostel C (Girls)", kind: "hostel", x: 80, y: 72 },
  { name: "Central Library", kind: "library", x: 64, y: 28 },
  { name: "Engineering Block", kind: "department", x: 84, y: 42 },
  { name: "Science Block", kind: "department", x: 22, y: 52 },
  { name: "Management Block", kind: "department", x: 70, y: 60 },
  { name: "Sports Complex", kind: "hub", x: 58, y: 88 },
  { name: "Main Gate", kind: "gate", x: 8, y: 92 },
];

async function main() {
  await prisma.deliveryStop.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.favourite.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.campusLocation.deleteMany();
  await prisma.user.deleteMany();

  for (const loc of LOCATIONS) await prisma.campusLocation.create({ data: loc });

  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({ data: c });
    cats[c.slug] = created.id;
  }

  for (const [slug, rows] of Object.entries(MENU)) {
    for (const r of rows) {
      await prisma.foodItem.create({
        data: {
          name: r.name,
          description: r.description,
          priceCents: r.rupees * 100,
          isVeg: r.isVeg,
          prepMinutes: r.prepMinutes,
          categoryId: cats[slug],
        },
      });
    }
  }

  for (const s of SPECIALS) {
    await prisma.foodItem.create({
      data: {
        name: s.name,
        description: s.description,
        priceCents: s.rupees * 100,
        isVeg: s.isVeg,
        prepMinutes: s.prepMinutes,
        isSpecial: true,
        specialDay: s.day,
        categoryId: cats["specials"],
      },
    });
  }

  const pw = await bcrypt.hash("hatch1234", 10);
  const student = await prisma.user.create({
    data: { email: "student@hatch.dev", name: "Aditya Sharma", password: pw, role: "student", phone: "9000000001" },
  });
  await prisma.user.create({
    data: { email: "admin@hatch.dev", name: "Kitchen Admin", password: pw, role: "admin" },
  });
  await prisma.user.create({
    data: { email: "runner@hatch.dev", name: "Ravi Kumar", password: pw, role: "runner", phone: "9000000002" },
  });
  const classmates = await Promise.all(
    [
      ["priya@hatch.dev", "Priya Nair", "9000000010"],
      ["rohan@hatch.dev", "Rohan Mehta", "9000000011"],
      ["sara@hatch.dev", "Sara Khan", "9000000012"],
    ].map(([email, name, phone]) =>
      prisma.user.create({ data: { email, name, password: pw, role: "student", phone } }),
    ),
  );

  // ---- demo orders so admin + runner screens aren't empty ----
  const pick = async (name: string) =>
    prisma.foodItem.findFirstOrThrow({ where: { name: { contains: name } } });
  const locs = await prisma.campusLocation.findMany({ where: { isHub: false } });
  const loc = (n: string) => locs.find((l) => l.name.includes(n))!;
  const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const code = () =>
    "HT-" + Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");

  let token = 0;
  async function makeOrder(opts: {
    user: { id: string; phone: string | null };
    items: Array<{ name: string; qty: number }>;
    status: string;
    fulfilment: "pickup" | "delivery";
    location?: string;
    dropDetail?: string;
    minsAgo: number;
  }) {
    token += 1;
    const rows = await Promise.all(
      opts.items.map(async (i) => {
        const f = await pick(i.name);
        return { foodItemId: f.id, nameSnapshot: f.name, priceCents: f.priceCents, quantity: i.qty };
      }),
    );
    const subtotal = rows.reduce((n, r) => n + r.priceCents * r.quantity, 0);
    const fee = opts.fulfilment === "delivery" ? 1500 : 0;
    return prisma.order.create({
      data: {
        publicId: code(),
        tokenNumber: token,
        userId: opts.user.id,
        subtotalCents: subtotal,
        totalCents: subtotal + fee,
        status: opts.status,
        paymentStatus: "paid",
        paymentTxnId: "MOCK-SEED",
        fulfilment: opts.fulfilment,
        dropLocationId: opts.location ? loc(opts.location).id : null,
        dropDetail: opts.dropDetail ?? null,
        contactPhone: opts.fulfilment === "delivery" ? opts.user.phone : null,
        placedAt: new Date(Date.now() - opts.minsAgo * 60_000),
        items: { create: rows },
      },
    });
  }

  await makeOrder({ user: student, items: [{ name: "Paneer Butter Masala", qty: 1 }, { name: "Cutting Chai", qty: 2 }], status: "Preparing", fulfilment: "pickup", minsAgo: 8 });
  await makeOrder({ user: classmates[0], items: [{ name: "Farmhouse Veggie Pizza", qty: 1 }, { name: "Cold Coffee", qty: 1 }], status: "Ready", fulfilment: "delivery", location: "Hostel C", dropDetail: "Room 214", minsAgo: 18 });
  await makeOrder({ user: classmates[1], items: [{ name: "Dum Chicken Biryani", qty: 1 }], status: "Ready", fulfilment: "delivery", location: "Central Library", dropDetail: "Reading hall 2", minsAgo: 15 });
  await makeOrder({ user: classmates[2], items: [{ name: "Chicken Kathi Roll", qty: 1 }, { name: "Cheesy Garlic Bread", qty: 1 }], status: "Ready", fulfilment: "delivery", location: "Engineering Block", dropDetail: "Lab 3", minsAgo: 12 });
  await makeOrder({ user: classmates[0], items: [{ name: "Butter Masala Dosa", qty: 2 }], status: "Completed", fulfilment: "pickup", minsAgo: 90 });

  const items = await prisma.foodItem.count();
  console.log(`\n  HATCH seed complete — ${items} items across ${CATEGORIES.length} sections.`);
  console.log("  ─────────────────────────────────────────");
  console.log("  Student  student@hatch.dev  /  hatch1234");
  console.log("  Admin    admin@hatch.dev    /  hatch1234");
  console.log("  Runner   runner@hatch.dev   /  hatch1234");
  console.log("  ─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
