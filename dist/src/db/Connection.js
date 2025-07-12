"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
// const sequelize = new Sequelize(dbConnection.local)
// const sequelize = new Sequelize(dbConnection.supabase)
const sequelize = new sequelize_1.Sequelize(process.env.DB_URI, {
    dialect: "postgres",
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
});
const syncOption = { alter: false, force: false };
sequelize.sync(syncOption).then(() => {
    console.log('Database synced');
}).catch((error) => {
    console.log("Error syncing database: ", error);
});
exports.default = sequelize;
