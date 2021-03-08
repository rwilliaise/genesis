package com.alotofletters.genesis;

import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.plugin.java.JavaPlugin;

import javax.websocket.DeploymentException;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Main plugin class.
 */
public final class Genesis extends JavaPlugin implements Listener {

	WebsocketClient client;

	@Override
	public void onEnable() {
		try {
			client = new WebsocketClient(new URI("ws://localhost:8080"));
		} catch (IOException | DeploymentException | URISyntaxException e) {
			e.printStackTrace();
		}
		this.getCommand("setup").setExecutor(new CommandSetup(this.client));
	}

	@EventHandler
	public void onPlayerChat(AsyncPlayerChatEvent event) {
		this.client.sendMessage(event.getPlayer(), event.getMessage());
	}
}
