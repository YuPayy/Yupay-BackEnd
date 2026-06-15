import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";

let io: IOServer | null = null;

export const initSocket = (server: HttpServer): IOServer => {
    io = new IOServer(server, {
        cors: {
            origin: [
                "http://localhost:3001",
                "https://yupay-frontend-app-4ex4-git-main-straw-hat-1be8d03a.vercel.app",
                "https://yupay-app.vercel.app",
            ],
            credentials: true,
        },
    });

    io.on("connection", (socket: Socket) => {
        socket.on("nota:subscribe", (notaId: number | string) => {
            if (notaId) {
                socket.join(`nota:${notaId}`);
            }
        });

        socket.on("nota:unsubscribe", (notaId: number | string) => {
            if (notaId) {
                socket.leave(`nota:${notaId}`);
            }
        });
    });

    return io;
};

export const getIO = (): IOServer | null => io;

export const safeEmit = (room: string, event: string, payload: unknown): void => {
    try {
        io?.to(room).emit(event, payload);
    } catch (err) {
        console.error(`[socket] emit ${event} to ${room} failed:`, err);
    }
};
