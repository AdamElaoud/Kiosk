const Discord = require("discord.js");
const Config = require("../util/config.js");
const Emojis = require("../util/emojis.js");
const ErrorLog = require("../util/errors.js");
const Format = require("../util/format.js");

module.exports = {
    name: "unrecognized",
    description: "default response if an unrecognized command is entered",
    execute(bot, msg, cmd) {
        // react to command
        msg.react(bot.emojis.cache.get(Emojis.spiralscholars.id));
        
        const embed = new Discord.MessageEmbed()
            .setColor("#DD2E44")
            .setTitle(":exclamation: **━━━━━━━ ERROR ━━━━━━━** :exclamation:")
            .setDescription(`Unrecognized command: **${cmd}**`
                            + `\n\nUse the **\`${Config.prefix()} help\`** command for a list of Kiwi's commands`)
            .addField("\u200b", "\u200b")
            .setFooter(Format.footer.text, Format.footer.image);

        msg.channel.send(embed).catch(err => ErrorLog.log(bot, msg, `command unrecognized [${cmd}]`, err));
    }
}