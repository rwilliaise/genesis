package com.alotofletters.genesis;

import com.google.gson.Gson;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import javax.websocket.*;
import java.io.IOException;
import java.net.URI;

@ClientEndpoint
public class WebsocketClient {

	private static final Gson GSON = new Gson();
	private Session currentSession = null;

	public WebsocketClient(URI server) throws IOException, DeploymentException {
		WebSocketContainer container = ContainerProvider.getWebSocketContainer();
		container.connectToServer(this, server);
	}

	@OnOpen
	public void onOpen(Session session) {
		this.currentSession = session;
	}

	@OnClose
	public void onClose() {
		this.currentSession = null;
	}

	@OnMessage
	public void onMessage(String string) {
		Message message = GSON.fromJson(string, Message.class);
		if (message.code != 200) {
			System.out.printf("Illegal response! Code %s, with a error of %s.", message.code, message.err);
			return;
		}
		Bukkit.getServer().broadcastMessage(String.format("[D] <%s> %s", message.player.name, message.content));
	}

	public void sendMessage(Player player, String message) {
		if (this.currentSession == null) {
			return;
		}
		MessagePlayer messagePlayer = new MessagePlayer(player);
		this.currentSession.getAsyncRemote().sendText(GSON.toJson(new Message(messagePlayer, message))); // agh wtf
	}

	/**
	 * Send a setup message over to the bot
	 * @param code Code for the setup
	 */
	public void sendSetup(String code) {
		SetupMessage message = new SetupMessage(code);
		this.currentSession.getAsyncRemote().sendText(GSON.toJson(message));
	}
}

/**
 * Used for setup command
 */
class SetupMessage {
	String setupCode;

	public SetupMessage() {}

	public SetupMessage(String code) {
		this.setupCode = code;
	}
}

class Message {
	MessagePlayer player;
	String content;
	String err;

	int code;

	public Message() {}

	public Message(MessagePlayer player, String content) {
		this.player = player;
		this.content = content;
	}
}

class MessagePlayer {
	String uuid;
	String name;

	public MessagePlayer() {}

	public MessagePlayer(Player player) {
		this.uuid = player.getUniqueId().toString();
		this.name = player.getDisplayName();
	}
}
