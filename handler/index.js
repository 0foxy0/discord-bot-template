const { glob } = require("glob");
const { promisify } = require("util");
const { Client } = require("discord.js");
const mongoose = require("mongoose");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { clientID, token, mongodbLink } = require("../config.json");

const globPromise = promisify(glob);

/**
 * @param {Client} client
 */
module.exports = async (client) => {

    // Events
    const eventFiles = await globPromise(`${process.cwd()}/events/*/*.js`);
    eventFiles.map((value) => require(value));

    // Slash Commands
    const slashCommands = await globPromise(
        `${process.cwd()}/SlashCommands/*/*.js`
    );

    const arrayOfSlashCommands = [];
    slashCommands.map((value) => {
        const file = require(value);
        if (!file?.name) return;
        client.slashCommands.set(file.name, file);

        if (["MESSAGE", "USER"].includes(file.type)) delete file.description;
        arrayOfSlashCommands.push(file);
    });
    client.on("ready", async () => {
        // Delete the not defined Slash Commands
        const guilds = await client.guilds.fetch();
        const rest = new REST({ version: "9" }).setToken(token);

        guilds.forEach(guild => {

            rest.get(Routes.applicationGuildCommands(clientID, guild.id))
            .then(data => {
                const promises = [];
    
                for (const command of data) {
                    const deleteUrl = `${Routes.applicationGuildCommands(clientID, guild.id)}/${command.id}`;
                    promises.push(rest.delete(deleteUrl));
                }

                return Promise.all(promises); 
            });
        });

        // Setting up the Slash Commands
        await client.application.commands.set(arrayOfSlashCommands);

        // Status
        console.log(`Script logged in as: ${client.user.tag}!`)
        await client.user.setActivity("/help", {type: "PLAYING"});
    });

    // mongoose
    mongoose.connect(mongodbLink).then(() => console.log("Connected to MongoDB!"));
};