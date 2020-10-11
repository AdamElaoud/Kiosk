require("dotenv-flow");
const MongoDB = require("mongodb").MongoClient;
const Config = require("../util/config.js");
const ErrorLog = require("../util/errors.js");

module.exports = {
    name: "mongodb connector",
    description: "initialize db connection",
    async connect(bot, msg, dbName, dbClient) {

        try {
            let db;
            await dbClient.connect();

            // if in devmode, connect to development database
            if (!Config.devmode)
                db = dbClient.db(dbName);
            else
                db = dbClient.db("KioskDev");

            return db;

        } catch (err) {
            ErrorLog.log(bot, msg, `MongoDB Connector: connecting to ${dbName}`, err);
        }

        return null;
    },
    client() {
        return new MongoDB(process.env.MONGOURI, { useUnifiedTopology: true });
    }
}