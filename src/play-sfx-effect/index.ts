import firebot, { EffectType, FirebotAudioDevice, RunEffectsContext } from "@crowbartools/firebot-types";
import template from './template.html'
import sfxManager from "../userSfxManager";

interface EffectModel {
    audioOutputDevice: {
        deviceId: string;
        label: string;
    };
    overlayInstance?: string;
    activeUser?: string;
}

const effect: EffectType<EffectModel> = {
    definition: {
        id: "dennisontheinternet:sfx:play-sfx",
        name: "Play User SFX",
        description: "play user SFX",
        icon: "fad fa-waveform",
        categories: ["twitch"]
    },
    optionsTemplate: template,
    optionsController: ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
        $scope.sliderTranslate = (value: number) => Math.round(value * 10) + '%';

        $scope.volumeUpdated = (id: string, volume: number) => {
            const user = {
                path: $scope.users[id].path,
                volume: volume
            }
            backendCommunicator.fireEventAsync("dennisontheinternet:user-sfx:set-user", id, user);
        }

        $scope.pathUpdated = (id: string, path: string) => {
            const user = {
                path: path,
                volume: $scope.users[id].volume
            }
            backendCommunicator.fireEventAsync("dennisontheinternet:user-sfx:set-user", id, user);
        };

        $scope.selectionChanged = (id: string) => {
            if ($scope.activeUser === id) {
                return;
            }
            $scope.activeUser = id;
            $scope.effect.activeUser = id;

            $timeout(function () {
                $scope.$broadcast('rzSliderForceRender');
            }, 30);
        };

        $scope.addUser = () => {
            utilityService.openViewerSearchModal(
                {
                    label: "Add Viewer",
                    saveText: "Add",
                    validationFn: (user: any) => {
                        return new Promise(resolve => {
                            if (user == null) {
                                return resolve(false);
                            }

                            if (Object.keys($scope.users).some((id: string) => {
                                return id === user.id;
                            })) {
                                return resolve(false);
                            }
                            resolve(true);
                        });
                    },
                    validationText: "Viewer already has an intro SFX."
                },
                (user: { avatarUrl: string, id: string, username: string, displayName: string }) => {
                    let username: string;
                    if (user.username.toLowerCase() !== user.displayName.toLowerCase()) {
                        username = `${user.displayName} (${user.username})`;
                    } else {
                        username = user.displayName;
                    }
                    $scope.users[user.id] = { name: username, icon: user.avatarUrl, volume: 5, path: "" };
                    backendCommunicator.fireEventAsync("dennisontheinternet:user-sfx:set-user", user.id, $scope.users[user.id]);
                    $scope.selectionChanged(user.id);
                });
        }

        $scope.deleteUser = (id: string) => {
            backendCommunicator.fireEvent("user-sfx:delete-user", id);
            delete $scope.users[id];
            if ($scope.activeUser === id) {
                $scope.activeUser = null;
            }
        }

        $scope.activeUser = null;

        $scope.effect.activeUser = undefined;

        $scope.status = 'fetching';

        if ($scope.effect.audioOutputDevice == null) {
            $scope.effect.audioOutputDevice = {
                deviceId: "overlay",
                label: "Send To Overlay"
            };
            $scope.effect.overlayInstance = undefined;
        }

        $scope.users = {};

        $q.when(backendCommunicator.fireEventAsync("dennisontheinternet:user-sfx:get-twitch-users"))
            .then((result: Record<string, TwitchUserSfx>) => {
                $scope.users = result;
                $scope.status = $scope.users != null ? 'fetched' : 'error';
                $timeout(function () {
                    $scope.$broadcast('rzSliderForceRender');
                }, 30);
            });
    },
    optionsValidator: (effect) => {
        const errors: string[] = [];
        return errors;
    },
    onTriggerEvent: async (event) => {
        let userId = '';
        switch (event.trigger.type) {
            case "command":
                userId = event.trigger.metadata.chatMessage!.userId;
                break;
            case "event":
                if (event.trigger.metadata.event!.id === "chat-message") {
                    userId = event.trigger.metadata.eventData!.chatMessage!.userId;
                } else {
                    firebot.logger.error(`Unknown event '${event.trigger.metadata.event!.id}', expected 'chat-message'`);
                    return false;
                }
                break;
            case "channel_reward":
                userId = event.trigger.metadata.userId as string;
                break;
            case "manual":
                if (event.effect.activeUser == null || event.effect.activeUser === "") {
                    return;
                }
                userId = event.effect.activeUser;
                break;
            default:
                firebot.logger.error("got trigger " + event.trigger.type + ", expected 'command', 'channel_reward' or 'event'.");
                return false;
        }

        const user = sfxManager.getUserSfx(userId);
        if (user == null) {
            return;
        }

        if (event.trigger.type !== "manual") {
            if (!await sfxManager.trySetUserPlayed(userId)) {
                return;
            }
        }

        const firebotSoundEffectModel: {
            soundType: "local";
            volume: number;
            filepath: string;
            overlayInstance?: string;
            audioOutputDevice: FirebotAudioDevice;
            waitForSound: boolean;
        } = {
            soundType: "local",
            volume: user.volume,
            filepath: user.path,
            overlayInstance: event.effect.overlayInstance,
            audioOutputDevice: event.effect.audioOutputDevice,
            waitForSound: true
        };

        const runEffectsContext: RunEffectsContext = {
            trigger: event.trigger,
            effects: {
                id: crypto.randomUUID(),
                list: [
                    {
                        id: crypto.randomUUID(),
                        type: "firebot:playsound",
                        ...firebotSoundEffectModel
                    }
                ]
            }
        }

        await firebot.effects.processEffects(runEffectsContext);

        return;
    }
}

export default effect;
