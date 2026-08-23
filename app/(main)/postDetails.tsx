import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const [
    isKeyboardShow,
    setIsKeyboardShow,
  ] =
    useState(false);

  /*
   * IMPORTANT:
   * Navigation is performed from an effect,
   * never during render.
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
          const res =
            await getPostDetails(
              postId as string,
              user.authInfo.id
            );

          if (
            res.success
          ) {
            setPost(
              res.data
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
        () => {
          setIsKeyboardShow(
            true
          );
        }
      );

    const hideSubscription =
      Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setIsKeyboardShow(
            false
          );
        }
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

  /*
   * Redirect/empty state.
   */
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
        style={[
          styles.center,
          {
            justifyContent:
              "center",
            marginTop: 100,
          },
        ]}
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
      if (
        !commentRef.current.trim()
      ) {
        return;
      }

      if (
        !user?.authInfo?.id
      ) {
        return;
      }

      setLoadingSendComment(
        true
      );

      const data:
        CommentPostBody =
        {
          userId:
            user.authInfo.id,
          postId:
            postId as string,
          text:
            commentRef.current.trim(),
        };

      try {
        const res =
          await createCommentPost(
            data
          );

        if (
          res.success
        ) {
          inputRef.current?.clear();

          commentRef.current =
            "";

          setPost(
            (prevPost) => {
              if (
                !prevPost
              ) {
                return prevPost;
              }

              return {
                ...prevPost,
                comments: [
                  res.data,
                  ...(prevPost.comments ||
                    []),
                ],
              };
            }
          );

          const userAction =
            "dã bình luận về bài viết của bạn";

          if (
            post.userId !==
            user.authInfo.id
          ) {
            const prepareData:
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
                        res.data.id,
                    }
                  ),
              };

            await createNotification(
              prepareData
            );

            if (
              post.user
                ?.expoPushToken
            ) {
              await pushNotification(
                post.user
                  .expoPushToken,
                post.user
                  .name,
                userAction
              );
            }
          }
        } else {
          Alert.alert(
            "Comment",
            res.message
          );
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
        const res =
          await removeCommentPost(
            comment.id
          );

        if (
          res.success
        ) {
          setPost(
            (prevPost) => {
              if (
                !prevPost
              ) {
                return prevPost;
              }

              return {
                ...prevPost,
                comments:
                  (
                    prevPost.comments ||
                    []
                  ).filter(
                    (_) =>
                      _.id !==
                      comment.id
                  ),
              };
            }
          );
        } else {
          Alert.alert(
            "Comment",
            res.message
          );
        }
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
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        style={
          styles.list
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : "height"
          }
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
              comment
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
              styles.inputContainer
            }
          >
            <Input
              inputRef={
                inputRef
              }
              placeholder="Yorum yaz..."
              multiline
              value={
                undefined
              }
              onChangeText={(
                value
              ) => {
                commentRef.current =
                  value;
              }}
              containerStyle={
                styles.commentInput
              }
            />

            <View
              style={
                styles.sendContainer
              }
            >
              <Text
                onPress={
                  loadingSendComment
                    ? undefined
                    : onNewComment
                }
                style={[
                  styles.sendText,
                  loadingSendComment &&
                    styles.sendTextDisabled,
                ]}
              >
                {loadingSendComment
                  ? "..."
                  : "Gönder"}
              </Text>
            </View>
          </View>

          {isKeyboardShow && (
            <View
              style={{
                height:
                  hp(12),
              }}
            />
          )}
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
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

    list: {
      flex: 1,
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
      paddingTop: 10,
      paddingBottom: 6,
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

    inputContainer: {
      marginHorizontal:
        wp(4),
      marginTop: 10,
      marginBottom: 30,
    },

    commentInput: {
      minHeight: 80,
    },

    sendContainer: {
      alignItems:
        "flex-end",
      marginTop: 8,
    },

    sendText: {
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts
          .bold,
      color:
        theme.colors
          .primary,
    },

    sendTextDisabled: {
      opacity: 0.5,
    },
  });
