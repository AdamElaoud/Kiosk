// created by Adam Elaoud (Sap#5703, ID: 193427298958049280)
// copyright (c) 2020

const Discord = require("discord.js");
const FS = require("fs");
const Config = require("./util/config.js");
require("dotenv-flow").config();

// instantiate bot
const bot = new Discord.Client();

// fill command collection
bot.commands = new Discord.Collection();
const commandFiles = FS.readdirSync("./commands");
for (const file of commandFiles) {
	let command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

bot.on("ready", async () => {
	bot.user.setActivity(`for 🐣 offers`, { type: "WATCHING" });
	
	// send online notification if not in devmode
	if (!Config.devmode) {
		try {
			const owner = await bot.users.fetch(Config.owner.id);
			let date = new Date();
			owner.send("Bot Online! **" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "**");

		} catch (err) {
			console.log(`Error sending message! Error: ${err}`);
		}
	}
    
    // send launch notification
    console.log(`Logged in as ${bot.user.tag}!`);
});

// command parsing
bot.on("message", message => {
	// if another bot sent the message, if it has attachments, or if the prefix wasn't used, do nothing
	if (message.author.bot || message.attachments.size !== 0 || !message.content.startsWith(Config.prefix()))
		return;

	// if in devmode, only respond to dev
	if (Config.devmode && message.author.id !== Config.owner.id)
		return;

	// parsing command and arguments beginning after the prefix
	let args = message.content.substring(Config.prefix().length).split(/[\s|\r?\n|\r]/);
	// remove any remaining empty space
	args = args.filter(ele => ele !== "" && ele !== " ");
	// retrieve command
	command = args.shift();

	// checking command request
	switch(command) {
		// player commands
		case "find":
		case "search":
			bot.commands.get("find").execute(bot, message, args);
			break;
		case "offer":
			bot.commands.get("offer").execute(bot, message, args);
			break;
		

		// unrecognized command
		default:
			bot.commands.get("unrecognized").execute(bot, message, command);
	}
});

// login to Discord with bot token
if (Config.devmode)
	bot.login(process.env.KIOSKDEVTOKEN);
else
	bot.login(process.env.KIOSKTOKEN);