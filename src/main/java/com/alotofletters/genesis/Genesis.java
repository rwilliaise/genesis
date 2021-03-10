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
		ClassLoader originalClassLoader = Thread.currentThread().getContextClassLoader();

		// this hack is so bad, god damn ada lovelace is rolling in her grave
		// TODO: dont
		try {
			Thread.currentThread().setContextClassLoader(Genesis.class.getClassLoader());
			client = new WebsocketClient(new URI("ws://127.0.0.1:8080"));
		} catch (IOException | DeploymentException | URISyntaxException e) {
			e.printStackTrace();
		} finally {
			Thread.currentThread().setContextClassLoader(originalClassLoader);
		}
		this.getCommand("setup").setExecutor(new CommandSetup(this.client));
		this.getServer().getPluginManager().registerEvents(this, this);
	}

	@EventHandler
	public void onPlayerChat(AsyncPlayerChatEvent event) {
		this.client.sendMessage(event.getPlayer(), event.getMessage());
	}
}
