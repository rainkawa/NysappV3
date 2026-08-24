import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import * as MediaLibrary from "expo-media-library";

import {
  hp,
  wp,
} from "@/helpers/common";

import {
  theme,
} from "@/constants/theme";

type MediaTab =
  | "photos"
  | "videos";

interface MediaPickerResult {
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

interface MediaPickerModalProps {
  visible: boolean;
  initialTab?: MediaTab;
  onClose: () => void;
  onSelect: (
    media: MediaPickerResult
  ) => void;
}

const SCREEN_WIDTH =
  Dimensions.get(
    "window"
  ).width;

const GAP = 3;

const TILE_SIZE =
  (SCREEN_WIDTH -
    wp(4) * 2 -
    GAP * 2) /
  3;

const MediaPickerModal:
  React.FC<
    MediaPickerModalProps
  > = ({
    visible,
    initialTab = "photos",
    onClose,
    onSelect,
  }) => {
    const [
      permissionDenied,
      setPermissionDenied,
    ] = useState(false);

    const [
      loading,
      setLoading,
    ] = useState(false);

    const [
      tab,
      setTab,
    ] =
      useState<MediaTab>(
        initialTab
      );

    const [
      assets,
      setAssets,
    ] = useState<
      MediaLibrary.Asset[]
    >([]);

    const [
      selectedId,
      setSelectedId,
    ] = useState<
      string | null
    >(null);

    useEffect(() => {
      if (!visible) {
        return;
      }

      setTab(
        initialTab
      );
      setSelectedId(
        null
      );

      void loadMedia();
    }, [
      visible,
      initialTab,
    ]);

    const loadMedia =
      async () => {
        setLoading(true);

        try {
          const permission =
            await MediaLibrary.requestPermissionsAsync();

          if (
            permission.status !==
            "granted"
          ) {
            setPermissionDenied(
              true
            );
            return;
          }

          setPermissionDenied(
            false
          );

          const mediaType =
            tab === "photos"
              ? MediaLibrary.MediaType.photo
              : MediaLibrary.MediaType.video;

          const result =
            await MediaLibrary.getAssetsAsync(
              {
                mediaType,
                first: 150,
                sortBy: [
                  MediaLibrary.SortBy.creationTime,
                ],
              }
            );

          setAssets(
            result.assets
          );
        } catch (
          error
        ) {
          console.warn(
            "MediaPicker load error:",
            error
          );

          setAssets([]);
        } finally {
          setLoading(false);
        }
      };

    useEffect(() => {
      if (!visible) {
        return;
      }

      void loadMedia();
    }, [tab]);

    const selectedAsset =
      useMemo(
        () =>
          assets.find(
            asset =>
              asset.id ===
              selectedId
          ),
        [
          assets,
          selectedId,
        ]
      );

    const formatDuration =
      (
        seconds?: number
      ) => {
        if (
          !seconds ||
          seconds <= 0
        ) {
          return "";
        }

        const total =
          Math.floor(
            seconds
          );

        const minutes =
          Math.floor(
            total / 60
          );

        const secs =
          total % 60;

        return `${minutes}:${secs
          .toString()
          .padStart(2, "0")}`;
      };

    const handleUse =
      async () => {
        if (
          !selectedAsset
        ) {
          return;
        }

        const info =
          await MediaLibrary.getAssetInfoAsync(
            selectedAsset
          );

        const result: MediaPickerResult =
          {
            uri:
              info.localUri ||
              selectedAsset.uri,
            type:
              selectedAsset.mediaType ===
              MediaLibrary.MediaType.video
                ? "video"
                : "image",
            width:
              selectedAsset.width,
            height:
              selectedAsset.height,
            duration:
              selectedAsset.duration,
            fileSize:
              undefined,
            mimeType:
              undefined,
            fileName:
              selectedAsset.filename,
          };

        onSelect(
          result
        );
      };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={
          onClose
        }
      >
        <SafeAreaView
          style={
            styles.safeArea
          }
        >
          <View
            style={
              styles.container
            }
          >
            <View
              style={
                styles.header
              }
            >
              <Pressable
                onPress={
                  onClose
                }
                hitSlop={10}
                style={
                  styles.headerButton
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
                  styles.title
                }
              >
                Medya seç
              </Text>

              <Pressable
                disabled={
                  !selectedAsset
                }
                onPress={
                  handleUse
                }
                style={[
                  styles.useButton,
                  !selectedAsset &&
                    styles.useButtonDisabled,
                ]}
              >
                <Text
                  style={
                    styles.useButtonText
                  }
                >
                  Kullan
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.tabs
              }
            >
              <Pressable
                onPress={() =>
                  setTab(
                    "photos"
                  )
                }
                style={[
                  styles.tab,
                  tab === "photos" &&
                    styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab ===
                      "photos" &&
                      styles.tabTextActive,
                  ]}
                >
                  Fotoğraflar
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setTab(
                    "videos"
                  )
                }
                style={[
                  styles.tab,
                  tab === "videos" &&
                    styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab ===
                      "videos" &&
                      styles.tabTextActive,
                  ]}
                >
                  Videolar
                </Text>
              </Pressable>
            </View>

            {permissionDenied ? (
              <View
                style={
                  styles.center
                }
              >
                <View
                  style={
                    styles.permissionIcon
                  }
                >
                  <Text
                    style={
                      styles.permissionEmoji
                    }
                  >
                    🖼️
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Galeri erişimi gerekli
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Nysapp'in fotoğraf ve
                  videolarını gösterebilmesi
                  için medya erişimine izin
                  vermen gerekiyor.
                </Text>
              </View>
            ) : loading ? (
              <View
                style={
                  styles.center
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    theme.colors
                      .primary
                  }
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Galerin yükleniyor...
                </Text>
              </View>
            ) : assets.length ===
              0 ? (
              <View
                style={
                  styles.center
                }
              >
                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {tab === "photos"
                    ? "Fotoğraf bulunamadı"
                    : "Video bulunamadı"}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Cihazında bu türde medya
                  bulunmuyor.
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.grid
                }
              >
                {assets.map(
                  (
                    asset
                  ) => {
                    const selected =
                      asset.id ===
                      selectedId;

                    return (
                      <Pressable
                        key={
                          asset.id
                        }
                        onPress={() =>
                          setSelectedId(
                            asset.id
                          )
                        }
                        style={
                          styles.tile
                        }
                      >
                        <Image
                          source={{
                            uri:
                              asset.uri,
                          }}
                          style={
                            styles.tileImage
                          }
                        />

                        {tab ===
                          "videos" && (
                          <View
                            style={
                              styles.durationBadge
                            }
                          >
                            <Text
                              style={
                                styles.durationText
                              }
                            >
                              {formatDuration(
                                asset.duration
                              )}
                            </Text>
                          </View>
                        )}

                        {selected && (
                          <View
                            style={
                              styles.selectedOverlay
                            }
                          >
                            <View
                              style={
                                styles.check
                              }
                            >
                              <Text
                                style={
                                  styles.checkText
                                }
                              >
                                ✓
                              </Text>
                            </View>
                          </View>
                        )}
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}

            {selectedAsset && (
              <View
                style={
                  styles.selectionBar
                }
              >
                <Image
                  source={{
                    uri:
                      selectedAsset.uri,
                  }}
                  style={
                    styles.preview
                  }
                />

                <View
                  style={
                    styles.selectionCopy
                  }
                >
                  <Text
                    style={
                      styles.selectionTitle
                    }
                    numberOfLines={
                      1
                    }
                  >
                    Medya seçildi
                  </Text>

                  <Text
                    style={
                      styles.selectionSubtitle
                    }
                  >
                    {tab ===
                    "photos"
                      ? "Fotoğraf paylaşmaya hazır"
                      : "Video paylaşmaya hazır"}
                  </Text>
                </View>

                <Pressable
                  onPress={
                    handleUse
                  }
                  style={
                    styles.selectionAction
                  }
                >
                  <Text
                    style={
                      styles.selectionActionText
                    }
                  >
                    Ekle
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

export default MediaPickerModal;

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    container: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    header: {
      height: hp(7),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        wp(4),
      borderBottomWidth: 1,
      borderBottomColor:
        theme.colors.gray,
    },

    headerButton: {
      width: 44,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    closeText: {
      color:
        theme.colors.text,
      fontSize:
        hp(3.3),
      lineHeight:
        hp(3.3),
      includeFontPadding:
        false,
    },

    title: {
      color:
        theme.colors.text,
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts.bold,
    },

    useButton: {
      paddingHorizontal:
        wp(3.5),
      height: 40,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 20,
      backgroundColor:
        theme.colors
          .primary,
    },

    useButtonDisabled: {
      opacity: 0.35,
    },

    useButtonText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.bold,
    },

    tabs: {
      flexDirection:
        "row",
      paddingHorizontal:
        wp(4),
      paddingTop:
        hp(1),
      borderBottomWidth: 1,
      borderBottomColor:
        theme.colors.gray,
    },

    tab: {
      flex: 1,
      height: 46,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderBottomWidth: 2,
      borderBottomColor:
        "transparent",
    },

    tabActive: {
      borderBottomColor:
        theme.colors
          .primary,
    },

    tabText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts
          .semibold,
    },

    tabTextActive: {
      color:
        theme.colors.text,
    },

    grid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: GAP,
      padding:
        wp(4),
      paddingBottom:
        hp(14),
    },

    tile: {
      width:
        TILE_SIZE,
      height:
        TILE_SIZE,
      position:
        "relative",
      overflow:
        "hidden",
      backgroundColor:
        theme.colors.card,
    },

    tileImage: {
      width: "100%",
      height: "100%",
    },

    selectedOverlay: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor:
        "rgba(129,140,248,0.35)",
      alignItems:
        "flex-end",
      padding: 8,
    },

    check: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
      borderWidth: 2,
      borderColor:
        theme.colors.text,
    },

    checkText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.7),
      fontWeight:
        "800",
      lineHeight:
        hp(1.8),
    },

    durationBadge: {
      position:
        "absolute",
      right: 8,
      bottom: 8,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor:
        "rgba(15,23,42,0.78)",
    },

    durationText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.1),
      fontWeight:
        theme.fonts
          .semibold,
    },

    center: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(10),
    },

    loadingText: {
      marginTop:
        hp(1),
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
    },

    permissionIcon: {
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
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    permissionEmoji: {
      fontSize:
        hp(3),
    },

    emptyTitle: {
      marginTop:
        hp(1.5),
      color:
        theme.colors.text,
      fontSize:
        hp(1.9),
      fontWeight:
        theme.fonts.bold,
      textAlign:
        "center",
    },

    emptyText: {
      marginTop:
        hp(0.7),
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
      lineHeight:
        hp(2),
      textAlign:
        "center",
      maxWidth:
        wp(75),
    },

    selectionBar: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight:
        hp(8.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(1),
      backgroundColor:
        theme.colors.card,
      borderTopWidth: 1,
      borderTopColor:
        theme.colors.gray,
      gap:
        wp(3),
    },

    preview: {
      width:
        hp(6),
      height:
        hp(6),
      borderRadius:
        theme.radius.md,
    },

    selectionCopy: {
      flex: 1,
    },

    selectionTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts.bold,
    },

    selectionSubtitle: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
    },

    selectionAction: {
      minWidth: 72,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
    },

    selectionActionText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.bold,
    },
  });
