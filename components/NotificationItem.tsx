import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, {
  useState,
} from "react";
import {
  Notification,
  updateStatusNotification,
  getNotificationData,
} from "@/services/notificationService";
import { theme } from "@/constants/theme";
import { Router } from "expo-router";
import Avatar from "./Avatar";
import {
  getFormattedDate,
  hp,
} from "@/helpers/common";
import Icon from "@/assets/icons";
import {
  respondToFollowRequest,
} from "@/services/followService";

interface NotificationItemProps {
  notification: Notification;
  router: Router;
  onDeleteNotification: (
    id: string
  ) => void;
  onNotificationSeen?: (
    id: string
  ) => void;
}

const NotificationItem:
  React.FC<
    NotificationItemProps
  > = ({
    notification,
    router,
    onDeleteNotification,
    onNotificationSeen,
  }) => {
    const data =
      getNotificationData(
        notification
      );

    const type =
      data?.type || "";

    const isFollowRequest =
      type ===
        "follow_request" ||
      type ===
        "followRequest";

    const requestId =
      data?.requestId;

    const postId =
      data?.postId;

    const commentId =
      data?.commentId;

    const [
      menuOpen,
      setMenuOpen,
    ] = useState(false);

    const [
      seen,
      setSeen,
    ] = useState(
      notification.seen
    );

    const [
      loadingAction,
      setLoadingAction,
    ] = useState(false);

    const markSeen =
      async () => {
        if (
          seen ||
          notification.seen
        ) {
          setSeen(true);
          return true;
        }

        const result =
          await updateStatusNotification(
            notification
          );

        if (
          result.success
        ) {
          setSeen(true);

          onNotificationSeen?.(
            notification.id
          );

          return true;
        }

        return false;
      };

    const openNotification =
      async () => {
        /*
         * Follow request:
         * Bildirime basmak sadece
         * okunmuş yapar.
         */
        if (
          isFollowRequest
        ) {
          await markSeen();
          return;
        }

        /*
         * Post notification:
         * Önce seen yap, sonra navigation.
         */
        const marked =
          await markSeen();

        if (
          !marked ||
          !postId
        ) {
          return;
        }

        setTimeout(() => {
          router.push({
            pathname:
              "/postDetails",
            params: {
              postId:
                String(
                  postId
                ),
              ...(commentId
                ? {
                    commentId:
                      String(
                        commentId
                      ),
                  }
                : {}),
            },
          });
        }, 0);
      };

    const acceptRequest =
      async () => {
        if (
          !requestId ||
          loadingAction
        ) {
          return;
        }

        setLoadingAction(
          true
        );

        try {
          const result =
            await respondToFollowRequest(
              requestId,
              true
            );

          if (
            result.success
          ) {
            await markSeen();

            onDeleteNotification(
              notification.id
            );
          } else {
            console.warn(
              "Follow request accept failed:",
              result.message
            );
          }
        } finally {
          setLoadingAction(
            false
          );
        }
      };

    const rejectRequest =
      async () => {
        if (
          !requestId ||
          loadingAction
        ) {
          return;
        }

        setLoadingAction(
          true
        );

        try {
          const result =
            await respondToFollowRequest(
              requestId,
              false
            );

          if (
            result.success
          ) {
            await markSeen();

            onDeleteNotification(
              notification.id
            );
          } else {
            console.warn(
              "Follow request reject failed:",
              result.message
            );
          }
        } finally {
          setLoadingAction(
            false
          );
        }
      };

    return (
      <View
        style={[
          styles.container,
          seen &&
            styles.seenContainer,
        ]}
      >
        <TouchableOpacity
          style={
            styles.mainTouchable
          }
          onPress={
            openNotification
          }
          disabled={
            loadingAction
          }
        >
          <Avatar
            uri={
              notification
                .sender
                .image
            }
            size={hp(5.5)}
            rounded={18}
          />

          <View
            style={
              styles.nameTitle
            }
          >
            <View
              style={
                styles.topRow
              }
            >
              <Text
                style={
                  styles.name
                }
                numberOfLines={1}
              >
                {notification
                  .sender
                  .name ||
                  "Unknown"}
              </Text>

              <Text
                style={
                  styles.date
                }
              >
                {" "}
                -{" "}
                {getFormattedDate(
                  notification.created_at
                )}
              </Text>
            </View>

            <Text
              style={
                styles.title
              }
            >
              {
                notification.title
              }
            </Text>

            {isFollowRequest && (
              <View
                style={
                  styles.actions
                }
              >
                <Pressable
                  onPress={
                    acceptRequest
                  }
                  disabled={
                    loadingAction
                  }
                  style={
                    styles.accept
                  }
                >
                  <Text
                    style={
                      styles.acceptText
                    }
                  >
                    {loadingAction
                      ? "..."
                      : "Kabul et"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={
                    rejectRequest
                  }
                  disabled={
                    loadingAction
                  }
                  style={
                    styles.reject
                  }
                >
                  <Text
                    style={
                      styles.rejectText
                    }
                  >
                    Sil
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View
          style={
            styles.menuContainer
          }
        >
          <Pressable
            onPress={() =>
              setMenuOpen(
                (value) =>
                  !value
              )
            }
          >
            <Icon
              name="threeDotsHorizontal"
              color={
                theme.colors.dark
              }
              strokeWidth={4}
            />
          </Pressable>

          {menuOpen && (
            <View
              style={
                styles.menu
              }
            >
              {!seen && (
                <Pressable
                  onPress={async () => {
                    await markSeen();
                    setMenuOpen(
                      false
                    );
                  }}
                  style={
                    styles.menuItem
                  }
                >
                  <Icon
                    name="eyeOff"
                    color={
                      theme.colors.dark
                    }
                  />
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  setMenuOpen(
                    false
                  );
                  onDeleteNotification(
                    notification.id
                  );
                }}
                style={
                  styles.menuItem
                }
              >
                <Icon
                  name="delete"
                  color={
                    theme.colors
                      .roseLight
                  }
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  setMenuOpen(
                    false
                  )
                }
                style={
                  styles.menuItem
                }
              >
                <Icon
                  name="cancel"
                  color={
                    theme.colors.dark
                  }
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

export default NotificationItem;

const styles =
  StyleSheet.create({
    container: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "white",
      borderWidth: 0.5,
      padding: 14,
      borderRadius:
        theme.radius.xxl,
      position:
        "relative",
    },

    seenContainer: {
      backgroundColor:
        theme.colors.gray,
      borderWidth: 0,
    },

    mainTouchable: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
    },

    nameTitle: {
      flex: 1,
      gap: 4,
    },

    topRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    name: {
      flexShrink: 1,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors.text,
    },

    date: {
      fontSize:
        hp(1.4),
      color:
        theme.colors
          .textLight,
    },

    title: {
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors
          .textDark,
    },

    actions: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 8,
    },

    accept: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius:
        theme.radius.md,
      backgroundColor:
        theme.colors
          .primary,
    },

    acceptText: {
      color: "white",
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.bold,
    },

    reject: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius:
        theme.radius.md,
      backgroundColor:
        "white",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    rejectText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.semibold,
    },

    menuContainer: {
      width: 32,
      alignItems:
        "flex-end",
      justifyContent:
        "center",
    },

    menu: {
      position:
        "absolute",
      right: 0,
      top: 35,
      flexDirection:
        "row",
      gap: 10,
      padding: 10,
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        "white",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      elevation: 6,
      zIndex: 100,
    },

    menuItem: {
      width: 32,
      height: 32,
      alignItems:
        "center",
      justifyContent:
        "center",
    },
  });
