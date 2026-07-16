import firebot from "@crowbartools/firebot-types";
import { getTwitchUsers } from "./twitchApi";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, rm, mkdir, writeFile } from "node:fs/promises";

class UserSfxManager {
    private _playedUsers: string[] = [];
    private _users: Record<string, UserSfx> = {};

    private _dataFolder = path.join(firebot.storage.path, "..", "user-sfx");
    private _playedUsersPath = path.join(this._dataFolder, "played-users.json");
    private _usersPath = path.join(this._dataFolder, "user-sfx.json");

    public async migrateAndLoadDatabase() {
        if (!existsSync(path.join(this._dataFolder))) {
            await mkdir(this._dataFolder, { recursive: true });
        }

        const oldDatabasePath = path.join(firebot.storage.path, "..", "..", "db", "userSfx.db");
        if (!existsSync(oldDatabasePath)) {
            return this.loadDatabase();
        }

        const legacyUserDatabase: { lastReset: number; users: Record<string, LegacyUserSfx>; } = JSON.parse((await readFile(oldDatabasePath)).toString());
        for (const [id, sfx] of Object.entries(legacyUserDatabase.users)) {
            if (sfx.lastRedemption > legacyUserDatabase.lastReset) {
                this._playedUsers.push(id);
            }

            this._users[id] = {
                volume: sfx.volume,
                path: sfx.path
            };
        }

        await this.savePlayedUsers();
        await this.saveUsers();

        await rm(oldDatabasePath);
    }

    private async savePlayedUsers() {
        await writeFile(this._playedUsersPath, JSON.stringify(this._playedUsers));
    }

    private async saveUsers() {
        await writeFile(this._usersPath, JSON.stringify(this._users));
    }

    private async loadDatabase() {
        if (!existsSync(this._playedUsersPath)) {
            await writeFile(this._playedUsersPath, JSON.stringify(this._playedUsers));
        } else {
            this._playedUsers = JSON.parse((await readFile(this._playedUsersPath)).toString());
        }

        if (!existsSync(this._usersPath)) {
            await writeFile(this._usersPath, JSON.stringify(this._users));
        } else {
            this._users = JSON.parse((await readFile(this._usersPath)).toString());
        }
    }

    public async getAllTwitchUsers(): Promise<Record<string, TwitchUserSfx> | null> {
        try {
            if (Object.keys(this._users).length === 0) {
                return {};
            }
            const twitchUsers = await getTwitchUsers(Object.keys(this._users));
            return Object.fromEntries(twitchUsers.map((twitchUser) => {
                const userSfx = this._users[twitchUser.id];
                let name = twitchUser.displayName;
                if (twitchUser.displayName.toLowerCase() !== twitchUser.name.toLowerCase()) {
                    name = `${name} (${twitchUser.name})`;
                }
                const twitchUserSfx: TwitchUserSfx = {
                    name,
                    icon: twitchUser.profilePictureUrl,
                    path: userSfx.path,
                    volume: userSfx.volume
                }

                return [twitchUser.id, twitchUserSfx];
            }));
        } catch (err) {
            firebot.logger.error("error while retrieving Twitch users", err);
            return null;
        }
    }

    public async deleteUser(id: string) {
        delete this._users[id];
        const playedUserIndex = this._playedUsers.findIndex(stored => stored === id);
        if (playedUserIndex >= 0) {
            this._playedUsers.splice(playedUserIndex);
            await this.savePlayedUsers();
        }
        await this.saveUsers();
    }

    public getUserSfx(id: string): UserSfx | undefined {
        return structuredClone(this._users[id]);
    }

    public async setUserSfx(id: string, sfx: UserSfx) {
        this._users[id] = structuredClone(sfx);
        await this.saveUsers();
    }

    public async trySetUserPlayed(id: string): Promise<boolean> {
        if (this._playedUsers.includes(id)) {
            return false;
        }

        this._playedUsers.push(id);
        await this.savePlayedUsers();
        return true;
    }

    public async reset() {
        this._playedUsers = [];
        await this.savePlayedUsers();
    }
}

export default new UserSfxManager();