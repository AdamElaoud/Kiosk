const ErrorLog = require("../util/errors.js");
const MongoConnector = require("../util/mongo.js");

module.exports = {
    async addOffer(bot, msg, offer) {
        const dbClient = MongoConnector.client();
        
        try {
            const db = await MongoConnector.connect(bot, msg, "KioskDB", dbClient);
            const offers = db.collection("offers");

            await offers.insertOne(offer);

        } catch (err) {
            ErrorLog.log(bot, msg, `failed adding offer to offer database`, err);

        } finally {
            dbClient.close();
        }
    },
    async addPendingOffer(bot, msg, offer) {
        const dbClient = MongoConnector.client();
        
        try {
            const db = await MongoConnector.connect(bot, msg, "KioskDB", dbClient);
            const pending = db.collection("pending");

            await pending.insertOne(offer);

        } catch (err) {
            ErrorLog.log(bot, msg, `failed adding offer to pending offer database`, err);

        } finally {
            dbClient.close();
        }
    }
}