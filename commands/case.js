const Discord = require("discord.js");
const Config = require("../util/config.js");
const Emojis = require("../util/emojis.js");
const Format = require("../util/format.js");

module.exports = {
    name: "case",
    description: "view an offer case to approve or reject",
    async execute(bot, msg, args) {
        // react to command
        msg.react(bot.emojis.cache.get(Emojis.spiralscholars.id));
        
        // add offer to case file
    }
}