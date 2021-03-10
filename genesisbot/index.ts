import fs from "fs";
import WebSocket from "ws";
import Discord, {TextChannel} from "discord.js";
import dotenv from "dotenv";
import { Client } from "discord-slash-commands-client";
dotenv.config();

const serverConfig = "./server.json";

const botClient = new Discord.Client();
const interactionClient = new Client(process.env.DISCORD_TOKEN!, process.env.DISCORD_ID!);
const server = new WebSocket.Server({ port: 8080 });

type Webhook = { token: string, id: string }

/** A map that contains code -> channel */
const serverSetupMap: Map<string, string> = new Map();
/** A map that is saved between sessions, contains channel -> ip */
const serverMap: Map<string, string> = new Map();
/** A map that is saved between sessions, contains ip -> webhook */
const webhookMap: Map<string, Webhook> = new Map();
/** A map of IPs to websockets */
const currentConnections: Map<string, WebSocket> = new Map();

function addToMap<K, V>(map: Map<K, V>, other: Map<K, V>) {
  for (const [key, value] of other) {
    map.set(key, value);
  }
}

server.on("listening", () => {
  if (fs.existsSync(serverConfig)) {
    const buff = fs.readFileSync(serverConfig);
    const conf = JSON.parse(buff.toString("utf-8"));
    const confServerMap = new Map(conf.servers);
    const confWebhookMap = new Map(conf.webhooks);
    addToMap(serverMap, confServerMap);
    addToMap(webhookMap, confWebhookMap);
  }
  console.log("Finished loading!");
});

server.on("connection", (socket, req) => {
  console.log("Client connected!");
  console.log(req.connection.remoteAddress);
  currentConnections.set(req.connection.remoteAddress!, socket)
  socket.on("message", (message) => {
    console.log("Message received! " + message);
    if (typeof message !== "string") {
      socket.close(400);
      return;
    }
    const data = JSON.parse(message);
    console.log(data.setupCode);
    console.log(serverSetupMap.get(data.setupCode))
    if (data.setupCode && typeof data.setupCode === "string" && serverSetupMap.has(data.setupCode)) {
      console.log("Received setup code! " + data.setupCode);
      const channel = botClient.channels.cache.get(serverSetupMap.get(data.setupCode)!);
      if (!channel?.isText()) {
        throw new Error("Illegal state: channel is not text-based");
      }
      const textChannel = channel as TextChannel;
      textChannel.createWebhook("Genesis Webhook")
        .then(webhook => {
          webhookMap.set(req.connection.remoteAddress!, { token: webhook.token!, id: webhook.id });
          console.log("Webhook created!");
        })
        .catch(console.error)
      serverMap.set(serverSetupMap.get(data.setupCode)!, req.connection.remoteAddress!);
      serverSetupMap.delete(data.setupCode);
      return;
    }
    if (data.content && typeof data.content === "string" && webhookMap.has(req.connection.remoteAddress!)) {
      console.log("Received message! " + data.content);
      console.log(data);
      const webhook = webhookMap.get(req.connection.remoteAddress!)!;
      const webhookClient = new Discord.WebhookClient(webhook.id, webhook.token);
      webhookClient.send(data.content, {
          username: data.player?.name,
          avatarURL: `https://minotar.net/cube/${data.player?.uuid}/300.png` // TODO: config for this
        })
        .catch(console.error)
      webhookClient.destroy();
    }
  });

  socket.on("close", () => {
    currentConnections.delete(req.connection.remoteAddress!);
  });
});

botClient.on("ready", () => {
  if (!fs.existsSync(serverConfig)) {
    interactionClient.createCommand({ name: "setup", description: "Setup your bot!" })
      .then(() => {
          console.log("Commands initialized!")
      })
      .catch(console.error)
  }
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
    serverSetupMap.set(code, interaction.channel_id);
    sendMessage(`Thank you for using Genesis. To complete set up, type \`/setup ${code}\` in your server console.`);
  }
});

botClient.on("message", (message) => {
  if (serverMap.has(message.channel.id) && currentConnections.has(serverMap.get(message.channel.id)!) && !message.author.bot) {
    const websocket = currentConnections.get(serverMap.get(message.channel.id)!)!;
    botClient.guilds.fetch(message.guild?.id!)
      .then(guild => guild.member(message.author.id))
      .then(member => member?.displayName)
      .then(name => {
        websocket.send(JSON.stringify({
          player: {
            name: name || message.author.username
          },
          content: message.cleanContent, code: 200
        }));
      });
  }
});

botClient.login(process.env.DISCORD_TOKEN)
  .catch((err) => {
    console.log(`Failed to log in! ${err || "<NULL>"}`)
  });

process.on("SIGINT", () => {
  server.close();
  botClient.destroy();

  const json = JSON.stringify({ servers: [...serverMap], webhooks: [...webhookMap] });
  fs.writeFileSync(serverConfig, json, {
    encoding: "utf-8"
  });

  process.exit(0);
})
