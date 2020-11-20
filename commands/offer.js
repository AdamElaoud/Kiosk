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
        if (args.length >= 2) {
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

                // setup Yes or No menu
                acceptRejectMenu(prompt, msg.author.id, 
                    () => collectTalents(bot, msg, offer), 
                    () => msg.channel.send("prompt ended")
                );

            } catch (err) {
                ErrorLog.log(bot, msg, `offer: user prompt`, err);
            }

        // improper input error
        } else {
            const error = new Discord.MessageEmbed()
                .setColor("#DD2E44")
                .setTitle(":exclamation: **━━━━━━━━━ ERROR ━━━━━━━━━** :exclamation:")
                .setDescription(`You must include the **rank** and **body** of your pet with the command`
                                + `\n\n**ex.**`
                                + `\n> **\`pet offer\`** adult bloodbat`)
                .addField("\u200b", "\u200b")
                .setFooter(Format.footer.text, Format.footer.image);
            
            msg.channel.send(error);
        }
    }
}

async function collectTalents(bot, msg, offer) {
    try {
        const numTalents = talentCount(offer.rank);
        let entered = 0;

        // message filter
        const responseFilter = (message) => message.author.id === msg.author.id && message.length !== 0;

        // collectors (parse for 60 seconds)
        const responseCollector = msg.channel.createMessageCollector(responseFilter, {time: 60000});
        
        await msg.channel.send("Enter your pet's 1st talent");

        responseCollector.on("collect",
            async (m) => {
                // check if input is valid and add to talent list
                offer.talents.push(m);
                entered++;

                // if not all talents entered, re-prompt
                if (entered !== numTalents) {
                    m.channel.send(`${entered} / ${numTalents} enter another talent:`);
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

                    const confirm = await m.channel.send(check);

                    acceptRejectMenu(confirm, msg.author.id, 
                        () => msg.channel.send("submitted!"),
                        () => msg.channel.send("cancelled!")
                    );
                }
            }
        );

    } catch (err) {
        ErrorLog.log(bot, prompt, `offer: collecting talents`, err);
    }
}

function talentCount(rank) {
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

function acceptRejectMenu(prompt, issuerID, acceptCallback, rejectCallback) {
    prompt.react(Emojis.accept.id);
    prompt.react(Emojis.reject.id);

    // reaction filters
    const acceptFilter = (reaction, user) => reaction.emoji.id === Emojis.accept.id && user.id === issuerID;
    const rejectFilter = (reaction, user) => reaction.emoji.id === Emojis.reject.id && user.id === issuerID;

    // collectors (parse for 60 seconds)
    const acceptCollector = prompt.createReactionCollector(acceptFilter, {time: 60000});
    const rejectCollector = prompt.createReactionCollector(rejectFilter, {time: 60000});

    // reaction parsing
    acceptCollector.on("collect", () => {
            acceptCollector.stop();
            rejectCollector.stop();
            acceptCallback();
        }
    );

    rejectCollector.on("collect", () => {
            acceptCollector.stop();
            rejectCollector.stop();
            rejectCallback();
        }
    );
}