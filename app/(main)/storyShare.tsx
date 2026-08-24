import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Video,
  ResizeMode,
} from "expo-av";

import {
  useRouter,
} from "expo-router";

import Icon from "@/assets/icons";
import Avatar from "@/components/Avatar";
import Header from "@/components/Header";
import MediaPickerModal from "@/components/MediaPickerModal";
import ScreenWarpper from "@/components/ScreenWrapper";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  createStory,
} from "@/services/storyService";

interface SelectedStoryMedia {
  uri: string;
  type:
    | "image"
    | "video";
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
}

const StoryShare =
  () => {
    const router =
      useRouter();

    const auth =
      useAuth();

    const [
      media,
      setMedia,
    ] =
      useState<
        SelectedStoryMedia |
        null
      >(null);

    const [
      uploading,
      setUploading,
    ] =
      useState(false);

    const [
      mediaPickerVisible,
      setMediaPickerVisible,
    ] =
      useState(false);

    const [
      mediaPickerTab,
      setMediaPickerTab,
    ] =
      useState<
        "photos" | "videos"
      >("photos");

    if (!auth) {
      return null;
    }

    const user =
      auth.user;

    const openPicker =
      (
        type:
          | "photos"
          | "videos"
      ) => {
        setMediaPickerTab(
          type
        );

        setMediaPickerVisible(
          true
        );
      };

    const onMediaSelected =
      (
        selected: SelectedStoryMedia
      ) => {
        if (
          selected.fileSize &&
          selected.fileSize >
            40 *
              1024 *
              1024
        ) {
          Alert.alert(
            "Hikâye",
            "Dosya boyutu 40 MB'dan büyük olamaz."
          );

          return;
        }

        setMedia(
          selected
        );

        setMediaPickerVisible(
          false
        );
      };

    const submit =
      async () => {
        if (!media) {
          Alert.alert(
            "Hikâye",
            "Önce fotoğraf veya video seç."
          );

          return;
        }

        const userId =
          user?.authInfo
            ?.id || "";

        if (!userId) {
          return;
        }

        setUploading(
          true
        );

        try {
          const result =
            await createStory(
              userId,
              media.uri,
              media.type ===
                "video"
                ? "video"
                : "image"
            );

          if (
            !result.success
          ) {
            Alert.alert(
              "Hikâye",
              result.message
            );

            return;
          }

          Alert.alert(
            "Hikâye",
            "Hikâyen paylaşıldı.",
            [
              {
                text:
                  "Tamam",
                onPress:
                  () =>
                    router.replace(
                      "/home"
                    ),
              },
            ]
          );
        } catch (
          error
        ) {
          console.warn(
            "Story upload error:",
            error
          );

          Alert.alert(
            "Hikâye",
            "Hikâye paylaşılırken bir hata oluştu."
          );
        } finally {
          setUploading(
            false
          );
        }
      };

    const clearMedia =
      () => {
        setMedia(
          null
        );
      };

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
            title="Hikâye paylaş"
          />

          <ScrollView
            showsVerticalScrollIndicator={
              true
            }
            indicatorStyle="white"
            contentContainerStyle={
              styles.content
            }
          >
            <View
              style={
                styles.profileCard
              }
            >
              <Avatar
                uri={
                  user?.userData
                    ?.image
                }
                size={
                  hp(5.5)
                }
                rounded={
                  hp(2.75)
                }
              />

              <View
                style={
                  styles.profileText
                }
              >
                <Text
                  style={
                    styles.profileName
                  }
                >
                  {user?.userData
                    ?.name ||
                    "Kullanıcı"}
                </Text>

                <Text
                  style={
                    styles.profileSub
                  }
                >
                  Yeni hikâyeni paylaş
                </Text>
              </View>
            </View>

            <View
              style={
                styles.previewCard
              }
            >
              {media ? (
                <>
                  {media.type ===
                  "video" ? (
                    <Video
                      source={{
                        uri:
                          media.uri,
                      }}
                      style={
                        styles.previewMedia
                      }
                      resizeMode={
                        ResizeMode.CONTAIN
                      }
                      useNativeControls
                      shouldPlay={
                        false
                      }
                    />
                  ) : (
                    <Image
                      source={{
                        uri:
                          media.uri,
                      }}
                      style={
                        styles.previewMedia
                      }
                      resizeMode="contain"
                    />
                  )}

                  <Pressable
                    onPress={
                      clearMedia
                    }
                    style={
                      styles.removeButton
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={
                        styles.removeButtonText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View
                    style={
                      styles.emptyIcon
                    }
                  >
                    <Icon
                      name="image"
                      size={32}
                      color={
                        theme.colors
                          .primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.previewTitle
                    }
                  >
                    Hikâyeni oluştur
                  </Text>

                  <Text
                    style={
                      styles.previewText
                    }
                  >
                    Fotoğraf veya video seç.
                    Hikâyen 24 saat boyunca
                    görünür.
                  </Text>
                </>
              )}
            </View>

            <View
              style={
                styles.actionsCard
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Medya seç
              </Text>

              <View
                style={
                  styles.actionRow
                }
              >
                <Pressable
                  onPress={() =>
                    openPicker(
                      "photos"
                    )
                  }
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed &&
                      styles.actionPressed,
                  ]}
                >
                  <View
                    style={
                      styles.imageIcon
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
                      styles.actionTitle
                    }
                  >
                    Fotoğraf
                  </Text>

                  <Text
                    style={
                      styles.actionSub
                    }
                  >
                    Nysapp galerisi
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    openPicker(
                      "videos"
                    )
                  }
                  style={({ pressed }) => [
                    styles.actionButton,
                    pressed &&
                      styles.actionPressed,
                  ]}
                >
                  <View
                    style={
                      styles.videoIcon
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
                      styles.actionTitle
                    }
                  >
                    Video
                  </Text>

                  <Text
                    style={
                      styles.actionSub
                    }
                  >
                    Nysapp galerisi
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={
                submit
              }
              disabled={
                uploading ||
                !media
              }
              style={[
                styles.shareButton,
                (!media ||
                  uploading) &&
                  styles.shareDisabled,
              ]}
            >
              {uploading ? (
                <ActivityIndicator
                  color={
                    theme.colors
                      .text
                  }
                />
              ) : (
                <>
                  <Icon
                    name="plus"
                    size={22}
                    color={
                      theme.colors
                        .text
                    }
                  />

                  <Text
                    style={
                      styles.shareText
                    }
                  >
                    Hikâyeyi paylaş
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>

          <MediaPickerModal
            visible={
              mediaPickerVisible
            }
            initialTab={
              mediaPickerTab
            }
            onClose={() =>
              setMediaPickerVisible(
                false
              )
            }
            onSelect={
              onMediaSelected
            }
          />
        </View>
      </ScreenWarpper>
    );
  };

export default StoryShare;

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    content: {
      paddingHorizontal:
        wp(4),
      paddingTop:
        hp(1),
      paddingBottom:
        hp(10),
      gap:
        hp(1.4),
    },

    profileCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      padding:
        wp(3.5),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
    },

    profileText: {
      marginLeft:
        wp(3),
      flex: 1,
    },

    profileName: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts.bold,
    },

    profileSub: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.25),
    },

    previewCard: {
      minHeight:
        hp(50),
      maxHeight:
        hp(58),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      overflow:
        "hidden",
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    previewMedia: {
      width:
        "100%",
      height:
        "100%",
      minHeight:
        hp(50),
      backgroundColor:
        "#000000",
    },

    removeButton: {
      position:
        "absolute",
      top: 12,
      right: 12,
      width: 40,
      height: 40,
      borderRadius:
        20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.78)",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.2)",
    },

    removeButtonText: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(2.7),
      lineHeight:
        hp(2.7),
      includeFontPadding:
        false,
    },

    emptyIcon: {
      width:
        hp(7),
      height:
        hp(7),
      borderRadius:
        hp(3.5),
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

    previewTitle: {
      marginTop:
        hp(1.5),
      color:
        theme.colors
          .text,
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
    },

    previewText: {
      marginTop:
        hp(0.7),
      color:
        "#94A3B8",
      fontSize:
        hp(1.35),
      lineHeight:
        hp(2),
      textAlign:
        "center",
      maxWidth:
        wp(72),
      paddingHorizontal:
        wp(4),
    },

    actionsCard: {
      padding:
        wp(4),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
    },

    sectionTitle: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts.bold,
      marginBottom:
        hp(1.1),
    },

    actionRow: {
      flexDirection:
        "row",
      gap:
        wp(2.5),
    },

    actionButton: {
      flex: 1,
      minHeight:
        hp(10),
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
        theme.colors
          .gray,
    },

    actionPressed: {
      borderColor:
        theme.colors
          .primary,
      backgroundColor:
        "#222E44",
    },

    imageIcon: {
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
    },

    videoIcon: {
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
    },

    actionTitle: {
      marginTop: 6,
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts
          .semibold,
    },

    actionSub: {
      marginTop: 2,
      color:
        "#64748B",
      fontSize:
        hp(1.1),
    },

    shareButton: {
      minHeight:
        hp(6.2),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors
          .primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 8,
    },

    shareDisabled: {
      opacity:
        0.4,
    },

    shareText: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.55),
      fontWeight:
        theme.fonts.bold,
    },
  });
