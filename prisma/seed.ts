import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    const hashedPwd = await bcrypt.hash("Password123!", 10);

    // 1. Wipe (reverse dependency order)
    await prisma.notifikasi.deleteMany();
    await prisma.klaimItem.deleteMany();
    await prisma.splitParticipant.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.item.deleteMany();
    await prisma.friendship.deleteMany();
    await prisma.nota.deleteMany();
    await prisma.otp.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create 5 users with profiles
    const userData = [
        { username: "alice", name: "Alice Wijaya" },
        { username: "bob", name: "Bob Santoso" },
        { username: "charlie", name: "Charlie Lim" },
        { username: "diana", name: "Diana Putri" },
        { username: "edi", name: "Edi Kurniawan" },
    ];

    const users = [];
    for (let i = 0; i < userData.length; i++) {
        const u = await prisma.user.create({
            data: {
                username: userData[i].username,
                email: `${userData[i].username}@yupay.test`,
                passwordHash: hashedPwd,
                Profile: {
                    create: {
                        username: userData[i].username,
                        name: userData[i].name,
                    },
                },
            },
        });
        users.push(u);
    }
    console.log(`✅ ${users.length} users created`);

    // 3. Friendships (bidirectional, all ACCEPTED)
    let friendshipCount = 0;
    for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
            await prisma.friendship.createMany({
                data: [
                    {
                        user_id: users[i].user_id,
                        friend_id: users[j].user_id,
                        status: "ACCEPTED",
                    },
                    {
                        user_id: users[j].user_id,
                        friend_id: users[i].user_id,
                        status: "ACCEPTED",
                    },
                ],
            });
            friendshipCount += 2;
        }
    }
    console.log(`✅ ${friendshipCount} friendships created`);

    // 4. 3 Nota with items
    const nota1 = await prisma.nota.create({
        data: {
            payer_id: users[0].user_id,
            tanggalTransaksi: new Date(),
            totalHarga: 250000,
            status: "open",
            items: {
                create: [
                    { namaItem: "Nasi Goreng", quantity: 2, harga: 35000 },
                    { namaItem: "Es Teh Manis", quantity: 4, harga: 8000 },
                    { namaItem: "Ayam Bakar", quantity: 2, harga: 45000 },
                    { namaItem: "Kentang Goreng", quantity: 1, harga: 25000 },
                ],
            },
        },
    });

    const nota2 = await prisma.nota.create({
        data: {
            payer_id: users[1].user_id,
            tanggalTransaksi: new Date(),
            totalHarga: 180000,
            status: "open",
            items: {
                create: [
                    { namaItem: "Pizza Margherita", quantity: 1, harga: 95000 },
                    { namaItem: "Pasta Carbonara", quantity: 1, harga: 75000 },
                    { namaItem: "Coke", quantity: 2, harga: 5000 },
                ],
            },
        },
    });

    const nota3 = await prisma.nota.create({
        data: {
            payer_id: users[2].user_id,
            tanggalTransaksi: new Date(),
            totalHarga: 120000,
            status: "open",
            items: {
                create: [
                    { namaItem: "Sate Ayam", quantity: 2, harga: 30000 },
                    { namaItem: "Gado-Gado", quantity: 2, harga: 25000 },
                    { namaItem: "Es Campur", quantity: 2, harga: 5000 },
                ],
            },
        },
    });
    console.log(`✅ 3 notas created (#${nota1.nota_id}, #${nota2.nota_id}, #${nota3.nota_id})`);

    // 5. 2 Group payments (split participants for nota1 & nota2)
    await prisma.splitParticipant.createMany({
        data: [
            { nota_id: nota1.nota_id, user_id: users[1].user_id, statusKlaim: "active" },
            { nota_id: nota1.nota_id, user_id: users[2].user_id, statusKlaim: "active" },
            { nota_id: nota1.nota_id, user_id: users[3].user_id, statusKlaim: "active" },
            { nota_id: nota1.nota_id, user_id: users[4].user_id, statusKlaim: "active" },
            { nota_id: nota2.nota_id, user_id: users[0].user_id, statusKlaim: "active" },
            { nota_id: nota2.nota_id, user_id: users[2].user_id, statusKlaim: "active" },
        ],
    });
    console.log(`✅ 2 groups with 6 split participants created`);

    // 6. Sample payments
    await prisma.payment.createMany({
        data: [
            {
                nota_id: nota1.nota_id,
                from_user_id: users[1].user_id,
                to_user_id: users[0].user_id,
                amount: 50000,
                status: "pending",
            },
            {
                nota_id: nota1.nota_id,
                from_user_id: users[2].user_id,
                to_user_id: users[0].user_id,
                amount: 50000,
                status: "confirmed",
            },
        ],
    });
    console.log(`✅ 2 sample payments created`);

    console.log("\n🎉 Seeding complete!");
    console.log(`   Users: ${users.length}`);
    console.log(`   Friendships: ${friendshipCount} (bidirectional)`);
    console.log(`   Notas: 3`);
    console.log(`   Items: ${(await prisma.item.count())}`);
    console.log(`   Split participants: 6`);
    console.log(`   Payments: 2`);
    console.log(`\n📧 Login with: alice@yupay.test / Password123!`);
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
