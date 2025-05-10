import { Dialect } from "sequelize";

export const dbConnection = {
	local:{
		username:'postgres',
		password:'2001',
        dialect: 'postgres' as Dialect,
		host:'localhost',
		database: 'cloudyfile',
		port:5432
	}
}