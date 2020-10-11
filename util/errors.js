const Discord = require("discord.js");
const Channels = require("./channels.js");
const Format = require("./format.js");
const Roles = require("./roles.js");

module.exports = {
    name: "errorlog",
    description: "sends errors that Kiosk encounters to a logging channel",
    log(bot, msg, cmd, error) {
        const log = new Discord.MessageEmbed()
            .setColor("#DD2E44")
            .setTitle(":exclamation: **━━━━━━━━━━━ ERROR ━━━━━━━━━━━** :exclamation:")
            .setDescription(`**Command Used:** ${cmd}`
                            + `\n**User:** ${msg.author}`
                            + `\n**Server:** ${bot.guilds.cache.get(msg.guild.id).name}`
                            + `\n**Channel:** ${msg.channel}`
                            + `\n**Date:** ${new Date()}`
                            + `\n\n**Error:**`
                            + `\n${error}`)
            .setFooter(Format.footer.text, Format.footer.image);

        bot.channels.cache.get(Channels.errorLog).send(log);
        bot.channels.cache.get(Channels.errorLog).send(Roles.dev.pub);
    }
}