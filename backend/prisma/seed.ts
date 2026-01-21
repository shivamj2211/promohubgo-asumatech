import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clear existing data
  await prisma.message.deleteMany()
  await prisma.favorite.deleteMany()
  await prisma.review.deleteMany()
  await prisma.order.deleteMany()
  await prisma.listingTag.deleteMany()
  await prisma.listing.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Tech", slug: "tech" },
    }),
    prisma.category.create({
      data: { name: "Lifestyle", slug: "lifestyle" },
    }),
    prisma.category.create({
      data: { name: "Gaming", slug: "gaming" },
    }),
    prisma.category.create({
      data: { name: "Beauty", slug: "beauty" },
    }),
    prisma.category.create({
      data: { name: "Finance", slug: "finance" },
    }),
  ])

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: "Tutorial", slug: "tutorial" } }),
    prisma.tag.create({ data: { name: "Review", slug: "review" } }),
    prisma.tag.create({ data: { name: "Vlog", slug: "vlog" } }),
    prisma.tag.create({ data: { name: "Educational", slug: "educational" } }),
    prisma.tag.create({ data: { name: "Entertainment", slug: "entertainment" } }),
  ])

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@colabatr.com",
        isAdmin: true,
        city: "San Francisco",
        bio: "Platform administrator",
      },
    }),
    prisma.user.create({
      data: {
        name: "John Creator",
        email: "john@colabatr.com",
        isSeller: true,
        city: "Los Angeles",
        bio: "Tech content creator with 100k followers",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Influencer",
        email: "sarah@colabatr.com",
        isSeller: true,
        city: "New York",
        bio: "Lifestyle and beauty influencer",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mike Gamer",
        email: "mike@colabatr.com",
        isSeller: true,
        city: "Seattle",
        bio: "Gaming streamer and content creator",
      },
    }),
    prisma.user.create({
      data: {
        name: "Lisa Buyer",
        email: "lisa@colabatr.com",
        city: "Boston",
        bio: "Brand manager looking for collaborations",
      },
    }),
  ])

  // Create sellers
  const sellers = await Promise.all([
    prisma.seller.create({
      data: { userId: users[1].id, bio: "Tech content specialist", rating: 4.8 },
    }),
    prisma.seller.create({
      data: { userId: users[2].id, bio: "Beauty & lifestyle expert", rating: 4.9 },
    }),
    prisma.seller.create({
      data: { userId: users[3].id, bio: "Gaming content professional", rating: 4.7 },
    }),
  ])

  // Create listings
  const listings = await Promise.all([
    prisma.listing.create({
      data: {
        title: "Tech Product Review",
        description: "Professional review of the latest tech products for your brand",
        price: 500,
        userId: users[1].id,
        categoryId: categories[0].id,
        tags: {
          create: [{ tagId: tags[1].id }, { tagId: tags[3].id }],
        },
      },
    }),
    prisma.listing.create({
      data: {
        title: "Lifestyle Photography Session",
        description: "Premium lifestyle photoshoot and content creation",
        price: 750,
        userId: users[2].id,
        categoryId: categories[1].id,
        tags: {
          create: [{ tagId: tags[0].id }, { tagId: tags[4].id }],
        },
      },
    }),
    prisma.listing.create({
      data: {
        title: "Gaming Stream Setup",
        description: "Full gaming stream setup with commentary and promotion",
        price: 300,
        userId: users[3].id,
        categoryId: categories[2].id,
        tags: {
          create: [{ tagId: tags[0].id }, { tagId: tags[4].id }],
        },
      },
    }),
    prisma.listing.create({
      data: {
        title: "Beauty Tutorial Video",
        description: "Custom beauty tutorial featuring your product",
        price: 600,
        userId: users[2].id,
        categoryId: categories[3].id,
        tags: {
          create: [{ tagId: tags[0].id }, { tagId: tags[4].id }],
        },
      },
    }),
    prisma.listing.create({
      data: {
        title: "Financial Tips Podcast",
        description: "30-minute podcast episode discussing your financial product",
        price: 400,
        userId: users[1].id,
        categoryId: categories[4].id,
        tags: {
          create: [{ tagId: tags[3].id }],
        },
      },
    }),
  ])

  // Create orders
  await prisma.order.create({
    data: {
      listingId: listings[0].id,
      buyerId: users[4].id,
      sellerId: sellers[0].id,
      totalPrice: 500,
      status: "completed",
    },
  })

  // Create reviews
  await prisma.review.create({
    data: {
      rating: 5,
      comment: "Excellent work! The video quality was outstanding.",
      reviewerId: users[4].id,
      listingId: listings[0].id,
    },
  })

  // Create favorites
  await prisma.favorite.create({
    data: {
      userId: users[4].id,
      listingId: listings[1].id,
    },
  })

  // Create feature flags
  await Promise.all([
    prisma.featureFlag.create({
      data: { key: "maintenanceMode", value: false },
    }),
    prisma.featureFlag.create({
      data: { key: "newUIEnabled", value: true },
    }),
  ])

  console.log("✅ Database seeded successfully!")
  console.log("\n📝 Test Accounts:")
  console.log("  Admin: admin@colabatr.com")
  console.log("  Seller 1: john@colabatr.com")
  console.log("  Seller 2: sarah@colabatr.com")
  console.log("  Seller 3: mike@colabatr.com")
  console.log("  Buyer: lisa@colabatr.com")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
