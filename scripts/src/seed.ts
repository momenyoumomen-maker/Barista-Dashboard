import { db, menuItemsTable } from "@workspace/db";

const items = [
  {
    name: "إسبريسو مزدوج",
    description: "جرعة مكثفة من البن المختار، ذات قشدة بنية غنية.",
    category: "قهوة ساخنة",
    price: "55.00",
    available: true,
    prepMinutes: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80",
  },
  {
    name: "كابتشينو كلاسيك",
    description: "إسبريسو مع رغوة حليب مخملية متوازنة.",
    category: "قهوة ساخنة",
    price: "75.00",
    available: true,
    prepMinutes: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80",
  },
  {
    name: "لاتيه بالهيل",
    description: "لاتيه دافئ بلمسة هيل أخضر طازج.",
    category: "قهوة ساخنة",
    price: "85.00",
    available: true,
    prepMinutes: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600&q=80",
  },
  {
    name: "قهوة تركي سادة",
    description: "قهوة تركي مطحونة ناعم، تُقدّم بالكنكة.",
    category: "قهوة ساخنة",
    price: "45.00",
    available: true,
    prepMinutes: 6,
    imageUrl:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600&q=80",
  },
  {
    name: "آيس لاتيه",
    description: "إسبريسو مبرد فوق ثلج وحليب مخفوق.",
    category: "قهوة باردة",
    price: "85.00",
    available: true,
    prepMinutes: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&q=80",
  },
  {
    name: "كولد برو 12 ساعة",
    description: "بن منقوع ببطء، نكهة ناعمة وحلوة طبيعياً.",
    category: "قهوة باردة",
    price: "95.00",
    available: true,
    prepMinutes: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80",
  },
  {
    name: "موكا بالشوكولاتة",
    description: "إسبريسو مع شوكولاتة سوداء وحليب بارد.",
    category: "قهوة باردة",
    price: "95.00",
    available: true,
    prepMinutes: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&q=80",
  },
  {
    name: "شاي بالنعناع",
    description: "شاي أحمر ساخن بأوراق نعناع طازجة.",
    category: "مشروبات",
    price: "35.00",
    available: true,
    prepMinutes: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&q=80",
  },
  {
    name: "ينسون بالعسل",
    description: "ينسون مغلي بلمسة عسل نحل طبيعي.",
    category: "مشروبات",
    price: "40.00",
    available: true,
    prepMinutes: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&q=80",
  },
  {
    name: "كرواسون باللوز",
    description: "كرواسون فرنسي بطبقات مع كريمة لوز محمصة.",
    category: "حلويات",
    price: "65.00",
    available: true,
    prepMinutes: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80",
  },
  {
    name: "تشيز كيك بالتوت",
    description: "قطعة كريمية بصلصة توت أحمر.",
    category: "حلويات",
    price: "85.00",
    available: true,
    prepMinutes: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=600&q=80",
  },
  {
    name: "كوكيز بالشوكولاتة",
    description: "كوكيز دافئ بقطع شوكولاتة بلجيكية.",
    category: "حلويات",
    price: "45.00",
    available: true,
    prepMinutes: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80",
  },
];

async function main() {
  const existing = await db.select().from(menuItemsTable).limit(1);
  if (existing.length > 0) {
    console.log("Menu already seeded — skipping.");
    return;
  }

  const inserted = await db.insert(menuItemsTable).values(items).returning();
  console.log(`Inserted ${inserted.length} menu items.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
