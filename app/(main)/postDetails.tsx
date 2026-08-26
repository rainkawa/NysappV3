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

import Svg, {
  Path,
} from "react-native-svg";

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

        const freshPost =
          await getPostDetails(
            String(postId),
            user.authInfo.id
          );

        if (
          freshPost.success &&
          freshPost.data
        ) {
          setPost(
            freshPost.data as PostViewer
          );
        }

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
          disableMoreIcon={false}
          disableBackIcon={false}
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
            <Svg
              width={26}
              height={26}
              viewBox="0 0 24 24"
              fill="none"
              pointerEvents="none"
            >
              <Path
                d="M21.7 2.3L2.8 9.2c-.9.3-.9 1.5 0 1.8l7.3 2.7 2.7 7.3c.3.9 1.5 1.5 1.8 0L21.5 4c.3-.9.9-1.2.2-1.7Z"
                fill="#F8FAFC"
              />
              <Path
                d="M10.2 13.8L21 3"
                stroke="#818CF8"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </Svg>
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
      theme.colors.background,
  },

  center: {
    flex: 1,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      theme.colors.background,
  },

  notFound: {
    fontSize:
      hp(1.8),
    fontWeight:
      theme.fonts.semibold,
    color:
      theme.colors.text,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop:
      hp(1.2),
    paddingBottom:
      16,
  },

  commentsHeader: {
    paddingHorizontal:
      wp(4),
    paddingTop:
      hp(1.2),
    paddingBottom:
      hp(1),
  },

  commentsTitle: {
    fontSize:
      hp(2),
    fontWeight:
      theme.fonts.bold,
    color:
      theme.colors.text,
  },

  commentsList: {
    paddingHorizontal:
      wp(4),
    gap: 10,
  },

  emptyComments: {
    minHeight:
      hp(18),
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 8,
    backgroundColor:
      theme.colors.card,
    borderRadius:
      theme.radius.lg,
    borderWidth: 1,
    borderColor:
      theme.colors.gray,
    marginTop: 4,
  },

  emptyText: {
    fontSize:
      hp(1.5),
    color:
      "#94A3B8",
  },

  bottomSpace: {
    height: 24,
  },

  commentBar: {
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    gap: 8,
    paddingHorizontal:
      wp(4),
    paddingVertical:
      9,
    backgroundColor:
      theme.colors.card,
    borderTopWidth: 1,
    borderTopColor:
      theme.colors.gray,
  },

  commentInput: {
    flex: 1,
    minHeight:
      48,
    maxHeight:
      hp(12),
    borderWidth: 1,
    borderColor:
      theme.colors.gray,
    borderRadius:
      24,
    paddingHorizontal: 14,
    backgroundColor:
      theme.colors.background,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor:
      theme.colors.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      theme.colors.primary,
    marginBottom: 0,
    opacity: 1,
  },

})

