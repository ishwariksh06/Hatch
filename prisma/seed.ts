import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Indian", slug: "indian", emoji: "🍛", sortOrder: 0 },
  { name: "Italian", slug: "italian", emoji: "🍝", sortOrder: 1 },
  { name: "Fast Food", slug: "fast-food", emoji: "🍔", sortOrder: 2 },
  { name: "Drinks & Sweets", slug: "drinks-sweets", emoji: "🥤", sortOrder: 3 },
];

// price in paise
const ITEMS: Record<string, Array<{
  name: string; description: string; priceCents: number; isVeg: boolean; prepMinutes: number;
}>> = {
  indian: [
    { name: "Paneer Butter Masala", description: "Creamy tomato gravy, soft paneer", priceCents: 13000, isVeg: true, prepMinutes: 12 },
    { name: "Rajma Chawal", description: "Kidney beans curry with steamed rice", priceCents: 9000, isVeg: true, prepMinutes: 10 },
    { name: "Chicken Biryani", description: "Hyderabadi dum biryani, raita", priceCents: 16000, isVeg: false, prepMinutes: 18 },
    { name: "Masala Dosa", description: "Crisp dosa, potato masala, chutney", priceCents: 8000, isVeg: true, prepMinutes: 9 },
    { name: "Egg Curry", description: "Boiled eggs in onion-tomato masala", priceCents: 10000, isVeg: false, prepMinutes: 12 },
  ],
  italian: [
    { name: "Margherita Pizza", description: "Tomato, mozzarella, basil", priceCents: 18000, isVeg: true, prepMinutes: 15 },
    { name: "Penne Arrabbiata", description: "Spicy tomato pasta, chilli, garlic", priceCents: 14000, isVeg: true, prepMinutes: 13 },
    { name: "Chicken Alfredo Pasta", description: "Creamy white sauce, grilled chicken", priceCents: 19000, isVeg: false, prepMinutes: 16 },
  ],
  "fast-food": [
    { name: "Veg Burger", description: "Crunchy patty, lettuce, house sauce", priceCents: 7000, isVeg: true, prepMinutes: 8 },
    { name: "Crispy Chicken Burger", description: "Fried chicken fillet, slaw, mayo", priceCents: 11000, isVeg: false, prepMinutes: 10 },
    { name: "Peri Peri Fries", description: "Skin-on fries tossed in peri peri", priceCents: 6000, isVeg: true, prepMinutes: 7 },
    { name: "Veg Frankie Roll", description: "Spiced veg wrap, mint chutney", priceCents: 7500, isVeg: true, prepMinutes: 8 },
  ],
  "drinks-sweets": [
    { name: "Masala Chai", description: "Cutting chai, ginger and cardamom", priceCents: 2000, isVeg: true, prepMinutes: 4 },
    { name: "Cold Coffee", description: "Blended, chocolate drizzle", priceCents: 6000, isVeg: true, prepMinutes: 5 },
    { name: "Gulab Jamun (2 pc)", description: "Warm, soaked in rose syrup", priceCents: 4000, isVeg: true, prepMinutes: 3 },
  ],
};

const LOCATIONS = [
  { name: "Campus Kitchen", kind: "hub", x: 50, y: 50, isHub: true },
  { name: "Hostel A", kind: "hostel", x: 20, y: 22 },
  { name: "Hostel B", kind: "hostel", x: 30, y: 78 },
  { name: "Hostel C", kind: "hostel", x: 78, y: 70 },
  { name: "Library", kind: "library", x: 66, y: 30 },
  { name: "Engineering Block", kind: "department", x: 82, y: 40 },
  { name: "Science Block", kind: "department", x: 24, y: 52 },
  { name: "Sports Complex", kind: "hub", x: 60, y: 86 },
  { name: "Main Gate", kind: "gate", x: 10, y: 92 },
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

  for (const loc of LOCATIONS) {
    await prisma.campusLocation.create({ data: loc });
  }

  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({ data: c });
    for (const item of ITEMS[c.slug]) {
      await prisma.foodItem.create({ data: { ...item, categoryId: cat.id } });
    }
  }

  const pw = await bcrypt.hash("hatch1234", 10);
  await prisma.user.create({
    data: { email: "student@hatch.dev", name: "Aditya Sharma", password: pw, role: "student", phone: "9000000001" },
  });
  await prisma.user.create({
    data: { email: "admin@hatch.dev", name: "Kitchen Admin", password: pw, role: "admin" },
  });
  await prisma.user.create({
    data: { email: "runner@hatch.dev", name: "Ravi Kumar", password: pw, role: "runner", phone: "9000000002" },
  });

  console.log("\n  HATCH seed complete.");
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
