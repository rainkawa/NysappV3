import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  Comment,
  CommentPostBody,
  createCommentPost,
  getPostDetails,
  PostViewer,
  removeCommentPost,
} from "@/services/postService";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  theme,
} from "@/constants/theme";

import {
  useAuth,
} from "@/contexts/AuthContext";

import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import Input from "@/components/Input";
import Icon from "@/assets/icons";
import CommentItem from "@/components/CommentItem";

import {
  createNotification,
  NotificationBody,
  pushNotification,
} from "@/services/notificationService";

const postDetails = () => {
  const router =
    useRouter();

  const {
    postId,
    commentId,
  } =
    useLocalSearchParams();

  const authContext =
    useAuth();

  const user =
    authContext?.user;

  const [
    post,
    setPost,
  ] =
    useState<
      PostViewer | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadingSendComment,
    setLoadingSendComment,
  ] =
    useState(false);

  const inputRef =
    useRef<TextInput>(
      null
    );

  const commentRef =
    useRef("");

  /*
   * Navigation render içinde değil.
   */
  useEffect(() => {
    if (
      !postId ||
      !authContext
    ) {
      router.replace(
        "/home"
      );
    }
  }, [
    postId,
    authContext,
    router,
  ]);

  const gettingPostDetails =
    useCallback(
      async () => {
        if (
          !postId ||
          !authContext ||
          !user?.authInfo?.id
        ) {
          return;
        }

        try {
          const result =
            await getPostDetails(
              postId as string,
              user.authInfo.id
            );

          if (
            result.success
          ) {
            setPost(
              result.data
            );
          } else {
            setPost(null);
          }
        } catch (
          error
        ) {
          console.warn(
            "Post Details - get post error:",
            error
          );

          setPost(null);
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        postId,
        authContext,
        user?.authInfo?.id,
      ]
    );

  useEffect(() => {
    if (
      !postId ||
      !authContext
    ) {
      return;
    }

    gettingPostDetails();

    const showSubscription =
      Keyboard.addListener(
        "keyboardDidShow",
        () => {}
      );

    const hideSubscription =
      Keyboard.addListener(
        "keyboardDidHide",
        () => {}
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [
    postId,
    authContext,
    gettingPostDetails,
  ]);

  if (
    !postId ||
    !authContext
  ) {
    return null;
  }

  if (
    loading
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Loading />
      </View>
    );
  }

  if (
    !post
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.notFound
          }
        >
          Không tìm được bài viết!
        </Text>
      </View>
    );
  }

  const onNewComment =
    async () => {
      const text =
        commentRef.current.trim();

      if (
        !text ||
        !user?.authInfo?.id
      ) {
        return;
      }

      setLoadingSendComment(
        true
      );

      const data:
        CommentPostBody = {
        userId:
          user.authInfo.id,
        postId:
          postId as string,
        text,
      };

      try {
        const result =
          await createCommentPost(
            data
          );

        if (
          !result.success
        ) {
          Alert.alert(
            "Comment",
            result.message
          );
          return;
        }

        inputRef.current?.clear();

        commentRef.current =
          "";

        setPost(
          (
            previous: PostViewer | null
          ) => {
            if (
              !previous
            ) {
              return previous;
            }

            return {
              ...previous,
              comments: [
                result.data,
                ...(previous.comments ||
                  []),
              ],
            };
          }
        );

        const userAction =
          "bir gönderinize yorum yaptı";

        if (
          post.userId !==
          user.authInfo.id
        ) {
          const notification:
            NotificationBody =
            {
              senderId:
                user.authInfo.id,
              receiverId:
                post.user.id,
              title:
                userAction,
              data:
                JSON.stringify(
                  {
                    type:
                      "comment",
                    postId:
                      post.id,
                    commentId:
                      result.data.id,
                  }
                ),
            };

          await createNotification(
            notification
          );

          if (
            post.user
              ?.expoPushToken
          ) {
            await pushNotification(
              post.user
                .expoPushToken,
              post.user.name,
              userAction
            );
          }
        }
      } catch (
        error
      ) {
        console.warn(
          "Post Details - comment error:",
          error
        );

        Alert.alert(
          "Comment",
          "Yorum gönderilemedi."
        );
      } finally {
        setLoadingSendComment(
          false
        );
      }
    };

  const onRemovingComment =
    async (
      comment: Comment
    ) => {
      try {
        const result =
          await removeCommentPost(
            comment.id
          );

        if (
          !result.success
        ) {
          Alert.alert(
            "Comment",
            result.message
          );
          return;
        }

        setPost(
          (
            previous: PostViewer | null
          ) => {
            if (
              !previous
            ) {
              return previous;
            }

            return {
              ...previous,
              comments:
                (
                  previous.comments ||
                  []
                ).filter(
                  (
                    item: Comment
                  ) =>
                    item.id !==
                    comment.id
                ),
            };
          }
        );
      } catch (
        error
      ) {
        console.warn(
          "Post Details - remove comment error:",
          error
        );

        Alert.alert(
          "Comment",
          "Yorum silinemedi."
        );
      }
    };

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS ===
        "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        Platform.OS ===
        "android"
          ? 0
          : 0
      }
    >
      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <PostCard
          item={post}
          currentUser={
            user?.userData
          }
          router={
            router
          }
          hasShadow={false}
          disableMoreIcon={true}
        />

        <View
          style={
            styles.commentsHeader
          }
        >
          <Text
            style={
              styles.commentsTitle
            }
          >
            Yorumlar
          </Text>
        </View>

        {(
          post.comments ||
          []
        ).map(
          (
            comment: Comment
          ) => (
            <CommentItem
              key={
                comment.id
              }
              comment={
                comment
              }
              removingComment={
                onRemovingComment
              }
            />
          )
        )}

        {(
          post.comments ||
          []
        ).length ===
          0 && (
          <View
            style={
              styles.emptyComments
            }
          >
            <Icon
              name="comment"
              size={30}
              color={
                theme.colors
                  .textLight
              }
            />

            <Text
              style={
                styles.emptyCommentsText
              }
            >
              Henüz yorum yok.
            </Text>
          </View>
        )}

        <View
          style={
            styles.bottomSpace
          }
        />
      </ScrollView>

      <View
        style={
          styles.commentBar
        }
      >
        <Input
          inputRef={
            inputRef
          }
          placeholder="Yorum yaz..."
          multiline
          onChangeText={(
            value: string
          ) => {
            commentRef.current =
              value;
          }}
          containerStyle={
            styles.commentInput
          }
        />

        <TouchableOpacity
          activeOpacity={
            0.7
          }
          disabled={
            loadingSendComment
          }
          onPress={
            onNewComment
          }
          style={
            styles.sendButton
          }
        >
          {loadingSendComment ? (
            <Loading
              size="small"
            />
          ) : (
            <Icon
              name="send"
              color={
                theme.colors
                  .primaryDark
              }
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default postDetails;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "white",
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingTop:
        wp(4),
      paddingBottom:
        16,
    },

    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "white",
    },

    notFound: {
      fontSize:
        hp(1.8),
      color:
        theme.colors
          .textDark,
      fontWeight:
        theme.fonts
          .semibold,
    },

    commentsHeader: {
      paddingHorizontal:
        wp(4),
      paddingTop: 12,
      paddingBottom: 8,
    },

    commentsTitle: {
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts
          .bold,
      color:
        theme.colors
          .textDark,
    },

    emptyComments: {
      paddingVertical:
        40,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    emptyCommentsText: {
      fontSize:
        hp(1.5),
      color:
        theme.colors
          .textLight,
    },

    bottomSpace: {
      height: 24,
    },

    commentBar: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      gap: 10,
      paddingHorizontal:
        wp(4),
      paddingVertical: 10,
      backgroundColor:
        "white",
      borderTopWidth:
        0.5,
      borderTopColor:
        theme.colors.gray,
    },

    commentInput: {
      flex: 1,
      minHeight:
        hp(5.8),
      maxHeight:
        hp(13),
      borderRadius:
        theme.radius.xl,
    },

    sendButton: {
      width:
        hp(5.8),
      height:
        hp(5.8),
      borderWidth:
        0.8,
      borderColor:
        theme.colors.primary,
      borderRadius:
        theme.radius.lg,
      alignItems:
        "center",
      justifyContent:
        "center",
    },
  });
