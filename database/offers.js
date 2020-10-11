const ErrorLog = require("../util/errors.js");
const MongoConnector = require("../util/mongo.js");

module.exports = {
    async add(bot, msg, offer) {
        const dbClient = MongoConnector.client();
        
        try {
            const db = await MongoConnector.connect(bot, msg, "KioskDB", dbClient);
            const offers = db.collection("offers");

            await offers.insertOne(offer);

        } catch (err) {
            ErrorLog.log(bot, msg, `failed adding offer to database`, err);

        } finally {
            dbClient.close();
        }
    }
}