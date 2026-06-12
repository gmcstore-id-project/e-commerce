import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getCategories,
  getCategoryById,
  getCartItems,
  addToCart,
  removeFromCart,
  getUserOrders,
  getSellerOrders,
  getOrderById,
  getSellerByUserId,
  getProductReviews,
  getOrderItems,
  getUserById,
  getDb,
} from "./db";
import { carts, orders, orderItems, reviews, sellers, products, categories, users } from "../drizzle/schema";
import { eq, like, or, sql } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});

// Seller-only procedure
const sellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "seller" && ctx.user.role !== "admin") {
    throw new Error("Unauthorized: Seller access required");
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Product routes
  products: router({
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(({ input }) => getProducts(input.limit, input.offset)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProductById(input.id)),

    getByCategory: publicProcedure
      .input(z.object({ categoryId: z.number() }))
      .query(({ input }) => getProductsByCategory(input.categoryId)),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        if (!input.query.trim()) return getProducts(20, 0);
        return db
          .select()
          .from(products)
          .where(
            or(
              like(products.name, `%${input.query}%`),
              like(products.description, `%${input.query}%`)
            )
          )
          .limit(50);
      }),

    create: sellerProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string(),
          price: z.number(),
          categoryId: z.number(),
          stock: z.number(),
          image: z.string(),
          images: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new Error("Seller profile not found");

        const result = await db.insert(products).values({
          name: input.name,
          description: input.description,
          price: input.price as any,
          categoryId: input.categoryId,
          stock: input.stock,
          image: input.image,
          images: input.images as any,
          sellerId: seller.id,
          isActive: true,
        });

        return result;
      }),

    update: sellerProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          price: z.number().optional(),
          stock: z.number().optional(),
          image: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const product = await getProductById(input.id);
        if (!product) throw new Error("Product not found");

        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller || product.sellerId !== seller.id) {
          throw new Error("Unauthorized");
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.price !== undefined) updateData.price = input.price;
        if (input.stock !== undefined) updateData.stock = input.stock;
        if (input.image !== undefined) updateData.image = input.image;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await db.update(products).set(updateData).where(eq(products.id, input.id));

        return { success: true };
      }),
  }),

  // Category routes
  categories: router({
    list: publicProcedure.query(() => getCategories()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getCategoryById(input.id)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          image: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(categories).values({
          name: input.name,
          description: input.description,
          image: input.image,
        });

        return result;
      }),
  }),

  // Cart routes
  cart: router({
    list: protectedProcedure.query(({ ctx }) => getCartItems(ctx.user.id)),

    add: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().default(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const product = await getProductById(input.productId);
        if (!product) throw new Error("Product not found");

        if (product.stock < input.quantity) {
          throw new Error("Insufficient stock");
        }

        const existingCart = await db
          .select()
          .from(carts)
          .where(
            eq(carts.userId, ctx.user.id)
          );
        
        const existingItem = existingCart.find(c => c.productId === input.productId);

        if (existingItem) {
          await db
            .update(carts)
            .set({ quantity: existingItem.quantity + input.quantity })
            .where(eq(carts.id, existingItem.id));
        } else {
          await db.insert(carts).values({
            userId: ctx.user.id,
            productId: input.productId,
            quantity: input.quantity,
          });
        }

        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ cartId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const cartItem = await db
          .select()
          .from(carts)
          .where(eq(carts.id, input.cartId));

        if (!cartItem.length || cartItem[0].userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        await removeFromCart(input.cartId);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          cartId: z.number(),
          quantity: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const cartItem = await db
          .select()
          .from(carts)
          .where(eq(carts.id, input.cartId));

        if (!cartItem.length || cartItem[0].userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        if (input.quantity <= 0) {
          await removeFromCart(input.cartId);
        } else {
          await db
            .update(carts)
            .set({ quantity: input.quantity })
            .where(eq(carts.id, input.cartId));
        }

        return { success: true };
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(carts).where(eq(carts.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // Order routes
  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const order = await getOrderById(input.id);
        if (!order || order.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        return order;
      }),

    create: protectedProcedure
      .input(
        z.object({
          shippingAddress: z.string(),
          paymentMethod: z.string(),
          shippingCost: z.number().default(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const cartItems = await getCartItems(ctx.user.id);
        if (!cartItems.length) throw new Error("Cart is empty");

        // Calculate total and create order
        let productAmount = 0;
        for (const item of cartItems) {
          const product = await getProductById(item.productId);
          if (!product) throw new Error("Product not found");
          productAmount += Number(product.price) * item.quantity;
        }

        // Calculate admin fee (1%)
        const adminFeePercentage = 1;
        const adminFeeAmount = productAmount * (adminFeePercentage / 100);
        const totalAmount = productAmount + adminFeeAmount + input.shippingCost;

        // Use first product's seller for simplicity (in real app, handle multiple sellers)
        const firstProduct = await getProductById(cartItems[0].productId);
        if (!firstProduct) throw new Error("Product not found");

        const orderResult = await db.insert(orders).values({
          userId: ctx.user.id,
          sellerId: firstProduct.sellerId,
          totalAmount: totalAmount.toString() as any,
          productAmount: productAmount.toString() as any,
          adminFeePercentage: adminFeePercentage.toString() as any,
          adminFeeAmount: adminFeeAmount.toString() as any,
          shippingCost: input.shippingCost.toString() as any,
          status: "pending",
          shippingAddress: input.shippingAddress,
          paymentMethod: input.paymentMethod,
        });

        // Create order items
        for (const item of cartItems) {
          const product = await getProductById(item.productId);
          if (!product) throw new Error("Product not found");

          await db.insert(orderItems).values({
            orderId: (orderResult as any).insertId,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price as any,
          });
        }

        // Clear cart
        await db.delete(carts).where(eq(carts.userId, ctx.user.id));

        return { success: true, orderId: (orderResult as any).insertId };
      }),

    updateStatus: sellerProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const order = await getOrderById(input.orderId);
        if (!order) throw new Error("Order not found");

        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller || order.sellerId !== seller.id) {
          throw new Error("Unauthorized");
        }

        await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.orderId));

        return { success: true };
      }),

    getSellerOrders: sellerProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");
      return getSellerOrders(seller.id);
    }),
  }),

  // Review routes
  reviews: router({
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(({ input }) => getProductReviews(input.productId)),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          orderId: z.number(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify order is delivered
        const order = await getOrderById(input.orderId);
        if (!order || order.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        if (order.status !== "delivered") {
          throw new Error("Can only review delivered orders");
        }

        // Check if already reviewed
        const existingReview = await db
          .select()
          .from(reviews)
          .where(
            eq(reviews.orderId, input.orderId) && eq(reviews.userId, ctx.user.id)
          );

        if (existingReview.length) {
          throw new Error("Already reviewed this order");
        }

        const result = await db.insert(reviews).values({
          productId: input.productId,
          userId: ctx.user.id,
          orderId: input.orderId,
          rating: input.rating,
          comment: input.comment,
        });

        return { success: true };
      }),
  }),

  // Seller routes
  sellers: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getSellerByUserId(ctx.user.id);
    }),

    updateProfile: sellerProcedure
      .input(
        z.object({
          shopName: z.string().optional(),
          shopDescription: z.string().optional(),
          shopImage: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new Error("Seller profile not found");

        const updateData: any = {};
        if (input.shopName !== undefined) updateData.shopName = input.shopName;
        if (input.shopDescription !== undefined) updateData.shopDescription = input.shopDescription;
        if (input.shopImage !== undefined) updateData.shopImage = input.shopImage;
        if (input.address !== undefined) updateData.address = input.address;
        if (input.phone !== undefined) updateData.phone = input.phone;

        await db.update(sellers).set(updateData).where(eq(sellers.id, seller.id));

        return { success: true };
      }),

    getProducts: sellerProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new Error("Seller profile not found");

      return db.select().from(products).where(eq(products.sellerId, seller.id));
    }),
  }),

  // Admin routes
  admin: router({
    getAllUsers: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .limit(100);
    }),

    updateUserRole: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["user", "seller", "admin"]),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    getAllOrders: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(orders).limit(100);
    }),

    getAllProducts: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(products).limit(100);
    }),

    getStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 };

      const [userCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const [productCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products);
      const [orderCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders);
      const [revenueResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(totalAmount), 0)` })
        .from(orders)
        .where(eq(orders.status, "delivered"));

      return {
        totalUsers: Number(userCount?.count ?? 0),
        totalProducts: Number(productCount?.count ?? 0),
        totalOrders: Number(orderCount?.count ?? 0),
        totalRevenue: Number(revenueResult?.total ?? 0),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
