"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.json());
// app.use(helmet())
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    // origin: "https://cloudy-file.vercel.app",
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
// app.options('*', cors({
//   origin: "https://cloudy-file.vercel.app",
//   credentials: true
// }));
const PORT = process.env.PORT || 4000;
const v1Endpoint = '/api/v1';
// import redisClient, { connectRedis } from './';
app.get('/', (req, res) => {
    res.send('Hello, This is CloudyFile!');
});
const redis_1 = __importStar(require("./src/utils/redis"));
async function initApp() {
    try {
        await (0, redis_1.connectRedis)();
        const result = await redis_1.default.ping();
        console.log('Redis is working! PING =>', result);
    }
    catch (err) {
        console.error('Redis connection failed:', err);
    }
}
initApp();
const user_route_1 = __importDefault(require("./src/routes/user-route"));
const file_route_1 = __importDefault(require("./src/routes/file-route"));
const folder_route_1 = __importDefault(require("./src/routes/folder-route"));
const share_file_route_1 = __importDefault(require("./src/routes/share-file-route"));
const stats_route_1 = __importDefault(require("./src/routes/stats-route"));
app.use(`${v1Endpoint}/user`, user_route_1.default);
app.use(`${v1Endpoint}/file`, file_route_1.default);
app.use(`${v1Endpoint}/folder`, folder_route_1.default);
app.use(`${v1Endpoint}/share-file`, share_file_route_1.default);
app.use(`${v1Endpoint}/stats`, stats_route_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
