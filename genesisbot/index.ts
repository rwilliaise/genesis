import WebSocket from "ws";
import Discord from "discord.js";
import dotenv from "dotenv";
import { Client } from "discord-slash-commands-client";
dotenv.config();

const botClient = new Discord.Client();
const interactionClient = new Client(process.env.DISCORD_TOKEN!, process.env.DISCORD_ID!);
const server = new WebSocket.Server({ port: 8080 });

/** A map that is saved between sessions, contains code -> channel */
const serverSetupMap: Map<string, string> = new Map();
/** A map that is saved between sessions, contains channel -> ip */
const serverMap: Map<string, string> = new Map();
/** A map of IPs to websockets */
const currentConnections: Map<string, WebSocket> = new Map();

server.on("listening", () => {
  console.log("Started listening!");
});

server.on("connection", (socket, req) => {
  currentConnections.set(req.connection.remoteAddress!, socket)
  socket.on("message", (message) => {
    if (typeof message !== "string") {
      socket.close(400);
      return;
    }
    const data = JSON.parse(message);
    if (data.setupCode && typeof data.setupCode == "string" && serverSetupMap.has(data.setupCode)) {

      return;
    }
  })
});

botClient.on("ready", () => {
  // interactionClient.getCommands().then(console.log);
  // interactionClient.createCommand({ name: "setup", description: "Setup your bot!" })
  //     .then(() => {
  //         console.log("Command initialized!")
  //     })
  console.log("Bot started!");
});

/** generate a random int [min, max] */
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

/** generate a random 6 digit code */
function generateCode(): string {
  const code = rand(100_000, 999_999);
  if (serverSetupMap.has(code.toString())) {
    return generateCode();
  }
  return code.toString();
}

// @ts-ignore
botClient.ws.on("INTERACTION_CREATE", async interaction => {
  function sendMessage(content: string) {
    // @ts-ignore
    botClient.api.interactions(interaction.id, interaction.token).callback.post({
      data: {
        type: 4,
        data: {
          flags: 1 << 6,
          content: content
        }
      }
    }).catch(console.error);
  }

  const command = interaction.data.name.toLowerCase();

  if (command === "setup") {
    if (interaction.user) {
      sendMessage(`Sorry, this command cannot be executed from DM!`);
      return;
    }
    if (interaction.member) {
      const perms = parseInt(interaction.member.permissions || "0");
      if ((perms & 8) === 0 && (perms & 32) === 0) {
        sendMessage(`Sorry, you are lacking permissions to do this!`);
      }
    }
    if (serverMap.has(interaction.channel_id)) {
      sendMessage(`Sorry, however it seems like Genesis is already set up! If this was a mistake, please do **[FUTURE COMMAND]**`);
      return;
    }
    const code = generateCode();
    sendMessage(`Thank you for using Genesis. To complete set up, type \`/setup ${code}\` in your server console.`);
  }
});

botClient.on("message", (message) => {
  if (serverMap.has(message.channel.id) && currentConnections.has(serverMap.get(message.channel.id)!)) {

  }
});

botClient.login(process.env.DISCORD_TOKEN)
  .catch((err) => {
    console.log(`Failed to log in! ${err || "<NULL>"}`)
  });
