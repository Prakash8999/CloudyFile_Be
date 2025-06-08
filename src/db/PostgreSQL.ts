import { Dialect } from "sequelize";

export const dbConnection = {
	local:{
		username:'postgres',
		password:'2001',
        dialect: 'postgres' as Dialect,
		host:'localhost',
		database: 'cloudyfile',
		port:5432
	},

	// postgresql://postgres:[YOUR-PASSWORD]@db.uyklwqnzzlxsgugjqcoh.supabase.co:5432/postgres
	 supabase: {
    username: 'postgres',
    password: 'Fj3dE3FVj$iHfdD',
    host: 'db.uyklwqnzzlxsgugjqcoh.supabase.co',
    database: 'Cloudyfile',
    port: 5432,
    dialect: 'postgres' as Dialect,
    ssl: true,
  },
}