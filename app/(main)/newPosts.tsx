import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import Header from "@/components/Header";
import RichTextEditor from "@/components/RichTextEditor";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSupabaseFileUrl,
  hp,
  wp,
} from "@/helpers/common";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import {
  ResizeMode,
  Video,
} from "expo-av";

import {
  createOrUpdatePost,
  getPostDetails,
  Post,
  PostViewer,
} from "@/services/postService";

import {
  RichEditorProps,
} from "react-native-pell-rich-editor";

const NewPosts = () => {
  const authContext =
    useAuth();

  const router =
    useRouter();

  const params =
    useLocalSearchParams();

  const user =
    authContext?.user;

  const bodyRef =
    useRef("");

  const editorRef =
    useRef<
      RichEditorProps | any
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    file,
    setFile,
  ] =
    useState<
      ImagePicker.ImagePickerAsset |
      string |
      undefined
    >();

  const [
    post,
    setPost,
  ] =
    useState<PostViewer | null>(
      null
    );

  const [
    isKeyboardShow,
    setIsKeyboardShow,
  ] = useState(false);

  useEffect(() => {
    if (!authContext) {
      return;
    }

    const postId =
      params.postId;

    if (
      Object.keys(params)
        .length > 1 &&
      postId
    ) {
      void gettingPostDetails(
        String(postId)
      );
    }

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
  }, []);

  if (!authContext) {
    return null;
  }

  const gettingPostDetails =
    async (
      postId: string
    ) => {
      const res =
        await getPostDetails(
          postId,
          user?.authInfo?.id ||
            ""
        );

      if (res.success) {
        const postDetail =
          res.data as PostViewer;

        bodyRef.current =
          postDetail.body;

        setTimeout(() => {
          editorRef.current?.setContentHTML(
            postDetail.body
          );
        }, 100);

        setPost(
          postDetail
        );

        setFile(
          postDetail.file
        );
      } else {
        Alert.alert(
          "Gönderi",
          res.message
        );

        router.replace(
          "/home"
        );
      }
    };

  const onPickFile =
    async (
      isImage: boolean
    ) => {
      try {
        const config:
          ImagePicker.ImagePickerOptions =
          isImage
            ? {
                mediaTypes: [
                  "images",
                ],
                quality: 0.85,
                allowsEditing:
                  true,
              }
            : {
                mediaTypes: [
                  "videos",
                ],
                allowsEditing:
                  true,
                quality: 0.6,
              };

        const result =
          await ImagePicker.launchImageLibraryAsync(
            config
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const selected =
          result.assets[0];

        const fileSize =
          selected.fileSize ||
          0;

        if (
          fileSize >
          40 * 1024 * 1024
        ) {
          Alert.alert(
            "Medya",
            "Dosya boyutu 40 MB'dan büyük olamaz."
          );
          return;
        }

        setFile(
          selected
        );
      } catch (
        error
      ) {
        console.warn(
          "Post media picker error:",
          error
        );

        Alert.alert(
          "Medya",
          "Medya seçilemedi."
        );
      }
    };

  const getFileType =
    (
      selected:
        | ImagePicker.ImagePickerAsset
        | string
        | undefined
    ) => {
      if (!selected) {
        return null;
      }

      if (
        typeof selected ===
        "object"
      ) {
        return selected.type;
      }

      if (
        selected.includes(
          "postImages"
        )
      ) {
        return "image";
      }

      return "video";
    };

  const getFileUri =
    (
      selected:
        | ImagePicker.ImagePickerAsset
        | string
        | undefined
    ) => {
      if (!selected) {
        return undefined;
      }

      if (
        typeof selected ===
        "object"
      ) {
        return selected.uri;
      }

      return (
        getSupabaseFileUrl(
          selected
        )?.uri ||
        undefined
      );
    };

  const onSubmit =
    async () => {
      const body =
        bodyRef.current.trim();

      if (!body) {
        Alert.alert(
          "Gönderi",
          "Önce gönderi metnini yaz."
        );
        return;
      }

      if (!file) {
        Alert.alert(
          "Gönderi",
          "Bir fotoğraf veya video seç."
        );
        return;
      }

      const data: Post = {
        userId:
          user?.authInfo?.id ||
          "",
        body,
        file,
      };

      if (
        post?.id
      ) {
        data.id =
          post.id;
      }

      setLoading(
        true
      );

      try {
        const res =
          await createOrUpdatePost(
            data
          );

        if (
          !res.success
        ) {
          Alert.alert(
            "Gönderi",
            res.message
          );
          return;
        }

        setFile(
          undefined
        );

        bodyRef.current =
          "";

        editorRef.current =
          null;

        if (post?.id) {
          router.replace({
            pathname:
              "/postDetails",
            params: {
              postId:
                post.id,
            },
          });
        } else {
          router.back();
        }
      } catch (
        error
      ) {
        console.warn(
          "Create post error:",
          error
        );

        Alert.alert(
          "Gönderi",
          "Gönderi oluşturulamadı."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  const removeSelectedFile =
    () => {
      if (post) {
        return;
      }

      setFile(
        undefined
      );
    };

  const selectedFileType =
    getFileType(file);

  const selectedFileUri =
    getFileUri(file);

  return (
    <ScreenWarpper
      autoDismissKeyboard={
        false
      }
    >
      <View
        style={
          styles.screen
        }
      >
        <Header
          title={
            post
              ? "Gönderiyi düzenle"
              : "Yeni gönderi"
          }
        />

        <KeyboardAvoidingView
          style={
            styles.keyboard
          }
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.scrollContent
            }
          >
            <View
              style={
                styles.accountCard
              }
            >
              <Avatar
                uri={
                  user?.userData
                    ?.image
                }
                size={
                  hp(6.2)
                }
                rounded={
                  hp(3.1)
                }
              />

              <View
                style={
                  styles.accountInfo
                }
              >
                <Text
                  style={
                    styles.accountName
                  }
                  numberOfLines={1}
                >
                  {user?.userData
                    ?.name ||
                    "Kullanıcı"}
                </Text>

                <View
                  style={
                    styles.visibilityRow
                  }
                >
                  <View
                    style={
                      styles.visibilityDot
                    }
                  />

                  <Text
                    style={
                      styles.visibilityText
                    }
                  >
                    Herkese açık
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.nysBadge
                }
              >
                <Text
                  style={
                    styles.nysBadgeText
                  }
                >
                  NY
                </Text>
              </View>
            </View>

            <View
              style={
                styles.editorCard
              }
            >
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    {post
                      ? "Gönderini güncelle"
                      : "Ne düşünüyorsun?"}
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Eğlenceni paylaş,
                    gerisini Nysapp'e bırak.
                  </Text>
                </View>

                <View
                  style={
                    styles.spark
                  }
                >
                  <Text
                    style={
                      styles.sparkText
                    }
                  >
                    ✦
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.editorShell
                }
              >
                <RichTextEditor
                  editorRef={
                    editorRef
                  }
                  onChange={(
                    body
                  ) => {
                    bodyRef.current =
                      body;
                  }}
                />
              </View>
            </View>

            {file && (
              <View
                style={
                  styles.previewCard
                }
              >
                <View
                  style={
                    styles.previewHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.previewTitle
                      }
                    >
                      Medya önizleme
                    </Text>

                    <Text
                      style={
                        styles.previewSubtitle
                      }
                    >
                      {selectedFileType ===
                      "video"
                        ? "Video"
                        : "Fotoğraf"}
                    </Text>
                  </View>

                  {!post && (
                    <Pressable
                      onPress={
                        removeSelectedFile
                      }
                      style={
                        styles.removeButton
                      }
                      hitSlop={8}
                    >
                      <Icon
                        name="delete"
                        size={18}
                        color={
                          "#F8FAFC"
                        }
                      />
                    </Pressable>
                  )}
                </View>

                <View
                  style={
                    styles.previewMedia
                  }
                >
                  {selectedFileType ===
                  "video" ? (
                    <Video
                      style={
                        styles.media
                      }
                      source={{
                        uri:
                          selectedFileUri ||
                          "",
                      }}
                      useNativeControls
                      resizeMode={
                        ResizeMode.COVER
                      }
                      isLooping
                    />
                  ) : (
                    <Image
                      source={{
                        uri:
                          selectedFileUri,
                      }}
                      resizeMode="cover"
                      style={
                        styles.media
                      }
                    />
                  )}

                  <View
                    style={
                      styles.mediaOverlay
                    }
                  >
                    <Text
                      style={
                        styles.mediaOverlayText
                      }
                    >
                      {selectedFileType ===
                      "video"
                        ? "VIDEO"
                        : "PHOTO"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View
              style={
                styles.mediaCard
              }
            >
              <View
                style={
                  styles.mediaCopy
                }
              >
                <Text
                  style={
                    styles.mediaTitle
                  }
                >
                  Medya ekle
                </Text>

                <Text
                  style={
                    styles.mediaSubtitle
                  }
                >
                  Fotoğraf veya video
                  seçebilirsin.
                </Text>
              </View>

              <View
                style={
                  styles.mediaActions
                }
              >
                <TouchableOpacity
                  onPress={() =>
                    onPickFile(
                      true
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                  style={
                    styles.mediaAction
                  }
                >
                  <View
                    style={
                      styles.mediaIcon
                    }
                  >
                    <Icon
                      name="image"
                      size={24}
                      color={
                        theme.colors
                          .primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.mediaActionText
                    }
                  >
                    Fotoğraf
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    onPickFile(
                      false
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                  style={
                    styles.mediaAction
                  }
                >
                  <View
                    style={
                      styles.mediaIconRose
                    }
                  >
                    <Icon
                      name="video"
                      size={24}
                      color={
                        theme.colors
                          .rose
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.mediaActionText
                    }
                  >
                    Video
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={
                  styles.mediaLimit
                }
              >
                Maksimum dosya boyutu
                40 MB
              </Text>
            </View>

            <View
              style={
                styles.tipCard
              }
            >
              <Text
                style={
                  styles.tipEmoji
                }
              >
                💡
              </Text>

              <View
                style={
                  styles.tipCopy
                }
              >
                <Text
                  style={
                    styles.tipTitle
                  }
                >
                  Küçük bir not
                </Text>

                <Text
                  style={
                    styles.tipText
                  }
                >
                  Eğlenceli, kısa ve
                  okunabilir içerikler
                  daha iyi görünür.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.bottomAction
              }
            >
              <Button
                buttonStyle={
                  styles.publishButton
                }
                title={
                  post
                    ? "Değişiklikleri kaydet"
                    : "Paylaş"
                }
                loading={
                  loading
                }
                hasShadow={false}
                onPress={
                  onSubmit
                }
              />
            </View>

            {isKeyboardShow && (
              <View
                style={
                  styles.keyboardSpace
                }
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenWarpper>
  );
};

export default NewPosts;

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    keyboard: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        wp(4),
      paddingTop:
        hp(1),
      paddingBottom:
        hp(12),
      gap:
        hp(1.4),
    },

    accountCard: {
      minHeight:
        hp(8.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3.5),
      paddingVertical:
        hp(1.2),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    accountInfo: {
      flex: 1,
      marginLeft:
        wp(3),
      gap: 4,
    },

    accountName: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.75),
      fontWeight:
        theme.fonts.bold,
    },

    visibilityRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    visibilityDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        theme.colors
          .primary,
    },

    visibilityText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.3),
    },

    nysBadge: {
      width:
        hp(4),
      height:
        hp(4),
      borderRadius:
        hp(2),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors
          .primary,
    },

    nysBadgeText: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.2),
      fontWeight:
        theme.fonts.bold,
    },

    editorCard: {
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(2),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    sectionHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom:
        hp(1.3),
    },

    sectionTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
    },

    sectionSubtitle: {
      marginTop: 4,
      color:
        "#94A3B8",
      fontSize:
        hp(1.35),
      lineHeight:
        hp(1.9),
      maxWidth:
        wp(75),
    },

    spark: {
      width:
        hp(4.4),
      height:
        hp(4.4),
      borderRadius:
        hp(2.2),
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors
          .primary,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    sparkText: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(2),
    },

    editorShell: {
      minHeight:
        hp(20),
      borderRadius:
        theme.radius.lg,
      overflow:
        "hidden",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors
          .background,
    },

    previewCard: {
      paddingHorizontal:
        wp(3.5),
      paddingVertical:
        hp(1.4),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    previewHeader: {
      minHeight:
        hp(4.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom:
        hp(1),
    },

    previewTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts.bold,
    },

    previewSubtitle: {
      marginTop: 2,
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
    },

    removeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .mistyRose,
      borderWidth: 1,
      borderColor:
        theme.colors
          .rose,
    },

    previewMedia: {
      height:
        hp(31),
      width: "100%",
      borderRadius:
        theme.radius.lg,
      overflow:
        "hidden",
      backgroundColor:
        theme.colors
          .background,
    },

    media: {
      flex: 1,
      width: "100%",
      height: "100%",
    },

    mediaOverlay: {
      position:
        "absolute",
      left: 12,
      bottom: 12,
      paddingHorizontal:
        10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor:
        "rgba(15,23,42,0.78)",
    },

    mediaOverlayText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.05),
      fontWeight:
        theme.fonts.bold,
      letterSpacing: 1,
    },

    mediaCard: {
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(1.8),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    mediaCopy: {
      marginBottom:
        hp(1.3),
    },

    mediaTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
    },

    mediaSubtitle: {
      marginTop: 4,
      color:
        "#94A3B8",
      fontSize:
        hp(1.35),
    },

    mediaActions: {
      flexDirection:
        "row",
      gap:
        wp(2.5),
    },

    mediaAction: {
      flex: 1,
      minHeight:
        hp(8),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    mediaIcon: {
      width:
        hp(4.8),
      height:
        hp(4.8),
      borderRadius:
        hp(2.4),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(129,140,248,0.14)",
      borderWidth: 1,
      borderColor:
        theme.colors
          .primary,
    },

    mediaIconRose: {
      width:
        hp(4.8),
      height:
        hp(4.8),
      borderRadius:
        hp(2.4),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(251,113,133,0.12)",
      borderWidth: 1,
      borderColor:
        theme.colors
          .rose,
    },

    mediaActionText: {
      marginTop: 6,
      color:
        theme.colors.text,
      fontSize:
        hp(1.25),
      fontWeight:
        theme.fonts
          .semibold,
    },

    mediaLimit: {
      marginTop:
        hp(1.1),
      color:
        "#64748B",
      fontSize:
        hp(1.2),
      textAlign:
        "center",
    },

    tipCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        wp(3),
      paddingHorizontal:
        wp(3.5),
      paddingVertical:
        hp(1.3),
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        "rgba(129,140,248,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(129,140,248,0.28)",
    },

    tipEmoji: {
      fontSize:
        hp(2.3),
    },

    tipCopy: {
      flex: 1,
    },

    tipTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.bold,
    },

    tipText: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.25),
      lineHeight:
        hp(1.7),
    },

    bottomAction: {
      paddingTop:
        hp(0.2),
    },

    publishButton: {
      minHeight:
        hp(6.2),
      borderRadius:
        theme.radius.xl,
    },

    keyboardSpace: {
      height:
        hp(28),
    },
  });
