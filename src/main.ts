import { type Plugin } from "@crowbartools/firebot-types";
import userSfxManager from "./userSfxManager";
import playSfxEffect from "./play-sfx-effect";
import resetSfxEffect from "./reset-sfx-effect";

const plugin: Plugin = {
  manifest: {
    name: "User SFX",
    description: "Plugin for handling per-viewer entry sound files.",
    author: "DennisOnTheInternet",
    version: PLUGIN_VERSION,
    repo: "https://github.com/dennisrijsdijk/firebot-plugin-user-sfx",
    icon: {
      type: "font-awesome",
      name: "fa-waveform"
    }
  },
  registers: {
    effects: [ playSfxEffect, resetSfxEffect ],
    frontendListeners: [
      {
        eventName: "dennisontheinternet:user-sfx:get-twitch-users",
        useAsync: true,
        handler: async () => userSfxManager.getAllTwitchUsers()
      },
      {
        eventName: "dennisontheinternet:user-sfx:set-user",
        useAsync: true,
        handler: async (...args) => {
          const id = args[0] as string;
          const user = args[1] as UserSfx;
          return userSfxManager.setUserSfx(id, user)
        }
      },
      {
        eventName: "dennisontheinternet:user-sfx:delete-user",
        useAsync: true,
        handler: async (id) => userSfxManager.deleteUser(id as string)
      }
    ]
  },
  async onLoad() {
    await userSfxManager.migrateAndLoadDatabase();
  }
}

export default plugin;
