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
		MessagePlayer messagePlayer = new MessagePlayer(player);
		System.out.println("Sending message with content: " + message);
		try {
			this.currentSession.getBasicRemote().sendText(GSON.toJson(new Message(messagePlayer, message))); // agh wtf
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	/**
	 * Send a setup message over to the bot
	 * @param code Code for the setup
	 */
	public void sendSetup(String code) {
		SetupMessage message = new SetupMessage(code);
		System.out.println("Sending setup message with code: " + code);
		try {
			this.currentSession.getBasicRemote().sendText(GSON.toJson(message));
		} catch (IOException e) {
			e.printStackTrace();
		}
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
