package com.alotofletters.genesis;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class CommandSetup implements CommandExecutor {

	private final WebsocketClient client;

	public CommandSetup(WebsocketClient client) {
		this.client = client;
	}

	@Override
	public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
		if (sender instanceof Player) {
			sender.sendMessage("Sorry! Due to security issues, this command needs to be ran from the console.");
			sender.sendMessage("Contact your server admin to set this up for you.");
			return false;
		}
		System.out.println("Break");
		if (args.length != 1) {
			return false;
		}
		System.out.println("Breakest");
		client.sendSetup(args[0]);
		return true;
	}
}
