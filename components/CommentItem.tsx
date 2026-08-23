import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import React from "react";

import {
  useRouter,
} from "expo-router";

import {
  theme,
} from "@/constants/theme";

import {
  getFormattedDate,
  hp,
} from "@/helpers/common";

import Avatar from "./Avatar";
import Icon from "@/assets/icons";

import {
  Comment,
} from "@/services/postService";

export interface CommentItemProps {
  comment: Comment;
  isCommentOwner?: boolean;
  removingComment: (
    item: any
  ) => void;
  hightLight?: boolean;
}

const CommentItem: React.FC<
  CommentItemProps
> = ({
  comment,
  isCommentOwner = false,
  removingComment,
  hightLight = false,
}) => {
  const router =
    useRouter();

  const openProfile =
    () => {
      if (
        !comment?.user?.id
      ) {
        return;
      }

      router.push({
        pathname:
          "/profile",
        params: {
          userId:
            comment.user.id,
        },
      });
    };

  const onRemoveComment =
    (
      item: any
    ) => {
      Alert.alert(
        "Yorum",
        "Bu yorum kalıcı olarak silinecek.",
        [
          {
            text: "Vazgeç",
            style:
              "cancel",
          },
          {
            text: "Sil",
            style:
              "destructive",
            onPress:
              () =>
                removingComment(
                  item
                ),
          },
        ]
      );
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <Pressable
        onPress={
          openProfile
        }
        hitSlop={8}
      >
        <Avatar
          uri={
            comment.user.image
          }
        />
      </Pressable>

      <View
        style={[
          styles.content,
          hightLight
            ? styles.highlight
            : null,
        ]}
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={
              openProfile
            }
            style={
              styles.nameContainer
            }
          >
            <Text
              style={
                styles.text
              }
              numberOfLines={1}
            >
              {
                comment
                  .user
                  .name
              }
            </Text>

            <Text>
              •
            </Text>

            <Text
              style={[
                styles.text,
                {
                  color:
                    theme.colors
                      .textLight,
                },
              ]}
            >
              {getFormattedDate(
                comment.created_at
              )}
            </Text>
          </Pressable>

          {isCommentOwner && (
            <TouchableOpacity
              onPress={() =>
                onRemoveComment(
                  comment
                )
              }
              hitSlop={8}
            >
              <Icon
                name="delete"
                size={20}
                color={
                  theme.colors
                    .rose
                }
              />
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={[
            styles.text,
            {
              fontWeight:
                "normal",
            },
          ]}
        >
          {
            comment.text
          }
        </Text>
      </View>
    </View>
  );
};

export default CommentItem;

const styles =
  StyleSheet.create({
    container: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      gap: 8,
      width: "100%",
    },

    content: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.06)",
      gap: 5,
      paddingHorizontal:
        14,
      paddingVertical:
        10,
      borderRadius:
        theme.radius.md,
      borderCurve:
        "continuous",
    },

    highlight: {
      borderWidth:
        0.2,
      backgroundColor:
        "white",
      borderColor:
        theme.colors.dark,
      shadowColor:
        theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity:
        0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    header: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
    },

    nameContainer: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
      flex: 1,
      marginRight: 8,
    },

    text: {
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts.medium,
      color:
        theme.colors
          .textDark,
    },
  });
