# Purpose
So this Obsidian plugin currently supports creating "custom soundscape" where the user can input YouTube video ID links which will play in a playlist.

This needs to change. Instead of relying on YouTube, we must create new playlists that come directly from a folder. A playlist has: a name, and a folder. All .mp3 files inside the folder will play.

Basically, completely remove the YouTube feature and make it all completely local.

# How Folder Pathing Works
The way that the plugin paths through folders is through a complete directory. For example I will have to input "C:\Users\Mikhail\Documents\_ebook\_Personal\_Fallen Down\Engine\Soundtrack" in order to get the music files from the _Fallen Down vault.

This is a problem. I know Obsidian's capable of giving a list of folders inside the vault and that can act as the path. I want that, the Obsidian-integrated method; instead of the full path.

# What to do
So I'm gonna be honest. I have no idea how this plugin really works. Your job is to look at what I've written here and figure out how to implement this.

Make another markdown file that's a checklist of what needs to be done specifically and so that we can track progress across future chats, and weaker models (like Gemini 3 Flash) should be perfectly capable of understanding exactly what needs to change and where. Make the objectives and purposes clear, and divide the implementation plan into phases that can be executed one-by-one.

Determine the most efficient way possible to implement this with future maintenance of code in mind. Do not let it be spaghetti code that's hard to maintain. You are free to suggest changes into what must be optimized and what can be restructured in the code, for the sake of maintenance.