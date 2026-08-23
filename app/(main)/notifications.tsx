import Header from "@/components/Header";
import Loading from "@/components/Loading";
import NotificationItem from "@/components/NotificationItem";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { hp, wp } from "@/helpers/common";
import {
  getNotifications,
  Notification,
  removeNotification,
  markAllNotificationsSeen,
} from "@/services/notificationService";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";

const NotificationsScreen =
  () => {
    const router =
      useRouter();

    const authContext =
      useAuth();

    if (!authContext) {
      return null;
    }

    const {
      user,
    } = authContext;

    const userId =
      user?.authInfo?.id ||
      "";

    const [
      notifications,
      setNotifications,
    ] =
      useState<
        Notification[]
      >([]);

    const [loading, setLoading] =
      useState(false);

    const [
      refreshing,
      setRefreshing,
    ] =
      useState(false);

    const gettingNotifications =
      useCallback(
        async () => {
          if (!userId) {
            return;
          }

          setLoading(true);

          try {
            const result =
              await getNotifications(
                userId,
                true
              );

            if (
              !result.success
            ) {
              Alert.alert(
                "Thông Bildirim",
                result.message
              );
              return;
            }

            setNotifications(
              result.data || []
            );

            /*
             * Ekran açılır açılmaz
             * okunmamış bildirimleri
             * görsel olarak da sıfırla.
             */
            const unread =
              (
                result.data ||
                []
              ).filter(
                (
                  notification: Notification
                ) =>
                  !notification.seen
              );

            if (
              unread.length > 0
            ) {
              await markAllNotificationsSeen(
                userId
              );

              setNotifications(
                (previous) =>
                  previous.map(
                    (
                      notification
                    ) => ({
                      ...notification,
                      seen:
                        true,
                    })
                  )
              );
            }
          } catch (
            error
          ) {
            console.warn(
              "Notifications load error:",
              error
            );
          } finally {
            setLoading(false);
          }
        },
        [userId]
      );

    useEffect(() => {
      gettingNotifications();
    }, [
      gettingNotifications,
    ]);

    const onRefresh =
      async () => {
        if (refreshing) {
          return;
        }

        setRefreshing(true);

        try {
          await gettingNotifications();
        } finally {
          setRefreshing(false);
        }
      };

    const removingNotification =
      async (
        notificationId: string
      ) => {
        const result =
          await removeNotification(
            notificationId
          );

        if (
          result.success
        ) {
          setNotifications(
            (previous) =>
              previous.filter(
                (
                  notification
                ) =>
                  notification.id !==
                  notificationId
              )
          );
        } else {
          Alert.alert(
            "Bildirim",
            result.message
          );
        }
      };

    const onNotificationSeen =
      (
        notificationId: string
      ) => {
        setNotifications(
          (previous) =>
            previous.map(
              (
                notification
              ) =>
                notification.id ===
                notificationId
                  ? {
                      ...notification,
                      seen: true,
                    }
                  : notification
            )
        );
      };

    return (
      <ScreenWarpper
        bg={
          theme.colors
            .lightGray
        }
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.container
          }
        >
          <Header
            title="Bildirimler"
          />

          {loading ? (
            <View
              style={
                styles.loading
              }
            >
              <Loading />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.listStyle
              }
              refreshControl={
                <RefreshControl
                  refreshing={
                    refreshing
                  }
                  onRefresh={
                    onRefresh
                  }
                  tintColor={
                    theme
                      .colors
                      .primary
                  }
                  colors={[
                    theme
                      .colors
                      .primary,
                  ]}
                />
              }
            >
              {notifications.length ===
              0 ? (
                <Text
                  style={
                    styles.noData
                  }
                >
                  Henüz bildirim
                  yok
                </Text>
              ) : (
                notifications.map(
                  (
                    notification
                  ) => (
                    <NotificationItem
                      key={
                        notification.id
                      }
                      notification={
                        notification
                      }
                      router={
                        router
                      }
                      onDeleteNotification={
                        removingNotification
                      }
                      onNotificationSeen={
                        onNotificationSeen
                      }
                    />
                  )
                )
              )}
            </ScrollView>
          )}
        </View>
      </ScreenWarpper>
    );
  };

export default NotificationsScreen;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(4),
    },

    listStyle: {
      paddingVertical: 20,
      gap: 14,
      flexGrow: 1,
    },

    loading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    noData: {
      marginTop: 30,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts
          .medium,
      color:
        theme.colors
          .text,
      textAlign:
        "center",
    },
  });
