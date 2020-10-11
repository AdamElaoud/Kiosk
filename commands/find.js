const Discord = require("discord.js");
const Config = require("../util/config.js");
const Emojis = require("../util/emojis.js");
const Format = require("../util/format.js");

module.exports = {
    name: "find",
    description: "check messages",
    execute(bot, msg, args) {
        // react to command
        msg.react(bot.emojis.cache.get(Emojis.spiralscholars.id));
        

        
        
    }
}