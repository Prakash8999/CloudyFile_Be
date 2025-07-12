"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConnection = void 0;
exports.dbConnection = {
    local: {
        username: 'postgres',
        password: '2001',
        dialect: 'postgres',
        host: 'localhost',
        database: 'cloudyfile',
        port: 5432
    },
    // postgresql://postgres:[YOUR-PASSWORD]@db.uyklwqnzzlxsgugjqcoh.supabase.co:5432/postgres
    supabase: {
        username: 'postgres',
        password: 'Fj3dE3FVj$iHfdD',
        host: 'db.uyklwqnzzlxsgugjqcoh.supabase.co',
        database: 'Cloudyfile',
        port: 5432,
        dialect: 'postgres',
        ssl: true,
    },
};
