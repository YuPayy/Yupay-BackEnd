import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import path from "path";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Yupay Backend API",
      version: "1.0.0",
      description: `
REST API untuk aplikasi Yupay — split bill, OCR nota, friends management, group payment, notifikasi.

## Autentikasi
Sebagian besar endpoint membutuhkan JWT Bearer token (kecuali \`/auth/*\` dan \`/api/v1/nota/scan\` setelah Issue #6).

Cara pakai:
1. Login di \`POST /auth/login\` → dapat \`token\`
2. Klik tombol "Authorize" di atas, paste: \`Bearer <token>\`
3. Semua endpoint protected sekarang bisa dicoba

## Microservice OCR
Endpoint \`POST /api/v1/nota/scan\` akan forward gambar ke Python OCR service (FastAPI @ \`PYTHON_OCR_URL\`).
OCR service akan callback ke \`TS_BACKEND_URL\` dengan bearer token.
      `.trim(),
      contact: {
        name: "Yupay Team",
        url: "https://github.com/YuPayy/Yupay-BackEnd",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
      {
        url: "https://yupay-backend-xxx.vercel.app",
        description: "Production (sesuaikan)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste JWT token dari /auth/login",
        },
        internalCallback: {
          type: "http",
          scheme: "bearer",
          description: "Shared secret antara OCR service dan Backend TS",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            user_id: { type: "integer", example: 1 },
            username: { type: "string", example: "bintang" },
            email: { type: "string", format: "email", example: "bintang@example.com" },
            qrisCode: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Profile: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            username: { type: "string", example: "bintang" },
            name: { type: "string", example: "Bintang Ridwan" },
            image: { type: "string", nullable: true },
            userId: { type: "integer", example: 1 },
          },
        },
        Nota: {
          type: "object",
          properties: {
            nota_id: { type: "integer", example: 42 },
            payer_id: { type: "integer", example: 1 },
            tanggalTransaksi: { type: "string", format: "date-time" },
            totalHarga: { type: "number", format: "decimal", example: 125000 },
            status: { type: "string", enum: ["open", "closed", "paid"] },
          },
        },
        Item: {
          type: "object",
          properties: {
            item_id: { type: "integer" },
            nota_id: { type: "integer" },
            namaItem: { type: "string", example: "Nasi Goreng" },
            quantity: { type: "integer", example: 2 },
            harga: { type: "number", example: 25000 },
          },
        },
        Friendship: {
          type: "object",
          properties: {
            friendship_id: { type: "integer" },
            user_id: { type: "integer" },
            friend_id: { type: "integer" },
            status: { type: "string", enum: ["pending", "accepted", "rejected"] },
          },
        },
        SplitParticipant: {
          type: "object",
          properties: {
            participant_id: { type: "integer" },
            nota_id: { type: "integer" },
            user_id: { type: "integer" },
            statusKlaim: { type: "string", enum: ["pending", "accepted", "rejected"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Notifikasi: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer" },
            title: { type: "string", example: "Pembayaran Diterima" },
            message: { type: "string", example: "Bintang telah membayar Rp 50.000" },
            isRead: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            message: { type: "string", example: "Validation failed" },
            errors: { type: "object", nullable: true },
          },
        },
        Success: {
          type: "object",
          properties: {
            status: { type: "string", example: "success" },
            data: {},
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "JWT token tidak ada atau tidak valid",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { status: "error", message: "Unauthorized" },
            },
          },
        },
        NotFound: {
          description: "Resource tidak ditemukan",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: { status: "error", message: "Not found" },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Register, login, OAuth Google, forgot/reset password" },
      { name: "Profile", description: "User profile & QRIS management" },
      { name: "Friends", description: "Friend request, list, unfriend" },
      { name: "Group", description: "Group pembayaran (split bill bersama)" },
      { name: "Nota", description: "Nota/bill CRUD + OCR scan" },
      { name: "Notifikasi", description: "In-app notification" },
      { name: "Klaim", description: "Split bill & klaim item management" },
      { name: "Payment", description: "Payment & upload bukti transfer" },
    ],
  },
  apis: [
    path.join(__dirname, "../src/modules/**/*.routes.ts"),
    path.join(__dirname, "../src/modules/**/*.route.ts"),
    path.join(__dirname, "../src/modules/**/*.controller.ts"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

export function mountSwagger(app: Express): void {
  app.get("/api/docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Yupay API Docs",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );
}
