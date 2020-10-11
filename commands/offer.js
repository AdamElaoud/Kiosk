const Discord = require("discord.js");
const Channels = require("../util/channels.js");
const Emojis = require("../util/emojis.js");
const ErrorLog = require("../util/errors.js");
const Format = require("../util/format.js");
const Offers = require("../database/offers.js");
const Roles = require("../util/roles.js");

module.exports = {
    name: "offer",
    description: "submit a pet for approval to the DB",
    async execute(bot, msg, args) {
        // react to command
        msg.react(bot.emojis.cache.get(Emojis.spiralscholars.id));

        // check that args is correct (pet offer rank body) args.length >= 2

        const rank = args.shift().toLowerCase();
        const body = args.join(" ").toLowerCase();

        let offer = {
            "owner": msg.author,
            "body": body,
            "school": "pull from ../data/bodies.js",
            "rank": rank,
            "talents": []
        };

        const check = new Discord.MessageEmbed()
            .setColor("#FFCC4D")
            .setTitle("🐣 **━━━━━━━ YOUR PET ━━━━━━━** 🐣")
            .setDescription(`**Rank:** ${rank}`
                            + `\n**Body:** ${body}`
                            + `\n\nIs that correct?`)
            .setFooter(Format.footer.text, Format.footer.image);

        try {
            const prompt = await msg.channel.send(check);
            prompt.react(Emojis.accept.id);
            prompt.react(Emojis.reject.id);

            // reaction filters
            const acceptFilter = (reaction, user) => reaction.emoji.id === Emojis.accept.id && user.id === msg.author.id;
            const rejectFilter = (reaction, user) => reaction.emoji.id === Emojis.reject.id && user.id === msg.author.id;

            // collectors (parse for 60 seconds)
            const acceptCollector = prompt.createReactionCollector(acceptFilter, {time: 60000});
            const rejectCollector = prompt.createReactionCollector(rejectFilter, {time: 60000});

            // reaction parsing
            acceptCollector.on("collect", () => {
                    acceptCollector.stop();
                    rejectCollector.stop();
                    module.exports.collectTalents(bot, prompt, offer);
                }
            );

            rejectCollector.on("collect", () => {
                    acceptCollector.stop();
                    rejectCollector.stop();
                    msg.channel.send("prompt ended");
                }
            );

        } catch (err) {
            ErrorLog.log(bot, msg, `offer: user prompt`, err);
        }
    },
    async collectTalents(bot, msg, offer) {
        try {
            const talentCount = module.exports.talentCount(offer.rank);
            let entered = 0;

            // filter
            const responseFilter = (msg) => msg.length !== 0;

            // collectors (parse for 60 seconds)
            const responseCollector = msg.channel.createMessageCollector(responseFilter, {time: 60000});
            await msg.channel.send("Enter your pet's 1st talent");

            responseCollector.on("collect", async (msg) => {
                    if (!msg.author.bot) {
                        // check if input is valid and add to talent list
                        offer.talents.push(msg);
                        entered++;

                        // if not all talents entered, re-prompt
                        if (entered !== talentCount) {
                            msg.channel.send(`${entered} / ${talentCount} enter another talent:`);
                            responseCollector.resetTimer({time: 60000});

                        // else, present completed pet offer
                        } else {
                            responseCollector.stop();

                            const check = new Discord.MessageEmbed()
                                .setColor("#FFCC4D")
                                .setTitle("🐣 **━━━━━━━ YOUR PET ━━━━━━━** 🐣")
                                .setDescription(`**Rank:** ${offer.rank}`
                                                + `\n**Body:** ${offer.body}`
                                                + `\n**Talents:** ${offer.talents}`
                                                + `\n\nIs that correct?`)
                                .setFooter(Format.footer.text, Format.footer.image);

                            await msg.channel.send(check);
                        }
                    }
                }
            );

        } catch (err) {
            ErrorLog.log(bot, msg, `offer: collecting talents`, err);
        }
    },
    talentCount(rank) {
        switch (rank) {
            case "baby": return 0;
            case "teen": return 1;
            case "adult": return 2;
            case "ancient": return 3;
            case "epic": return 4;
            case "mega": return 5;
            case "ultra": return 6;
            default: throw "invalid pet rank provided";
        }
    }
}