# snipesync
This is a very quickly hacked together bot designed specifically for a Tetris community event, the **Hard Drop Tetris 99 Super Lobby**. The bot provides synchronised countdowns in multiple Twitch channel chats to aid players in joining the same public lobby.

Tetris 99 later added a private lobby feature, which largely renders the bot redundant. As such, I'm not planning to clean up the code or add more improvements, but the repository will remain available in case anyone needs a simultaneous multi-stream chat countdown for some other purpose. If you would like to adapt the code, be aware that my Twitch username is hardcoded and should be replaced with your own.

## Commands
Most commands can only be used by the hardcoded owners. Participating streamers can opt in and out of countdowns.

`!scd [minutes]`: Start a synced countdown across all participating channels. If minutes are provided, the bot will count down to when the clock next hits xx minutes. If a room password has been set, it'll be included in the last few countdown messages.  
`!scancel`: Cancel the current countdown.  
`!spass [password]`: Set a room password to be distributed.  
`!sclearpass`: Remove the set password.  
`!snow [password]`: Broadcast an immediate lobby start without a countdown. If a password is supplied, it'll be shown in the broadcast message; otherwise the currently set password from !spass is used.  
`!sinvite [channel]`: Make the bot join another stream and introduce itself briefly.  
`!sjoin`: Opt in to countdowns.  
`!sleave`: Opt out.  
`!slist`: List participating channels.  
`!sannounce [message]`: Broadcast a message to all participating streams.
