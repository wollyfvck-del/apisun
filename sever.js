const Fastify = require("fastify");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const fastify = Fastify({ logger: false });
const PORT = process.env.PORT || 3001;
const HISTORY_FILE = path.join(__dirname, 'taixiu_history.json');

// ==================== CONFIGURATION ====================
const CONFIG = {
  WEBSOCKET_URL: "wss://websocket.gmwin.io/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuaGFpampzIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6dHJ1ZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjoyNjc0NjEwMzUsImFmZklkIjoiZGVmYXVsdCIsImJhbm5lZCI6ZmFsc2UsImJyYW5kIjoic3VuLndpbiIsInRpbWVzdGFtcCI6MTc2NjQzMTk2NDk0NiwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOnRydWUsImlwQWRkcmVzcyI6IjExOC43MS4yMjAuOTMiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzA5LnBuZyIsInBsYXRmb3JtSWQiOjIsInVzZXJJZCI6IjBjMzg4NDc4LTM0NGQtNGVlMi1iMThhLWNjZTc0MTlhMzBkZCIsInJlZ1RpbWUiOjE3NTAwNzQyNzA3NTgsInBob25lIjoiODQzODc1NDYxNDIiLCJkZXBvc2l0Ijp0cnVlLCJ1c2VybmFtZSI6IlNDX25oYTk4OSJ9.XnwuMdBFnPmkeUrHWIDN4Jchb1Qoxp_gbeR8W4AkCfA",
  USERNAME: "SC_nha989",
  PASSWORD: "nha123",
  SIGNATURE: "1A67E441B18F85182B8433B4569C6E073ACDC80B3421BB6D5DEBC949E7BA1B24801BB039DA91D08318F041A347CBAF8BD228857C6CF6014467987CB11961AB9E32ADBCFD68D152E9CE3FA719B7F245FA7586BF5FCC74394FD8D924BA5F354639383F726564F7892256DB83974D0A413ECDFAB030C0F43483A3D48CD3A34EE3E2",
  INFO_JSON: `{
    "ipAddress": "118.71.220.93",
    "wsToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJuaGFpampzIiwiYm90IjowLCJpc01lcmNoYW50IjpmYWxzZSwidmVyaWZpZWRCYW5rQWNjb3VudCI6dHJ1ZSwicGxheUV2ZW50TG9iYnkiOmZhbHNlLCJjdXN0b21lcklkIjoyNjc0NjEwMzUsImFmZklkIjoiZGVmYXVsdCIsImJhbm5lZCI6ZmFsc2UsImJyYW5kIjoic3VuLndpbiIsInRpbWVzdGFtcCI6MTc2NjQzMjAwODkwNSwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOnRydWUsImlwQWRkcmVzcyI6IjExOC43MS4yMjAuOTMiLCJtdXRlIjpmYWxzZSwiYXZhdGFyIjoiaHR0cHM6Ly9pbWFnZXMuc3dpbnNob3AubmV0L2ltYWdlcy9hdmF0YXIvYXZhdGFyXzA5LnBuZyIsInBsYXRmb3JtSWQiOjIsInVzZXJJZCI6IjBjMzg4NDc4LTM0NGQtNGVlMi1iMThhLWNjZTc0MTlhMzBkZCIsInJlZ1RpbWUiOjE3NTAwNzQyNzA3NTgsInBob25lIjoiODQzODc1NDYxNDIiLCJkZXBvc2l0Ijp0cnVlLCJ1c2VybmFtZSI6IlNDX25oYTk4OSJ9.g78NcQc_Eb745hOl_w9mU1wYK2_ZWxnNhwCG70J-j5w",
    "locale": "vi",
    "userId": "0c388478-344d-4ee2-b18a-cce7419a30dd",
    "username": "SC_nha989",
    "timestamp": 1766432008905,
    "refreshToken": "e81b068afff049298572b333fb246d0b.51ceac1047ac46b3b0eb549fb89d8e7f"
  }`
};

// ==================== GLOBAL VARIABLES ====================
let rikResults = [];
let rikCurrentSession = null;
let rikWS = null;
let rikIntervalCmd = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let pingInterval = null;
let isAuthenticated = false;
let reconnectAttempts = 0;

let lastPongTime = Date.now();
let heartbeatTimeout = null;
let isConnectionHealthy = false;
const HEARTBEAT_INTERVAL = 8000;
const HEARTBEAT_TIMEOUT = 12000;
const PING_INTERVAL = 25000;

// ==================== CORE FUNCTIONS ====================

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            rikResults = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            console.log(`📚 Loaded ${rikResults.length} history records`);
        }
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

function saveHistory() {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(rikResults), 'utf8');
    } catch (err) {
        console.error('Error saving history:', err);
    }
}

function getTX(d1, d2, d3) {
    return d1 + d2 + d3 >= 11 ? "T" : "X";
}

// ==================== WEBSOCKET FUNCTIONS ====================

function sendHeartbeat() {
    if (rikWS?.readyState === WebSocket.OPEN && isAuthenticated) {
        try {
            const pingData = JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now(),
                session: rikCurrentSession
            });
            
            rikWS.ping(pingData);
            
            heartbeatTimeout = setTimeout(() => {
                const timeSinceLastPong = Date.now() - lastPongTime;
                if (timeSinceLastPong > HEARTBEAT_TIMEOUT) {
                    isConnectionHealthy = false;
                    reconnectWebSocket();
                }
            }, HEARTBEAT_TIMEOUT);
            
        } catch (err) {
            console.error("Heartbeat ping error:", err);
            isConnectionHealthy = false;
        }
    }
}

function handlePong(data) {
    lastPongTime = Date.now();
    isConnectionHealthy = true;
    
    if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
    }
}

function checkConnectionHealth() {
    const timeSinceLastPong = Date.now() - lastPongTime;
    
    if (timeSinceLastPong > HEARTBEAT_TIMEOUT) {
        isConnectionHealthy = false;
    } else {
        isConnectionHealthy = true;
    }
    
    return isConnectionHealthy;
}

function sendPeriodicCommands() {
    if (rikWS?.readyState === WebSocket.OPEN && isAuthenticated) {
        if (!checkConnectionHealth()) {
            return;
        }
        
        try {
            const cmd1005 = [
                6,
                "MiniGame",
                "taixiuPlugin",
                {
                    "cmd": 1005,
                    "sid": rikCurrentSession || 0
                }
            ];
            rikWS.send(JSON.stringify(cmd1005));
            
            const cmd10001 = [
                6,
                "MiniGame", 
                "lobbyPlugin",
                {
                    "cmd": 10001
                }
            ];
            rikWS.send(JSON.stringify(cmd10001));
            
            const cmd1003 = [
                6,
                "MiniGame",
                "taixiuPlugin", 
                {
                    "cmd": 1003
                }
            ];
            rikWS.send(JSON.stringify(cmd1003));
            
        } catch (err) {
            console.error("Error sending commands:", err);
        }
    }
}

function reconnectWebSocket() {
    clearTimeout(reconnectTimeout);
    clearInterval(heartbeatInterval);
    clearInterval(pingInterval);
    clearTimeout(heartbeatTimeout);
    connectWebSocket();
}

// ==================== WEBSOCKET CONNECTION ====================

function connectWebSocket() {
    console.log(`🔌 Connecting to WebSocket... Attempt ${reconnectAttempts + 1}`);
    
    try {
        if (rikWS) {
            rikWS.removeAllListeners();
            if (rikWS.readyState === WebSocket.OPEN) {
                rikWS.close();
            }
        }

        clearInterval(rikIntervalCmd);
        clearInterval(heartbeatInterval);
        clearInterval(pingInterval);
        clearTimeout(heartbeatTimeout);
        clearTimeout(reconnectTimeout);

        rikWS = new WebSocket(CONFIG.WEBSOCKET_URL, {
            handshakeTimeout: 10000,
            perMessageDeflate: false
        });

        rikWS.on('open', () => {
            console.log("✅ WebSocket connected");
            clearTimeout(reconnectTimeout);
            reconnectAttempts = 0;
            isAuthenticated = false;
            lastPongTime = Date.now();
            isConnectionHealthy = true;
            
            const authPayload = [
                1,
                "MiniGame",
                CONFIG.USERNAME,
                CONFIG.PASSWORD,
                {
                    "info": CONFIG.INFO_JSON,
                    "signature": CONFIG.SIGNATURE
                }
            ];
            
            rikWS.send(JSON.stringify(authPayload));
            console.log("🔐 Sent authentication");
        });

        rikWS.on('message', (data) => {
            try {
                const json = JSON.parse(data.toString());
                
                if (Array.isArray(json) && json[0] === 1 && json[1] === true) {
                    isAuthenticated = true;
                    isConnectionHealthy = true;
                    console.log("✅ Authentication successful");
                    
                    clearInterval(rikIntervalCmd);
                    rikIntervalCmd = setInterval(sendPeriodicCommands, 3000);
                    
                    clearInterval(heartbeatInterval);
                    heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
                    
                    clearInterval(pingInterval);
                    pingInterval = setInterval(() => {
                        if (rikWS?.readyState === WebSocket.OPEN && isAuthenticated) {
                            const pingMsg = JSON.stringify({
                                type: 'keepalive',
                                timestamp: Date.now(),
                                health: isConnectionHealthy ? 'good' : 'bad'
                            });
                            rikWS.ping(pingMsg);
                        }
                    }, PING_INTERVAL);
                    
                    setInterval(checkConnectionHealth, 5000);
                    
                    setTimeout(sendPeriodicCommands, 500);
                    setTimeout(sendHeartbeat, 1000);
                    return;
                }
                
                if (Array.isArray(json) && json[1]?.cmd === 1008 && json[1]?.sid) {
                    const sid = json[1].sid;
                    if (!rikCurrentSession || sid > rikCurrentSession) {
                        rikCurrentSession = sid;
                    }
                    return;
                }
                
                if (Array.isArray(json) && (json[1]?.cmd === 1003 || json[1]?.cmd === 1004) && 
                    json[1]?.d1 !== undefined && json[1]?.d2 !== undefined && json[1]?.d3 !== undefined) {
                    
                    const res = json[1];
                    if (rikCurrentSession && (!rikResults[0] || rikResults[0].sid !== rikCurrentSession)) {
                        rikResults.unshift({ 
                            sid: rikCurrentSession, 
                            d1: res.d1, 
                            d2: res.d2, 
                            d3: res.d3, 
                            timestamp: Date.now() 
                        });
                        // Tăng lên 200 để lưu đủ 100 kết quả và dư thêm
                        if (rikResults.length > 200) rikResults.pop();
                        saveHistory();
                        console.log(`🎲 Phiên ${rikCurrentSession} → ${getTX(res.d1, res.d2, res.d3)} (${res.d1},${res.d2},${res.d3})`);
                    }
                    return;
                }
                
                if (Array.isArray(json) && json[1]?.cmd === 1005 && json[1]?.htr) {
                    const newHistory = json[1].htr.map(i => ({
                        sid: i.sid, 
                        d1: i.d1, 
                        d2: i.d2, 
                        d3: i.d3, 
                        timestamp: Date.now()
                    })).sort((a, b) => b.sid - a.sid);
                    
                    if (newHistory.length > 0) {
                        // Tăng lên 200 để lưu đủ 100 kết quả và dư thêm
                        rikResults = newHistory.slice(0, 200);
                        saveHistory();
                    }
                    return;
                }
                
            } catch (e) {
                console.error("Parse error:", e.message);
            }
        });

        rikWS.on('close', (code, reason) => {
            console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            isAuthenticated = false;
            isConnectionHealthy = false;
            clearInterval(rikIntervalCmd);
            clearInterval(heartbeatInterval);
            clearInterval(pingInterval);
            clearTimeout(heartbeatTimeout);
            
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            reconnectTimeout = setTimeout(connectWebSocket, delay);
        });

        rikWS.on('error', (err) => {
            console.error("WebSocket error:", err.message);
            isAuthenticated = false;
            isConnectionHealthy = false;
        });

        rikWS.on('pong', (data) => {
            handlePong(data);
        });

    } catch (err) {
        console.error("Failed to create WebSocket:", err.message);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
    }
}

// ==================== API ENDPOINTS ====================

fastify.register(require('@fastify/cors'));

// API 1: Lấy lịch sử (trả về 100 kết quả)
fastify.get("/api/his", async (request, reply) => {
    try {
        // Mặc định trả về 100 kết quả
        const limit = parseInt(request.query.limit) || 100;
        
        const validResults = rikResults
            .filter(r => r.d1 !== undefined && r.d2 !== undefined && r.d3 !== undefined)
            .slice(0, limit);
        
        const history = validResults.map((item, index) => ({
            id: index + 1,
            phien: item.sid,
            result: getTX(item.d1, item.d2, item.d3).toLowerCase(),
            dice: [item.d1, item.d2, item.d3],
            time: new Date(item.timestamp).toISOString()
        }));
        
        return {
            success: true,
            data: history,
            count: history.length,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// API 2: Lấy kết quả hiện tại
fastify.get("/api/current", async () => {
    const valid = rikResults.filter(r => r.d1 !== undefined && r.d2 !== undefined && r.d3 !== undefined);
    if (!valid.length) {
        return {
            success: false,
            message: "Không có dữ liệu"
        };
    }

    const current = valid[0];
    const sum = current.d1 + current.d2 + current.d3;
    
    return {
        success: true,
        data: {
            phien: current.sid,
            result: sum >= 11 ? "tai" : "xiu",
            dice: [current.d1, current.d2, current.d3],
            total: sum,
            time: new Date(current.timestamp).toISOString()
        }
    };
});

// API 3: Lấy kết quả theo phiên
fastify.get("/api/session/:sid", async (request, reply) => {
    try {
        const sid = parseInt(request.params.sid);
        
        const result = rikResults.find(r => r.sid === sid);
        
        if (!result || result.d1 === undefined) {
            return {
                success: false,
                message: "Không tìm thấy phiên"
            };
        }
        
        const sum = result.d1 + result.d2 + result.d3;
        
        return {
            success: true,
            data: {
                phien: result.sid,
                result: sum >= 11 ? "tai" : "xiu",
                dice: [result.d1, result.d2, result.d3],
                total: sum,
                time: new Date(result.timestamp).toISOString()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// API 4: Health check
fastify.get("/api/health", async () => {
    const timeSinceLastPong = Date.now() - lastPongTime;
    
    return {
        status: isAuthenticated ? "connected" : "disconnected",
        authenticated: isAuthenticated,
        connection_healthy: isConnectionHealthy,
        current_session: rikCurrentSession,
        history_count: rikResults.length,
        last_update: rikResults.length > 0 ? new Date(rikResults[0].timestamp).toISOString() : null,
        last_pong: new Date(lastPongTime).toISOString(),
        time_since_last_pong: timeSinceLastPong + "ms"
    };
});

// ==================== START SERVER ====================

const start = async () => {
    try {
        loadHistory();
        connectWebSocket();
        
        await fastify.listen({ port: PORT, host: "0.0.0.0" });
        console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
        console.log(`📡 Endpoints:`);
        console.log(`   GET  /api/his              - Lịch sử 100 kết quả`);
        console.log(`   GET  /api/current          - Kết quả hiện tại`);
        console.log(`   GET  /api/session/:sid     - Kết quả theo phiên`);
        console.log(`   GET  /api/health           - Trạng thái kết nối`);
        
    } catch (err) {
        console.error("Server error:", err);
        process.exit(1);
    }
};

start();