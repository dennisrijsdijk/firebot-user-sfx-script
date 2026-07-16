import { EffectType } from "@crowbartools/firebot-types";
import sfxManager from "./userSfxManager";

const effect: EffectType<null> = {
    definition: {
        id: "dennisontheinternet:sfx:reset-sfx",
        name: "Reset User SFX Cooldown",
        description: "Reset Cooldown for User Sound Effects",
        icon: "fad fa-waveform",
        categories: ["twitch"]
    },
    optionsTemplate: "",
    optionsController: () => null,
    optionsValidator: () => [],
    onTriggerEvent: async (scope) => sfxManager.reset()
}

export default effect;
