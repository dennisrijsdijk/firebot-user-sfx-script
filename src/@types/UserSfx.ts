interface UserSfxGlobalSettings {
    audio: UserSfxAudioSettings;
    users: Record<string, UserSfx>;
}

interface UserSfxAudioSettings {
    deviceLabel: string;
    deviceId: string;
    overlayInstance: string;
}

interface UserSfx {
    path: string;
    volume: number;
}

interface LegacyUserSfx extends UserSfx {
    lastRedemption: number;
}

interface TwitchUserSfx extends UserSfx {
    name: string;
    icon: string;
}
