import { Sequelize } from "sequelize";
import { dbConnection } from "./PostgreSQL";

// const sequelize = new Sequelize(dbConnection.local)
// const sequelize = new Sequelize(dbConnection.supabase)
const sequelize = new Sequelize("postgresql://postgres.uyklwqnzzlxsgugjqcoh:12345rtytfgwhjskdjhjskjdh2w@aws-0-ap-south-1.pooler.supabase.com:6543/postgres", {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const syncOption = {alter: false, force: false}
sequelize.sync(syncOption).then(()=>{
	console.log('Database synced')
}).catch((error)=>{
	console.log("Error syncing database: ", error)
})



export default sequelize