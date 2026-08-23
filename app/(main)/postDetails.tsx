import {
  Alert,
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

import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import Input from "@/components/Input";
import Icon from "@/assets/icons";
import CommentItem from "@/components/CommentItem";

import {
  pushNotification,
} from "@/services/notificationService";

const PostDetails = () => {
  const router = useRouter();

  const {
    postId,
  } = useLocalSearchParams();

  const authContext =
    useAuth();

  const user =
    authContext?.user;

  const [post, setPost] =
    useState<PostViewer | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    loadingSendComment,
    setLoadingSendComment,
  ] = useState(false);

  const inputRef =
    useRef<TextInput>(null);

  const commentRef =
    useRef("");

  useEffect(() => {
    if (
      !postId ||
      !authContext
    ) {
      router.replace("/home");
    }
  }, [
    postId,
    authContext,
    router,
  ]);

  const loadPost =
    useCallback(
      async () => {
        if (
          !postId ||
          !user?.authInfo?.id
        ) {
          return;
        }

        setLoading(true);

        try {
          const result =
            await getPostDetails(
              String(postId),
              user.authInfo.id
            );

          if (
            result.success &&
            result.data
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
            "Post Details - load error:",
            error
          );
          setPost(null);
        } finally {
          setLoading(false);
        }
      },
      [
        postId,
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

    loadPost();
  }, [
    postId,
    authContext,
    loadPost,
  ]);

  if (
    !postId ||
    !authContext
  ) {
    return null;
  }

  if (loading) {
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

  if (!post) {
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
          Gönderi bulunamadı.
        </Text>
      </View>
    );
  }

  const submitComment =
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

      const body:
        CommentPostBody = {
        userId:
          user.authInfo.id,
        postId:
          String(postId),
        text,
      };

      try {
        const result =
          await createCommentPost(
            body
          );

        if (
          !result.success
        ) {
          Alert.alert(
            "Yorum",
            result.message
          );
          return;
        }

        inputRef.current?.clear();

        commentRef.current =
          "";

        setPost(
          (
            previous
          ) => {
            if (!previous) {
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

        /*
         * Notification artık Supabase trigger
         * tarafından otomatik oluşturuluyor.
         *
         * Burada yalnızca push bildirimi
         * gönderiyoruz.
         */
        if (
          post.userId !==
          user.authInfo.id
        ) {
          if (
            post.user
              ?.expoPushToken
          ) {
            await pushNotification(
              post.user
                .expoPushToken,
              post.user.name,
              "gönderine yorum yaptı"
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
          "Yorum",
          "Yorum gönderilemedi."
        );
      } finally {
        setLoadingSendComment(
          false
        );
      }
    };

  const deleteComment =
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
            "Yorum",
            result.message
          );
          return;
        }

        setPost(
          (
            previous
          ) => {
            if (!previous) {
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
                    currentComment
                  ) =>
                    currentComment.id !==
                    comment.id
                ),
            };
          }
        );
      } catch (
        error
      ) {
        console.warn(
          "Post Details - delete comment error:",
          error
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
          : undefined
      }
      keyboardVerticalOffset={
        0
      }
    >
      <ScrollView
        style={
          styles.scroll
        }
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
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

        <View
          style={
            styles.commentsList
          }
        >
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
                  deleteComment
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
                  styles.emptyText
                }
              >
                Henüz yorum yok.
              </Text>
            </View>
          )}
        </View>

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
          multiline
          scrollEnabled
          placeholder="Yorum yaz..."
          onChangeText={(
            value
          ) => {
            commentRef.current =
              value;
          }}
          returnKeyType="default"
          blurOnSubmit={false}
          containerStyle={
            styles.commentInput
          }
        />

        <TouchableOpacity
          activeOpacity={
            0.75
          }
          disabled={
            loadingSendComment
          }
          onPress={
            submitComment
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
                  .primary
              }
              size={28}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default PostDetails;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "white",
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
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .textDark,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingTop:
        wp(4),
      paddingBottom: 12,
    },

    commentsHeader: {
      paddingHorizontal:
        wp(4),
      paddingTop: 8,
      paddingBottom: 8,
    },

    commentsTitle: {
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors
          .textDark,
    },

    commentsList: {
      paddingHorizontal:
        wp(4),
      gap: 10,
    },

    emptyComments: {
      minHeight: 140,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
      backgroundColor:
        "#F8F8F8",
      borderRadius:
        theme.radius.lg,
      marginTop: 4,
    },

    emptyText: {
      fontSize:
        hp(1.5),
      color:
        theme.colors
          .textLight,
    },

    bottomSpace: {
      height: 20,
    },

    commentBar: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      gap: 8,
      paddingHorizontal:
        wp(4),
      paddingVertical: 8,
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
        hp(6),
      maxHeight:
        hp(13),
      borderRadius:
        theme.radius.xl,
      paddingHorizontal: 14,
    },

    sendButton: {
      width:
        hp(5.8),
      height:
        hp(5.8),
      borderRadius:
        theme.radius.xl,
      borderWidth: 1,
      borderColor:
        theme.colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "white",
      marginBottom: 1,
    },
  });
