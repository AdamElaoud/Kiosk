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
                // base info
                "owner": msg.author,
                "body": body,
                "school": "pull from ../data/bodies.js",
                "rank": rank,
                "talents": [],
                // special flags
                "clean": false,
                "max": false,
                "PvP": false,
                "base": false,
                "free": true,
                "price": 0,
                "kiosk": false,
                "img": null
            };

            const check = new Discord.MessageEmbed()
                .setColor("#FFCC4D")
                .setTitle("🐣 **━━━━━━━ YOUR PET ━━━━━━━** 🐣")
                .setDescription(`**Rank:** ${offer.rank}`
                                + `\n**Body:** ${offer.body}`
                                + `\n**School:** ${offer.school}`
                                + `\n\nIs that correct?`)
                .setFooter(Format.footer.text, Format.footer.image);

            try {
                const prompt = await msg.channel.send(check);

                // setup Yes or No menu
                acceptRejectMenu(prompt, msg.author.id, 
                    () => imgSubmission(bot, msg, offer), 
                    () => msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`)
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

async function imgSubmission(bot, msg, offer) {
    try {
        // message filter
        const imgFilter = (message) => message.author.id === msg.author.id && message.attachments.size >= 0;

        // collectors (parse for 60 seconds)
        const imgCollector = msg.channel.createMessageCollector(imgFilter, {time: 60000});
        
        const prompt = await msg.channel.send(`Do you have an image of your pet for your submission?`
                                + `\n\n> *Note: all submissions are reviewed before being posted*`
                                + `\n> *You **cannot** put special flags on your submission without an image*`);

        // setup Yes or No menu
        acceptRejectMenu(prompt, msg.author.id, 
            () => msg.channel.send(`Please send a message with your image`), 
            async () => {
                msg.channel.send(`Image submission cancelled`);
                imgCollector.stop();

                const submit = await msg.channel.send(`Submit your pet?`);

                // setup Yes or No menu
                acceptRejectMenu(submit, msg.author.id, 
                    () => msg.channel.send(`${Emojis.accept.pub} **Success:** your pet has been submitted for review`), 
                    () => msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`)
                );
            }
        );

        imgCollector.on("collect",
            async (m) => {
                imgCollector.stop();
                // add image URL to offer
                offer.img = m.attachments.first().url;
                // collect talents
                collectTalents(bot, msg, offer)
            }
        );

    } catch (err) {
        ErrorLog.log(bot, msg, `offer: addding image to submission`, err);
    }
}

async function collectTalents(bot, msg, offer) {
    try {
        const numTalents = talentCount(offer.rank);

        // if pet isn't baby
        if (numTalents > 1) {
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
                        
                        // offer has image, add it to embed
                        if (offer.img !== null)
                            check.setThumbnail(offer.img);

                        const confirm = await m.channel.send(check);

                        acceptRejectMenu(confirm, msg.author.id, 
                            () => specialFlags(bot, msg, offer),
                            () => msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`)
                        );
                    }
                }
            );

        // can't submit baby or teen rank pets
        } else {
            msg.channel.send(`${Emojis.reject.pub} **Error:** your pet rank must be adult or higher`);
        }

    } catch (err) {
        // if error is invalid rank
        if (err === "invalid pet rank provided") {
            msg.channel.send(`${Emojis.reject.pub} **Error:** you must enter a valid pet rank`);

        // default error logging
        } else {
            ErrorLog.log(bot, msg, `offer: collecting talents`, err);
        }
    }
}

async function specialFlags(bot, msg, offer) {
    try {
        const flags = await msg.channel.send(generateFullPetOffer(offer));

        flags.react(Emojis.clean.id);
        flags.react(Emojis.max.id);
        flags.react(Emojis.PvP.id);
        flags.react(Emojis.base.id);
        flags.react(Emojis.notFree.id);
        flags.react(Emojis.kiosk.id);
        flags.react(Emojis.accept.id);
        flags.react(Emojis.reject.id);

        // reaction filters
        const cleanFilter = (reaction, user) => reaction.emoji.name === Emojis.clean.pub && user.id === msg.author.id;
        const maxFilter = (reaction, user) => reaction.emoji.name === Emojis.max.pub && user.id === msg.author.id;
        const PvPFilter = (reaction, user) => reaction.emoji.name === Emojis.PvP.pub && user.id === msg.author.id;
        const baseFilter = (reaction, user) => reaction.emoji.name === Emojis.base.pub && user.id === msg.author.id;
        const notFreeFilter = (reaction, user) => reaction.emoji.id === Emojis.notFree.id && user.id === msg.author.id;
        const kioskFilter = (reaction, user) => reaction.emoji.id === Emojis.kiosk.id && user.id === msg.author.id;
        const acceptFilter = (reaction, user) => reaction.emoji.id === Emojis.accept.id && user.id === msg.author.id;
        const rejectFilter = (reaction, user) => reaction.emoji.id === Emojis.reject.id && user.id === msg.author.id;

        // collectors (parse for 60 seconds)
        const cleanCollector = flags.createReactionCollector(cleanFilter, {time: 60000});
        const maxCollector = flags.createReactionCollector(maxFilter, {time: 60000});
        const PvPCollector = flags.createReactionCollector(PvPFilter, {time: 60000});
        const baseCollector = flags.createReactionCollector(baseFilter, {time: 60000});
        const notFreeCollector = flags.createReactionCollector(notFreeFilter, {time: 60000});
        const kioskCollector = flags.createReactionCollector(kioskFilter, {time: 60000});
        const acceptCollector = flags.createReactionCollector(acceptFilter, {time: 60000});
        const rejectCollector = flags.createReactionCollector(rejectFilter, {time: 60000});

        // reaction parsing
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

        notFreeCollector.on("collect", () => {
                flags.reactions.cache.get(Emojis.notFree.id).users.remove(msg.author);
                offer.free = offer.free ? false : true;
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

        acceptCollector.on("collect", () => {
            msg.channel.send(`${Emojis.accept.pub} **Success:** your pet has been submitted for review`)
            stopSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        rejectCollector.on("collect", () => {
            msg.channel.send(`${Emojis.reject.pub} **Cancelled:** your pet submission has been cancelled`);
            stopSpecialFlagFilters(cleanCollector, maxCollector, PvPCollector, baseCollector, notFreeCollector, kioskCollector);
            }
        );

        // edit message when reaction collectors expire
        kioskCollector.on("end", () =>  flags.edit("*The reaction menu on this message has expired*", generateFullPetOffer(offer)));

    } catch (err) {
        ErrorLog.log(bot, msg, `offer: collecting special flags`, err);
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
        .setTitle("🐣 **━━━━━━━ YOUR PET ━━━━━━━** 🐣")
        .setDescription(`**Base Information**`
                        + `\n> Rank: **${offer.rank}**`
                        + `\n> Body: **${offer.body}**`
                        + `\n> Talents: **${offer.talents}**`
                        + `\n\n**Special Flags**`
                        + `\n> ${Emojis.clean.pub} Clean Pool: ${offer.clean ? "**Yes**" : "**No**"}`
                        + `\n> ${Emojis.max.pub} Max Stats: ${offer.max ? "**Yes**" : "**No**"}`
                        + `\n> ${Emojis.PvP.pub} PvP Pet: ${offer.PvP ? "**Yes**" : "**No**"}`
                        + `\n> ${Emojis.base.pub} Base Pet: ${offer.base ? "**Yes**" : "**No**"}`
                        + `\n> ${Emojis.notFree.pub} Free: ${offer.free ? "**Yes**" : "**No**"}`
                        + `\n> ${Emojis.kiosk.pub} In Kiosk: ${offer.kiosk ? "**Yes**" : "**No**"}`
                        + `\n\n*Click the reactions below to change your pet's special flags*`
                        + `\n\n${Emojis.accept.pub} **:** submit ${Format.space(5)} ${Emojis.reject.pub} **:** cancel`)
        .setFooter(Format.footer.text, Format.footer.image);

    // offer has image, add it to embed
    if (offer.img !== null)
        pet.setThumbnail(offer.img);

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