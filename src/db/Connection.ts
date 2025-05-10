import { Sequelize } from "sequelize";
import { dbConnection } from "./PostgreSQL";

const sequelize = new Sequelize(dbConnection.local)

const syncOption = {alter: false, force: false}
sequelize.sync(syncOption).then(()=>{
	console.log('Database synced')
}).catch((error)=>{
	console.log("Error syncing database: ", error)
})

export default sequelize