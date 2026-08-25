import React, {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import MediaPickerModal from "@/components/MediaPickerModal";
import ScreenWarpper from "@/components/ScreenWrapper";

import {
  theme,
} from "@/constants/theme";

import {
  getSupabaseFileUrl,
  hp,
  wp,
} from "@/helpers/common";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  createStory,
} from "@/services/storyService";

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} =
  Dimensions.get(
    "window"
  );

const COMPOSER_WIDTH =
  SCREEN_WIDTH;

const COMPOSER_HEIGHT =
  SCREEN_HEIGHT;

const MIN_SCALE = 0.65;
const MAX_SCALE = 2.5;

type MediaType =
  | "image"
  | "video";

interface SelectedMedia {
  uri: string;
  type: MediaType;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

interface StoryTextLayer {
  text: string;
  x: number;
  y: number;
  scale: number;
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
        SelectedMedia |
        null
      >(null);

    const [
      pickerVisible,
      setPickerVisible,
    ] = useState(false);

    const [
      pickerTab,
      setPickerTab,
    ] = useState<
      "photos" | "videos"
    >("photos");
const [
      textEditorVisible,
      setTextEditorVisible,
    ] =
      useState(false);

    const [
      textValue,
      setTextValue,
    ] =
      useState("");

    const [
      textLayer,
      setTextLayer,
    ] =
      useState<
        StoryTextLayer |
        null
      >(null);

    const [
      scale,
      setScale,
    ] =
      useState(1);

    const [
      offsetX,
      setOffsetX,
    ] =
      useState(0);

    const [
      offsetY,
      setOffsetY,
    ] =
      useState(0);

    const [
      uploading,
      setUploading,
    ] =
      useState(false);

    if (!auth) {
      return null;
    }

    const user =
      auth.user;

    const mediaUri =
      media
        ? media.uri.startsWith(
            "http"
          )
          ? media.uri
          : getSupabaseFileUrl(
              media.uri
            )?.uri ||
            media.uri
        : "";

    const resetComposer =
      () => {
        setMedia(
          null
        );
        setTextLayer(
          null
        );
        setTextValue(
          ""
        );
        setScale(
          1
        );
        setOffsetX(
          0
        );
        setOffsetY(
          0
        );
      };

    const openGallery =
      (
        type:
          | "photos"
          | "videos"
      ) => {
        setPickerTab(
          type
        );

        setPickerVisible(
          true
        );
      };

    const selectMedia =
      (
        selected: {
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

        setMedia({
          uri:
            selected.uri,
          type:
            selected.type,
          width:
            selected.width,
          height:
            selected.height,
          duration:
            selected.duration,
          fileSize:
            selected.fileSize,
        });

        setScale(
          1
        );

        setOffsetX(
          0
        );

        setOffsetY(
          0
        );

        setTextLayer(
          null
        );

        setPickerVisible(
          false
        );
      };


    const addText =
      () => {
        const value =
          textValue.trim();

        if (!value) {
          return;
        }

        setTextLayer({
          text:
            value,
          x:
            COMPOSER_WIDTH /
              2 -
            90,
          y:
            COMPOSER_HEIGHT /
              2 -
            24,
          scale:
            1,
        });

        setTextEditorVisible(
          false
        );
        setTextValue(
          ""
        );
      };

    const changeTextScale =
      (
        amount: number
      ) => {
        setTextLayer(
          current => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              scale:
                Math.min(
                  Math.max(
                    current.scale +
                      amount,
                    0.7
                  ),
                  2.2
                ),
            };
          }
        );
      };

    const textPanResponder =
      React.useMemo(
        () =>
          PanResponder.create({
            onStartShouldSetPanResponder:
              () => true,

            onMoveShouldSetPanResponder:
              () => true,

            onPanResponderMove:
              (
                _,
                gesture
              ) => {
                setTextLayer(
                  current => {
                    if (
                      !current
                    ) {
                      return current;
                    }

                    return {
                      ...current,
                      x:
                        current.x +
                        gesture.dx,
                      y:
                        current.y +
                        gesture.dy,
                    };
                  }
                );
              },
          }),
        []
      );

    const mediaPanResponder =
      React.useMemo(() => {
        let initialDistance = 0;
        let initialScale = 1;
        let lastPageX = 0;
        let lastPageY = 0;

        const getDistance = (
          touches: readonly any[]
        ) => {
          if (touches.length < 2) {
            return 0;
          }

          return Math.hypot(
            touches[0].pageX -
              touches[1].pageX,
            touches[0].pageY -
              touches[1].pageY
          );
        };

        return PanResponder.create({
          onStartShouldSetPanResponder:
            () => true,

          onMoveShouldSetPanResponder:
            () => true,

          onPanResponderGrant:
            event => {
              const nativeEvent =
                event?.nativeEvent;

              if (!nativeEvent) {
                return;
              }

              const touches =
                nativeEvent.touches || [];

              if (touches.length >= 2) {
                initialDistance =
                  getDistance(touches);

                initialScale =
                  scale;

                return;
              }

              if (touches.length === 1) {
                lastPageX =
                  touches[0].pageX;

                lastPageY =
                  touches[0].pageY;
              }
            },

          onPanResponderMove:
            event => {
              const nativeEvent =
                event?.nativeEvent;

              if (!nativeEvent) {
                return;
              }

              const touches =
                nativeEvent.touches || [];

              if (
                touches.length >= 2 &&
                initialDistance > 0
              ) {
                const distance =
                  getDistance(touches);

                if (distance > 0) {
                  const ratio =
                    distance /
                    initialDistance;

                  setScale(
                    Math.min(
                      Math.max(
                        initialScale *
                          ratio,
                        MIN_SCALE
                      ),
                      MAX_SCALE
                    )
                  );
                }

                return;
              }

              if (touches.length === 1) {
                const currentX =
                  touches[0].pageX;

                const currentY =
                  touches[0].pageY;

                const dx =
                  currentX -
                  lastPageX;

                const dy =
                  currentY -
                  lastPageY;

                lastPageX =
                  currentX;

                lastPageY =
                  currentY;

                setOffsetX(
                  current =>
                    current + dx
                );

                setOffsetY(
                  current =>
                    current + dy
                );
              }
            },

          onPanResponderRelease:
            () => {
              initialDistance = 0;
            },

          onPanResponderTerminate:
            () => {
              initialDistance = 0;
            },
        });
      }, [scale]);

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
            ?.id ||
          "";

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
              media.type,
              textLayer?.text ||
                "",
              scale,
              offsetX,
              offsetY
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


    return (
      <KeyboardAvoidingView
        style={
          styles.root
        }
        behavior="padding"
      >
        <ScreenWarpper
          autoDismissKeyboard={
            false
          }
        >
          <View
            style={
              styles.root
            }
          >
            {!media ? (
              <View
                style={
                  styles.emptyComposer
                }
              >
                <View
                  style={
                    styles.emptyTop
                  }
                >
                  <Pressable
                    onPress={() =>
                      router.back()
                    }
                    style={
                      styles.circleButton
                    }
                  >
                    <Text
                      style={
                        styles.closeText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>

                  <Text
                    style={
                      styles.composerTitle
                    }
                  >
                    Hikâye
                  </Text>

                  <View
                    style={
                      styles.circleButton
                    }
                  />
                </View>

                <View
                  style={
                    styles.emptyCenter
                  }
                >
                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    Hikâyeni oluştur
                  </Text>

                  <Text
                    style={
                      styles.emptyDescription
                    }
                  >
                    Galeriden seç veya
                    kamerayla yeni bir
                    hikâye çek.
                  </Text>

                  <View
                    style={
                      styles.sourceRow
                    }
                  >
                    <Pressable
                      onPress={() =>
                        openGallery(
                          "photos"
                        )
                      }
                      style={
                        styles.sourceButton
                      }
                    >
                      <Text
                        style={
                          styles.sourceIcon
                        }
                      >
                        ▣
                      </Text>

                      <Text
                        style={
                          styles.sourceTitle
                        }
                      >
                        Galeri
                      </Text>

                      <Text
                        style={
                          styles.sourceSub
                        }
                      >
                        Fotoğraf
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        openGallery(
                          "videos"
                        )
                      }
                      style={
                        styles.sourceButton
                      }
                    >
                      <Text
                        style={
                          styles.sourceIcon
                        }
                      >
                        ▶
                      </Text>

                      <Text
                        style={
                          styles.sourceTitle
                        }
                      >
                        Galeri
                      </Text>

                      <Text
                        style={
                          styles.sourceSub
                        }
                      >
                        Video
                      </Text>
                    </Pressable>

                    
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={
                  styles.composer
                }
              >
                <View
                  style={
                    styles.composerHeader
                  }
                >
                  <Pressable
                    onPress={
                      resetComposer
                    }
                    style={
                      styles.circleButton
                    }
                  >
                    <Text
                      style={
                        styles.closeText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>

                  <View
                    style={
                      styles.headerTools
                    }
                  >
                    <Pressable
                      onPress={() =>
                        setTextEditorVisible(
                          true
                        )
                      }
                      style={
                        styles.toolButton
                      }
                    >
                      <Text
                        style={
                          styles.textTool
                        }
                      >
                        Aa
                      </Text>
                    </Pressable>

                    {textLayer && (
                      <>
                        <Pressable
                          onPress={() =>
                            changeTextScale(
                              0.15
                            )
                          }
                          style={
                            styles.toolButton
                          }
                        >
                          <Text
                            style={
                              styles.toolText
                            }
                          >
                            A+
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() =>
                            changeTextScale(
                              -0.15
                            )
                          }
                          style={
                            styles.toolButton
                          }
                        >
                          <Text
                            style={
                              styles.toolText
                            }
                          >
                            A−
                          </Text>
                        </Pressable>
                      </>
                    )}

                    <Pressable
                      onPress={
                        submit
                      }
                      disabled={
                        uploading
                      }
                      style={[
                        styles.shareSmall,
                        uploading &&
                          styles.disabled,
                      ]}
                    >
                      {uploading ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            "#F8FAFC"
                          }
                        />
                      ) : (
                        <Text
                          style={
                            styles.shareSmallText
                          }
                        >
                          Hikâyen
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                <View
                  style={
                    styles.storyCanvas
                  }
                >
                  {media.type ===
                  "video" ? (
                    <View
                      {...mediaPanResponder
                        .panHandlers}
                      style={
                        styles.mediaLayer
                      }
                    >
                      <Video
                        source={{
                          uri:
                            mediaUri,
                        }}
                        style={[
                          styles.media,
                          {
                            transform: [
                              {
                                translateX:
                                  offsetX,
                              },
                              {
                                translateY:
                                  offsetY,
                              },
                              {
                                scale,
                              },
                            ],
                          },
                        ]}
                        resizeMode={
                          ResizeMode.COVER
                        }
                        shouldPlay
                        isLooping
                      />
                    </View>
                  ) : (
                    <View
                      {...mediaPanResponder
                        .panHandlers}
                      style={
                        styles.mediaLayer
                      }
                    >
                      <Image
                        source={{
                          uri:
                            mediaUri,
                        }}
                        style={[
                          styles.media,
                          {
                            transform: [
                              {
                                translateX:
                                  offsetX,
                              },
                              {
                                translateY:
                                  offsetY,
                              },
                              {
                                scale,
                              },
                            ],
                          },
                        ]}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {textLayer && (
                    <View
                      {...textPanResponder
                        .panHandlers}
                      style={[
                        styles.textLayer,
                        {
                          left:
                            textLayer.x,
                          top:
                            textLayer.y,
                          transform: [
                            {
                              scale:
                                textLayer.scale,
                            },
                          ],
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.storyText
                        }
                      >
                        {
                          textLayer.text
                        }
                      </Text>
                    </View>
                  )}

                  {textEditorVisible && (
                    <View
                      style={
                        styles.textEditor
                      }
                    >
                      <TextInput
                        autoFocus
                        value={
                          textValue
                        }
                        onChangeText={
                          setTextValue
                        }
                        placeholder="Hikâyene bir şeyler yaz..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        style={
                          styles.textEditorInput
                        }
                        maxLength={
                          200
                        }
                      />

                      <Pressable
                        onPress={
                          addText
                        }
                        style={
                          styles.textDone
                        }
                      >
                        <Text
                          style={
                            styles.textDoneText
                          }
                        >
                          Ekle
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setTextEditorVisible(
                            false
                          );
                          setTextValue(
                            ""
                          );
                        }}
                        style={
                          styles.textCancel
                        }
                      >
                        <Text
                          style={
                            styles.textCancelText
                          }
                        >
                          İptal
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.bottomTools
                  }
                >
                  <Pressable
                    onPress={() =>
                      openGallery(
                        "photos"
                      )
                    }
                    style={
                      styles.bottomTool
                    }
                  >
                    <Text
                      style={
                        styles.bottomToolText
                      }
                    >
                      Galeri
                    </Text>
                  </Pressable>

                  

                  <Text
                    style={
                      styles.gestureHint
                    }
                  >
                    İki parmakla büyüt / küçült
                  </Text>
                </View>
              </View>
            )}

            <MediaPickerModal
              visible={
                pickerVisible
              }
              initialTab={
                pickerTab
              }
              onClose={() =>
                setPickerVisible(
                  false
                )
              }
              onSelect={
                selectMedia
              }
            />
          </View>
        </ScreenWarpper>
      </KeyboardAvoidingView>
    );
  };

export default StoryShare;

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor:
        "#0F172A",
    },

camera: {
      flex: 1,
    },

cameraBottom: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: hp(5),
      alignItems:
        "center",
    },

captureInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor:
        "#F8FAFC",
    },

    emptyComposer: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    emptyTop: {
      height: hp(8),
      paddingHorizontal:
        wp(4),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    composerTitle: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
    },

    emptyCenter: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(7),
    },

    emptyTitle: {
      color:
        "#F8FAFC",
      fontSize:
        hp(2.6),
      fontWeight:
        theme.fonts.bold,
    },

    emptyDescription: {
      marginTop: 8,
      textAlign:
        "center",
      color:
        "#94A3B8",
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2.1),
    },

    sourceRow: {
      marginTop:
        hp(3),
      width: "100%",
      flexDirection:
        "row",
      gap:
        wp(2),
    },

    sourceButton: {
      flex: 1,
      minHeight: 110,
      borderRadius:
        theme.radius.xl,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    sourceIcon: {
      color:
        theme.colors
          .primary,
      fontSize: 30,
      fontWeight:
        "700",
    },

    sourceTitle: {
      marginTop: 8,
      color:
        "#F8FAFC",
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.bold,
    },

    sourceSub: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.1),
    },

    composer: {
      flex: 1,
      backgroundColor:
        "#000000",
    },

    composerHeader: {
      position:
        "absolute",
      zIndex: 50,
      top: hp(2),
      left: wp(3),
      right: wp(3),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    headerTools: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    circleButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.72)",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.15)",
    },

    closeText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(3),
      lineHeight:
        hp(3),
      includeFontPadding:
        false,
    },

toolButton: {
      minWidth: 44,
      height: 44,
      paddingHorizontal: 10,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.72)",
    },

    textTool: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.8),
      fontWeight:
        "800",
    },

    toolText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.3),
      fontWeight:
        "800",
    },

    shareSmall: {
      minWidth: 75,
      height: 42,
      paddingHorizontal:
        14,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
    },

    shareSmallText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.25),
      fontWeight:
        theme.fonts.bold,
    },

    disabled: {
      opacity: 0.45,
    },

    storyCanvas: {
      flex: 1,
      backgroundColor:
        "#000000",
      alignItems:
        "center",
      justifyContent:
        "center",
      overflow:
        "hidden",
    },

    mediaLayer: {
      width:
        COMPOSER_WIDTH,
      height:
        COMPOSER_HEIGHT,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    media: {
      width:
        "100%",
      height:
        "100%",
      backgroundColor:
        "#000000",
    },

    textLayer: {
      position:
        "absolute",
      minWidth: 60,
      maxWidth:
        SCREEN_WIDTH *
        0.84,
      alignItems:
        "center",
      paddingHorizontal:
        8,
      paddingVertical:
        4,
    },

    storyText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(3),
      lineHeight:
        hp(3.8),
      fontWeight:
        "800",
      textAlign:
        "center",
      textShadowColor:
        "rgba(0,0,0,0.8)",
      textShadowOffset: {
        width: 1,
        height: 2,
      },
      textShadowRadius: 4,
    },

    textEditor: {
      position:
        "absolute",
      left:
        wp(5),
      right:
        wp(5),
      top:
        hp(17),
      padding:
        wp(3),
      borderRadius:
        18,
      backgroundColor:
        "rgba(15,23,42,0.96)",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    textEditorInput: {
      minHeight: 90,
      maxHeight: 150,
      color:
        "#F8FAFC",
      fontSize:
        hp(2),
      padding:
        12,
      textAlign:
        "center",
    },

    textDone: {
      marginTop: 8,
      height: 44,
      borderRadius:
        22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
    },

    textDoneText: {
      color:
        "#F8FAFC",
      fontWeight:
        theme.fonts.bold,
    },

    textCancel: {
      marginTop: 4,
      alignItems:
        "center",
      padding:
        8,
    },

    textCancelText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
    },

    bottomTools: {
      position:
        "absolute",
      left: wp(4),
      right: wp(4),
      bottom: hp(3),
      zIndex: 50,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    bottomTool: {
      height: 42,
      paddingHorizontal:
        16,
      borderRadius:
        21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.76)",
    },

    bottomToolText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.2),
      fontWeight:
        theme.fonts
          .semibold,
    },

    gestureHint: {
      flex: 1,
      color:
        "#94A3B8",
      fontSize:
        hp(1.05),
      textAlign:
        "right",
    },
  });
