import firebot from "@crowbartools/firebot-types";
import { type HelixUser } from "@twurple/api";

export async function getTwitchUsers(ids: string[]) {
    const results: HelixUser[] = [];
    do {
        results.push(...await firebot.twitch.api.users.getUsersByIds(ids.splice(0, 100)));
    } while (ids.length > 0)
    return results;
}
