/**
 * PvP WebSocket 中继服务器
 * 端口: 8079
 * 功能: 房间管理、玩家匹配、卡组同步、随机种子分发、操作中继
 */
import { WebSocketServer } from "ws";
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PVP_PORT || 8079);
const rooms = new Map(); // roomId -> { players: [ws, ws], decks: [null, null], turn, seed, ... }
const MAX_NAME_LENGTH = 40;
const MAX_DECK_SIZE = 60;
const MIN_DECK_SIZE = 40;
const MAX_MESSAGE_BYTES = 64 * 1024;

function generateSeed() {
    return crypto.randomBytes(16).toString("hex");
}

function send(ws, data) {
    if (ws?.readyState !== 1) return;
    try { ws.send(JSON.stringify(data)); } catch { /* 连接可能刚好关闭 */ }
}

function createRoomId() {
    let roomId;
    do {
        roomId = String(crypto.randomInt(100000, 1000000));
    } while (rooms.has(roomId));
    return roomId;
}

function normalizeName(value, fallback) {
    const name = typeof value === "string" ? value.trim().slice(0, MAX_NAME_LENGTH) : "";
    return name || fallback;
}

function isValidDeck(deck) {
    if (!Array.isArray(deck) || deck.length < MIN_DECK_SIZE || deck.length > MAX_DECK_SIZE) return false;
    const counts = new Map();
    return deck.every(cardId => {
        if (typeof cardId !== "string" || cardId.length === 0 || cardId.length > 50) return false;
        const count = (counts.get(cardId) || 0) + 1;
        counts.set(cardId, count);
        return count <= 3;
    });
}

const server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "Content-Type": "text/plain", "Allow": "GET, HEAD" });
        res.end("Method Not Allowed");
        return;
    }
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(req.method === "HEAD" ? undefined : "Nightcord PvP Server Running");
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });

wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.roomId = null;
    ws.playerIndex = -1;
    ws.playerName = "Player";

    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", (raw) => {
        if (raw.length > MAX_MESSAGE_BYTES) {
            send(ws, { type: "error", reason: "消息过大" });
            ws.close(1009, "Message too big");
            return;
        }
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;

        switch (msg.type) {
            case "create_room": {
                if (ws.roomId) { send(ws, { type: "error", reason: "你已经在房间中" }); break; }
                const roomId = createRoomId();
                rooms.set(roomId, {
                    players: [ws, null],
                    decks: [null, null],
                    turn: 0,
                    seed: generateSeed(),
                    ready: new Set(),
                    started: false,
                });
                ws.roomId = roomId;
                ws.playerIndex = 0;
                ws.playerName = normalizeName(msg.name, "Player 1");
                send(ws, { type: "room_created", roomId });
                console.log(`Room ${roomId} created by ${ws.playerName}`);
                break;
            }

            case "join_room": {
                if (ws.roomId) { send(ws, { type: "error", reason: "你已经在房间中" }); break; }
                if (typeof msg.roomId !== "string" || !/^\d{6}$/.test(msg.roomId)) {
                    send(ws, { type: "error", reason: "房间号无效" });
                    break;
                }
                const room = rooms.get(msg.roomId);
                if (!room) { send(ws, { type: "error", reason: "房间不存在" }); break; }
                if (room.players[1]) { send(ws, { type: "error", reason: "房间已满" }); break; }
                room.players[1] = ws;
                ws.roomId = msg.roomId;
                ws.playerIndex = 1;
                ws.playerName = normalizeName(msg.name, "Player 2");
                send(room.players[0], { type: "opponent_joined", name: ws.playerName });
                send(ws, { type: "room_joined", roomId: msg.roomId, opponent: room.players[0].playerName });
                console.log(`${ws.playerName} joined room ${msg.roomId}`);
                break;
            }

            case "set_deck": {
                const room = rooms.get(ws.roomId);
                if (!room || room.started) break;
                if (!isValidDeck(msg.deck)) {
                    send(ws, { type: "error", reason: "卡组必须为40至60张，且同名卡不超过3张" });
                    break;
                }
                room.decks[ws.playerIndex] = [...msg.deck];
                room.ready.add(ws.playerIndex);
                // 双方都准备好后，分发游戏开始信息
                if (room.ready.size === 2) {
                    const firstPlayer = Math.random() < 0.5 ? 0 : 1;
                    room.turn = firstPlayer;
                    room.started = true;
                    room.players.forEach((p, i) => {
                        if (p) send(p, {
                            type: "game_start",
                            yourIndex: i,
                            firstPlayer,
                            seed: room.seed,
                            opponentName: room.players[1 - i].playerName,
                            opponentDeck: room.decks[1 - i], // 对手的卡组ID列表
                        });
                    });
                    console.log(`Room ${ws.roomId}: game started, first=${firstPlayer}, seed=${room.seed.slice(0, 8)}...`);
                }
                break;
            }

            case "game_action": {
                const room = rooms.get(ws.roomId);
                if (!room || !room.started || room.turn !== ws.playerIndex || !msg.action || typeof msg.action !== "object") {
                    send(ws, { type: "error", reason: "当前不能发送该操作" });
                    break;
                }
                const opponent = room.players[1 - ws.playerIndex];
                send(opponent, { type: "game_action", action: msg.action, playerIndex: ws.playerIndex });
                break;
            }

            case "end_turn": {
                const room = rooms.get(ws.roomId);
                if (!room || !room.started || room.turn !== ws.playerIndex) {
                    send(ws, { type: "error", reason: "不是你的回合" });
                    break;
                }
                room.turn = 1 - ws.playerIndex;
                room.players.forEach(player => send(player, {
                    type: "turn_changed",
                    turn: room.turn,
                    requestId: typeof msg.requestId === "string" ? msg.requestId.slice(0, 100) : null,
                }));
                break;
            }

            case "game_over": {
                const room = rooms.get(ws.roomId);
                if (!room) break;
                room.players.forEach(p => send(p, { type: "game_over", winner: msg.winner, reason: msg.reason }));
                break;
            }

            case "chat": {
                const room = rooms.get(ws.roomId);
                if (!room) break;
                const message = typeof msg.message === "string" ? msg.message.trim().slice(0, 500) : "";
                if (!message) break;
                const opponent = room.players[1 - ws.playerIndex];
                send(opponent, { type: "chat", name: ws.playerName, message });
                break;
            }
        }
    });

    ws.on("close", () => {
        if (!ws.roomId) return;
        const room = rooms.get(ws.roomId);
        if (!room) return;
        const opponent = room.players.find(p => p && p !== ws);
        send(opponent, { type: "opponent_disconnected" });
        rooms.delete(ws.roomId);
        console.log(`Room ${ws.roomId} closed`);
    });

    ws.on("error", () => {});
});

// 心跳检测
setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Nightcord PvP Server: ws://localhost:${PORT}`);
});
