import { supabase } from "@/lib/supabase";
import { APIResponse } from "./userService";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Platform,
} from "react-native";
import { PermissionStatus } from "expo-modules-core";
import Constants from "expo-constants";
import { theme } from "@/constants/theme";

const SERVICE_NAME =
  "Notification Service";

Notifications.setNotificationHandler({
  handleNotification:
    async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

export interface Notification {
  id: string;
  senderId: string;
  receiverId: string;
  title: string;
  data: string;
  seen: boolean;
  created_at: string;
  sender: {
    id: string;
    name: string;
    image: string;
  };
}

export interface NotificationBody {
  senderId: string;
  receiverId: string;
  title: string;
  data: string;
}

const jsonData = (
  notification: Notification
): Record<string, any> => {
  try {
    const parsed =
      JSON.parse(
        notification.data || "{}"
      );

    return parsed &&
      typeof parsed ===
        "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
};

export const getNotificationData =
  (
    notification: Notification
  ) => {
    return jsonData(
      notification
    );
  };

export const createNotification =
  async (
    body: NotificationBody
  ): Promise<APIResponse> => {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from("notifications")
          .insert(body)
          .select(
            `*,
             sender:senderId(
               id,
               name,
               image
             )`
          )
          .single();

      if (error) {
        console.warn(
          `${SERVICE_NAME} - create notification | ${error.message}`
        );

        return {
          success: false,
          message:
            "Bildirim oluşturulamadı.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Bildirim oluşturuldu.",
        data:
          data as Notification,
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - create notification | ${error}`
      );

      return {
        success: false,
        message:
          "Bildirim oluşturulamadı.",
        data: null,
      };
    }
  };

export const updateStatusNotification =
  async (
    notification: Notification
  ): Promise<APIResponse> => {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .from("notifications")
          .update({
            seen: true,
          })
          .eq(
            "id",
            notification.id
          )
          .eq(
            "receiverId",
            notification.receiverId
          )
          .select(
            `*,
             sender:senderId(
               id,
               name,
               image
             )`
          )
          .maybeSingle();

      if (error) {
        console.warn(
          `${SERVICE_NAME} - update notification | ${error.message}`
        );

        return {
          success: false,
          message:
            "Bildirim durumu güncellenemedi.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Bildirim okundu.",
        data:
          data as Notification,
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - update notification | ${error}`
      );

      return {
        success: false,
        message:
          "Bildirim durumu güncellenemedi.",
        data: null,
      };
    }
  };

export const markAllNotificationsSeen =
  async (
    userId: string
  ): Promise<APIResponse> => {
    try {
      const {
        error,
      } =
        await supabase
          .from("notifications")
          .update({
            seen: true,
          })
          .eq(
            "receiverId",
            userId
          )
          .eq(
            "seen",
            false
          );

      if (error) {
        console.warn(
          `${SERVICE_NAME} - mark all seen | ${error.message}`
        );

        return {
          success: false,
          message:
            "Bildirimler okunamadı.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Bildirimler okundu.",
        data: null,
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - mark all seen | ${error}`
      );

      return {
        success: false,
        message:
          "Bildirimler okunamadı.",
        data: null,
      };
    }
  };

export const getNotifications =
  async (
    userId: string,
    getAll = true
  ): Promise<APIResponse> => {
    try {
      const query =
        supabase
          .from("notifications")
          .select(
            `*,
             sender:senderId(
               id,
               name,
               image
             )`
          )
          .eq(
            "receiverId",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      const {
        data,
        error,
      } =
        getAll
          ? await query
          : await query.eq(
              "seen",
              false
            );

      if (error) {
        console.warn(
          `${SERVICE_NAME} - get notifications | ${error.message}`
        );

        return {
          success: false,
          message:
            "Bildirimler alınamadı.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Bildirimler alındı.",
        data:
          (data ||
            []) as Notification[],
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - get notifications | ${error}`
      );

      return {
        success: false,
        message:
          "Bildirimler alınamadı.",
        data: null,
      };
    }
  };

export const removeNotification =
  async (
    notificationId: string
  ): Promise<APIResponse> => {
    try {
      const {
        error,
      } =
        await supabase
          .from("notifications")
          .delete()
          .eq(
            "id",
            notificationId
          );

      if (error) {
        return {
          success: false,
          message:
            "Bildirim silinemedi.",
          data: null,
        };
      }

      return {
        success: true,
        message:
          "Bildirim silindi.",
        data:
          notificationId,
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - remove notification | ${error}`
      );

      return {
        success: false,
        message:
          "Bildirim silinemedi.",
        data: null,
      };
    }
  };

export interface PushNotifcationState {
  notification?: Notifications.Notification;
  expoPushToken?: Notifications.ExpoPushToken;
}

export const usePushNotifications =
  (): PushNotifcationState => {
    Notifications.setNotificationHandler(
      {
        handleNotification:
          async () => ({
            shouldShowAlert:
              true,
            shouldPlaySound:
              false,
            shouldSetBadge:
              false,
          }),
      }
    );

    const [
      expoPushToken,
      setExpoPushToken,
    ] =
      useState<
        Notifications.ExpoPushToken |
        undefined
      >();

    const [
      notification,
      setNotification,
    ] =
      useState<
        Notifications.Notification |
        undefined
      >();

    const notificationListener =
      useRef<
        Notifications.EventSubscription
      >();

    const responseListener =
      useRef<
        Notifications.EventSubscription
      >();

    async function registerForNotificationsAsync() {
      if (!Device.isDevice) {
        return undefined;
      }

      const {
        status:
          existingStatus,
      } =
        await Notifications.getPermissionsAsync();

      let finalStatus =
        existingStatus;

      if (
        existingStatus !==
        PermissionStatus.GRANTED
      ) {
        const {
          status,
        } =
          await Notifications.requestPermissionsAsync();

        finalStatus =
          status;
      }

      if (
        finalStatus !==
        PermissionStatus.GRANTED
      ) {
        return undefined;
      }

      const projectId =
        Constants
          ?.expoConfig
          ?.extra
          ?.eas
          ?.projectId ??
        Constants
          ?.easConfig
          ?.projectId;

      if (!projectId) {
        throw new Error(
          "Project ID not found"
        );
      }

      const token =
        await Notifications.getExpoPushTokenAsync(
          {
            projectId,
          }
        );

      if (
        Platform.OS ===
        "android"
      ) {
        await Notifications.setNotificationChannelAsync(
          "default",
          {
            name: "default",
            importance:
              Notifications
                .AndroidImportance
                .MAX,
            vibrationPattern:
              [
                0,
                250,
                250,
                250,
              ],
            lightColor:
              theme.colors
                .primary,
          }
        );
      }

      return token;
    }

    useEffect(() => {
      registerForNotificationsAsync()
        .then((token) => {
          setExpoPushToken(
            token
          );
        })
        .catch(
          (error) => {
            console.warn(
              `${SERVICE_NAME} - Notification registration error`,
              error
            );
          }
        );

      notificationListener.current =
        Notifications.addNotificationReceivedListener(
          (
            incomingNotification
          ) => {
            setNotification(
              incomingNotification
            );
          }
        );

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(
          (
            response
          ) => {
            console.log(
              `${SERVICE_NAME} - Notification response`,
              response
            );
          }
        );

      return () => {
        if (
          notificationListener.current
        ) {
          Notifications.removeNotificationSubscription(
            notificationListener.current
          );
        }

        if (
          responseListener.current
        ) {
          Notifications.removeNotificationSubscription(
            responseListener.current
          );
        }
      };
    }, []);

    return {
      expoPushToken,
      notification,
    };
  };

export const pushNotification =
  async (
    expo_push_token: string,
    userName: string,
    message: string
  ): Promise<APIResponse> => {
    try {
      if (!expo_push_token) {
        return {
          success: false,
          message:
            "Expo push token bulunamadı.",
          data: null,
        };
      }

      const response =
        await fetch(
          "https://exp.host/--/api/v2/push/send",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                to:
                  expo_push_token,
                sound:
                  "default",
                title:
                  "Nysapp",
                body: `${userName} ${message}`,
                data: {
                  type:
                    "notification",
                },
              }
            ),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        return {
          success: false,
          message:
            "Push bildirimi gönderilemedi.",
          data:
            result,
        };
      }

      return {
        success: true,
        message:
          "Push bildirimi gönderildi.",
        data:
          result,
      };
    } catch (error) {
      console.warn(
        `${SERVICE_NAME} - Push error`,
        error
      );

      return {
        success: false,
        message:
          "Push bildirimi gönderilemedi.",
        data: null,
      };
    }
  };
