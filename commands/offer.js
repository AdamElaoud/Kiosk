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
    async execute(bot, msg, args, img) {
        // react to command
        msg.react(bot.emojis.cache.get(Emojis.spiralscholars.id));

        // check that args is correct (pet offer rank school body) args.length >= 3
        if (args.length >= 3 && img !== null) {
            const rank = args.shift().toLowerCase();
            const school = args.shift().toLowerCase();
            const body = args.join(" ").toLowerCase();

            let offer = {
                // base info
                "owner": msg.author,
                "body": body,
                "school": school,
                "rank": rank,
                "talents": [],
                "img": img.url,
                // special flags
                "clean": false,
                "max": false,
                "PvP": false,
                "base": false,
                "free": true,
                "price": 0,
                "kiosk": false
            };

            try {
                const check = new Discord.MessageEmbed()
                    .setColor("#FFCC4D")
                    .setTitle("🐣 **━━━━━━ YOUR PET ━━━━━━** 🐣")
                    .setDescription(`**Rank:** ${offer.rank}`
                                    + `\n**School:** ${schoolEmoji(offer.school)}`
                                    + `\n**Body:** ${offer.body}`
                                    + `\n\n**Is that correct?**`)
                    .setImage(offer.img)
                    .setFooter(Format.footer.text, Format.footer.image);

                const prompt = await msg.channel.send(check);

                // setup Yes or No menu
                acceptRejectMenu(prompt, msg.author.id, 
                    () => collectTalents(bot, msg, offer), 
                    () => msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`)
                );

            } catch (err) {
                // if error is invalid rank
                if (err === "invalid school provided")
                    msg.channel.send(`${Emojis.reject.pub} **Error:** you must enter a valid school`);
                else
                    ErrorLog.log(bot, msg, `offer: user prompt`, err);
            }

        // improper input error
        } else {
            const error = new Discord.MessageEmbed()
                .setColor("#DD2E44")
                .setTitle(":exclamation: **━━━━━ ERROR ━━━━━** :exclamation:")
                .setDescription(`You must include:`
                                + `\n▫️**rank** ${Format.space(7)} ▫️**body**`
                                + `\n▫️**school** ${Format.space(2)} ▫️**screenshot**`
                                + `\nwith the command`
                                + `\n\n**ex.**`
                                + `\n> **\`pet offer\`** adult fire bloodbat`
                                + `\n> *attach a screenshot*`)
                .addField("\u200b", "\u200b")
                .setFooter(Format.footer.text, Format.footer.image);
            
            msg.channel.send(error);
        }
    }
}

async function collectTalents(bot, msg, offer) {
    try {
        const numTalents = talentCount(offer.rank);

        // if pet isn't baby or teen
        if (numTalents > 1) {
            let entered = 0;

            // message filter
            const responseFilter = (message) => message.author.id === msg.author.id && message.length !== 0;

            // collectors (parse for 60 seconds)
            const responseCollector = msg.channel.createMessageCollector(responseFilter, {time: 60000});
            
            await msg.channel.send(`📝 **${entered} / ${numTalents} Enter your pet's 1st talent:**`);

            responseCollector.on("collect",
                async (m) => {
                    // check if input is valid and add to talent list
                    offer.talents.push(m);
                    entered++;

                    // if not all talents entered, re-prompt
                    if (entered !== numTalents) {
                        m.channel.send(`📝 **${entered} / ${numTalents} Enter another talent:**`);
                        responseCollector.resetTimer({time: 60000});

                    // else, present completed pet offer
                    } else {
                        responseCollector.stop();

                        specialFlags(bot, msg, offer);
                    }
                }
            );

            responseCollector.on("end", () => {
                    if (entered !== numTalents)
                        msg.channel.send("*talent collection expired*");
                }
            );

        // can't submit baby or teen rank pets
        } else {
            msg.channel.send(`${Emojis.reject.pub} **Error:** your pet rank must be adult or higher`);
        }

    } catch (err) {
        // if error is invalid rank
        if (err === "invalid pet rank provided")
            msg.channel.send(`${Emojis.reject.pub} **Error:** you must enter a valid pet rank`);
        else
            ErrorLog.log(bot, msg, `offer: collecting talents`, err);
    }
}

async function specialFlags(bot, msg, offer) {
    try {
        const flags = await msg.channel.send(generateFullPetOffer(offer));

        flags.react(Emojis.accept.id);
        flags.react(Emojis.reject.id);
        flags.react(Emojis.notFree.id);
        flags.react(Emojis.clean.id);
        flags.react(Emojis.max.id);
        flags.react(Emojis.PvP.id);
        flags.react(Emojis.base.id);
        flags.react(Emojis.kiosk.id);

        // reaction filters
        const acceptFilter = (reaction, user) => reaction.emoji.id === Emojis.accept.id && user.id === msg.author.id;
        const rejectFilter = (reaction, user) => reaction.emoji.id === Emojis.reject.id && user.id === msg.author.id;
        const notFreeFilter = (reaction, user) => reaction.emoji.id === Emojis.notFree.id && user.id === msg.author.id;
        const cleanFilter = (reaction, user) => reaction.emoji.name === Emojis.clean.pub && user.id === msg.author.id;
        const maxFilter = (reaction, user) => reaction.emoji.name === Emojis.max.pub && user.id === msg.author.id;
        const PvPFilter = (reaction, user) => reaction.emoji.name === Emojis.PvP.pub && user.id === msg.author.id;
        const baseFilter = (reaction, user) => reaction.emoji.name === Emojis.base.pub && user.id === msg.author.id;
        const kioskFilter = (reaction, user) => reaction.emoji.id === Emojis.kiosk.id && user.id === msg.author.id;

        // collectors (parse for 60 seconds)
        const acceptCollector = flags.createReactionCollector(acceptFilter, {time: 60000});
        const rejectCollector = flags.createReactionCollector(rejectFilter, {time: 60000});
        const notFreeCollector = flags.createReactionCollector(notFreeFilter, {time: 60000});
        const cleanCollector = flags.createReactionCollector(cleanFilter, {time: 60000});
        const maxCollector = flags.createReactionCollector(maxFilter, {time: 60000});
        const PvPCollector = flags.createReactionCollector(PvPFilter, {time: 60000});
        const baseCollector = flags.createReactionCollector(baseFilter, {time: 60000});
        const kioskCollector = flags.createReactionCollector(kioskFilter, {time: 60000});

        // reaction parsing
        acceptCollector.on("collect", () => {
                if (offer.free === false) {
                    getPrice(bot, msg, offer);
                } else {
                    msg.channel.send(`${Emojis.accept.pub} **Success:** your pet has been submitted for review`)
                    stopSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
                }
            }
        );

        rejectCollector.on("collect", () => {
            msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`);
            stopSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        notFreeCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.notFree.id).users.remove(msg.author);
                offer.free = offer.free ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        cleanCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.clean.id).users.remove(msg.author);
                offer.clean = offer.clean ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        maxCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.max.id).users.remove(msg.author);
                offer.max = offer.max ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        baseCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.base.id).users.remove(msg.author);
                offer.base = offer.base ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        PvPCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.PvP.id).users.remove(msg.author);
                offer.PvP = offer.PvP ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        kioskCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.kiosk.id).users.remove(msg.author);
                offer.kiosk = offer.kiosk ? false : true;
                flags.edit(generateFullPetOffer(offer));
                resetSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        // edit message when reaction collectors expire
        kioskCollector.on("end", () =>  flags.edit(Format.expirationNotice, generateFullPetOffer(offer)));

    } catch (err) {
        ErrorLog.log(bot, msg, `offer: collecting special flags`, err);
    }
}

async function getPrice(bot, msg, offer) {
    try {
        let collected = false;

        // message filter
        const responseFilter = (message) => message.author.id === msg.author.id && message.length !== 0;

        // collectors (parse for 60 seconds)
        const responseCollector = msg.channel.createMessageCollector(responseFilter, {time: 60000});
        
        await msg.channel.send(`*Prices may **only** be empowers ${Emojis.notFree.pub}*`
                                + `\n**Enter your offer's price:**`);

        responseCollector.on("collect",
            async (m) => {
                const price = parseInt(m.content);

                // if response is correct format
                if (Number.isInteger(price)) {
                    collected = true;
                    responseCollector.stop();
                    offer.price = price.toString().toLocaleString();
                    m.channel.send(`${Emojis.accept.pub} **Success:** your pet (**${offer.price}**${Emojis.notFree.pub}) was submitted for review`);

                // else, notify and reset
                } else {
                    responseCollector.resetTimer({time: 60000});
                    m.channel.send(`${Emojis.reject.pub} **Error:** you must enter a number`
                                    + `\n**Enter your offer's price:**`);
                }
            }
        );

        responseCollector.on("end", () => {
                if (!collected)
                    msg.channel.send("*price collection expired*");
            }
        );

    } catch (err) {
        ErrorLog.log(bot, msg, `offer: collecting talents`, err);
    }
}

function resetSpecialFlagFilters(clean, max, PvP, base, notFree, kiosk) {
    clean.resetTimer({time: 60000});
    max.resetTimer({time: 60000});
    PvP.resetTimer({time: 60000});
    base.resetTimer({time: 60000});
    notFree.resetTimer({time: 60000});
    kiosk.resetTimer({time: 60000});
}

function stopSpecialFlagFilters(clean, max, PvP, base, notFree, kiosk) {
    clean.stop();
    max.stop();
    PvP.stop();
    base.stop();
    notFree.stop();
    kiosk.stop();
}

function generateFullPetOffer(offer) {
    const pet = new Discord.MessageEmbed()
        .setColor("#FFCC4D")
        .setTitle("🐣 **━━━━━ YOUR PET ━━━━━** 🐣")
        .addField(`**Base Information**`, `**Rank:** ${offer.rank}`
                                        + `\n**School:** ${schoolEmoji(offer.school)}`
                                        + `\n**Body:** ${offer.body}`, true)
        .addField(`**Talents**`, `${printTalents(offer.talents)}`, true)
        .addField("\u200b", "\u200b")
        .addField(`**Special Flags**`,
                    `> ${Emojis.notFree.pub} Free: ${offer.free ? "**Yes**" : "**No**"}`
                    + `\n> ${Emojis.clean.pub} Clean Pool: ${offer.clean ? "**Yes**" : "**No**"}`
                    + `\n> ${Emojis.max.pub} Max Stats: ${offer.max ? "**Yes**" : "**No**"}`, true)
        .addField("\u200b",
                    `> ${Emojis.PvP.pub} PvP Pet: ${offer.PvP ? "**Yes**" : "**No**"}`
                    + `\n> ${Emojis.base.pub} Base Pet: ${offer.base ? "**Yes**" : "**No**"}`
                    + `\n> ${Emojis.kiosk.pub} In Kiosk: ${offer.kiosk ? "**Yes**" : "**No**"}`, true)
        .addField("\u200b",
                    `\n\n*Click the reactions below to change your pet's special flags*`
                    + `\n\n${Emojis.accept.pub} **:** submit ${Format.space(5)} ${Emojis.reject.pub} **:** cancel`)
        .setThumbnail(offer.img)
        .setFooter(Format.footer.text, Format.footer.image);

    return pet;
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

function schoolEmoji(school) {
    switch (school) {
        case "storm": return Emojis.storm.pub;
        case "fire": return Emojis.fire.pub;
        case "ice": return Emojis.ice.pub;
        case "balance": return Emojis.balance.pub;
        case "life": return Emojis.life.pub;
        case "death": return Emojis.death.pub;
        case "myth": return Emojis.myth.pub;
        default: throw "invalid school provided";
    }
}

function printTalents(talents) {
    printout = "";

    talents.forEach((element) => printout += `\n▫️${element}`);

    return printout;
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

async function submitForReview(offer) {

}