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

const NotificationItem: React.FC<
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
    openMenu,
    setOpenMenu,
  ] = useState(false);

  const [
    isSeen,
    setIsSeen,
  ] = useState(
    notification.seen
  );

  const [
    responding,
    setResponding,
  ] = useState(false);

  const markSeen =
    async () => {
      if (
        notification.seen ||
        isSeen
      ) {
        return true;
      }

      const result =
        await updateStatusNotification(
          notification
        );

      if (
        result.success
      ) {
        setIsSeen(true);

        onNotificationSeen?.(
          notification.id
        );

        return true;
      }

      return false;
    };

  const onOpenNotification =
    async () => {
      if (
        isFollowRequest
      ) {
        await markSeen();
        return;
      }

      const marked =
        await markSeen();

      if (
        !marked ||
        !postId
      ) {
        return;
      }

      /*
       * Navigation'i render sırasında
       * çalıştırmıyoruz.
       */
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

  const onAcceptFollow =
    async () => {
      if (
        !requestId ||
        responding
      ) {
        return;
      }

      setResponding(
        true
      );

      try {
        const result =
          await respondToFollowRequest(
            requestId,
            true
          );

        if (
          !result.success
        ) {
          return;
        }

        await markSeen();

        onDeleteNotification(
          notification.id
        );
      } finally {
        setResponding(
          false
        );
      }
    };

  const onRejectFollow =
    async () => {
      if (
        !requestId ||
        responding
      ) {
        return;
      }

      setResponding(
        true
      );

      try {
        const result =
          await respondToFollowRequest(
            requestId,
            false
          );

        if (
          !result.success
        ) {
          return;
        }

        await markSeen();

        onDeleteNotification(
          notification.id
        );
      } finally {
        setResponding(
          false
        );
      }
    };

  return (
    <TouchableOpacity
      onPress={
        onOpenNotification
      }
      disabled={
        openMenu ||
        responding
      }
      style={[
        styles.container,
        isSeen &&
          styles.seenContainer,
      ]}
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
            styles.topTextRow
          }
        >
          <Text
            style={
              styles.text
            }
            numberOfLines={1}
          >
            {notification
              .sender
              .name ||
              "Unknown"}
          </Text>

          <Text
            style={[
              styles.text,
              styles.dateText,
            ]}
          >
            {" "}
            -{" "}
            {getFormattedDate(
              notification.created_at
            )}
          </Text>
        </View>

        <Text
          style={[
            styles.text,
            styles.titleText,
          ]}
        >
          {notification.title}
        </Text>

        {isFollowRequest && (
          <View
            style={
              styles.requestActions
            }
          >
            <Pressable
              onPress={
                onAcceptFollow
              }
              disabled={
                responding
              }
              style={
                styles.acceptButton
              }
            >
              <Text
                style={
                  styles.acceptText
                }
              >
                {responding
                  ? "..."
                  : "Kabul et"}
              </Text>
            </Pressable>

            <Pressable
              onPress={
                onRejectFollow
              }
              disabled={
                responding
              }
              style={
                styles.rejectButton
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

      <View
        style={
          styles.moreIconContainer
        }
      >
        <TouchableOpacity
          onPress={() =>
            setOpenMenu(
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
        </TouchableOpacity>

        {openMenu && (
          <View
            style={
              styles.menu
            }
          >
            {!isSeen && (
              <Pressable
                onPress={async () => {
                  await markSeen();
                  setOpenMenu(
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
                  strokeWidth={2}
                />
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setOpenMenu(
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
                strokeWidth={2}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                setOpenMenu(
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
                strokeWidth={2}
              />
            </Pressable>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      gap: 12,
      backgroundColor:
        "white",
      borderWidth: 0.5,
      padding: 14,
      borderRadius:
        theme.radius.xxl,
      borderCurve:
        "continuous",
      position:
        "relative",
    },

    seenContainer: {
      backgroundColor:
        theme.colors.gray,
      borderWidth: 0,
    },

    nameTitle: {
      flex: 1,
      gap: 4,
    },

    topTextRow: {
      flexDirection:
        "row",
    },

    text: {
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.medium,
      color:
        theme.colors.text,
    },

    dateText: {
      color:
        theme.colors.textLight,
    },

    titleText: {
      color:
        theme.colors.textDark,
      fontWeight:
        theme.fonts.bold,
    },

    moreIconContainer: {
      alignSelf:
        "stretch",
      justifyContent:
        "center",
    },

    menu: {
      position:
        "absolute",
      right: 0,
      top: 38,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor:
        "white",
      borderRadius:
        theme.radius.xl,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      elevation: 5,
      zIndex: 20,
    },

    menuItem: {
      width: 34,
      height: 34,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    requestActions: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 8,
    },

    acceptButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius:
        theme.radius.md,
      backgroundColor:
        theme.colors.primary,
    },

    acceptText: {
      color: "white",
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.semibold,
    },

    rejectButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
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
  });
