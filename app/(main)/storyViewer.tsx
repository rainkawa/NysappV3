import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  Video,
  ResizeMode,
} from "expo-av";

import Avatar from "@/components/Avatar";
import Icon from "@/assets/icons";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
  getSupabaseFileUrl,
} from "@/helpers/common";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  addStoryComment,
  deleteStory,
  getActiveStories,
  getStoryInteractions,
  highlightStory,
  markStoryViewed,
  toggleStoryLike,
  type Story,
} from "@/services/storyService";

const {
  width,
  height,
} = Dimensions.get(
  "window"
);

const IMAGE_DURATION =
  5000;

type FeedStory =
  Story & {
    user?: Story["user"];
  };

const StoryViewer =
  () => {
    const router =
      useRouter();

    const params =
      useLocalSearchParams();

    const auth =
      useAuth();

    const userId =
      auth?.user?.authInfo
        ?.id || "";

    const initialStoryId =
      String(
        params.storyId || ""
      );

    const initialUserId =
      String(
        params.userId || ""
      );

    const [
      stories,
      setStories,
    ] = useState<
      FeedStory[]
    >([]);

    const [
      currentIndex,
      setCurrentIndex,
    ] = useState(0);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      progress,
      setProgress,
    ] = useState(0);

    const [
      paused,
      setPaused,
    ] = useState(false);

    const [
      liked,
      setLiked,
    ] = useState(false);

    const [
      likeCount,
      setLikeCount,
    ] = useState(0);

    const [
      viewerCount,
      setViewerCount,
    ] = useState(0);

    const [
      comments,
      setComments,
    ] = useState<
      any[]
    >([]);

    const [
      comment,
      setComment,
    ] = useState("");

    const [
      showInteractions,
      setShowInteractions,
    ] = useState(
      false
    );

    const [
      menuVisible,
      setMenuVisible,
    ] = useState(false);

    const [
      ratio,
      setRatio,
    ] = useState(
      0.5625
    );

    const [
      imageError,
      setImageError,
    ] = useState(false);

    const timerRef =
      useRef<
        ReturnType<
          typeof setInterval
        > | null
      >(null);

    const videoRef =
      useRef<Video>(
        null
      );

    const currentStory =
      stories[
        currentIndex
      ];

    const storyScale =
      Number(
        currentStory?.transform_scale ||
          1
      );

    const storyOffsetX =
      Number(
        currentStory?.transform_x ||
          0
      );

    const storyOffsetY =
      Number(
        currentStory?.transform_y ||
          0
      );

    const ownerId =
      currentStory?.user_id ||
      initialUserId;

    const isOwner =
      !!userId &&
      !!ownerId &&
      userId ===
        ownerId;

    const mediaUri =
      useMemo(() => {
        if (
          !currentStory
        ) {
          return "";
        }

        if (
          currentStory.media_path.startsWith(
            "http"
          )
        ) {
          return currentStory.media_path;
        }

        return (
          getSupabaseFileUrl(
            currentStory.media_path
          )?.uri || ""
        );
      }, [
        currentStory,
      ]);

    const currentUserName =
      currentStory
        ?.user
        ?.username ||
      currentStory
        ?.user
        ?.name ||
      String(
        params.userName ||
          "Kullanıcı"
      );

    const currentUserImage =
      currentStory
        ?.user
        ?.image ||
      (params.userImage
        ? String(
            params.userImage
          )
        : null);

    const ownerStories =
      useMemo(
        () =>
          stories.filter(
            story =>
              story.user_id ===
              ownerId
          ),
        [
          stories,
          ownerId,
        ]
      );

    const ownerStoryIndex =
      ownerStories.findIndex(
        story =>
          story.id ===
          currentStory?.id
      );

    const refreshInteractions =
      async () => {
        if (
          !currentStory
        ) {
          return;
        }

        const result =
          await getStoryInteractions(
            currentStory.id
          );

        if (
          !result.success
        ) {
          return;
        }

        const data =
          result.data || {};

        const likes =
          data.likes ||
          [];

        const views =
          data.views ||
          [];

        const nextComments =
          data.comments ||
          [];

        setLikeCount(
          likes.length
        );

        setViewerCount(
          views.length
        );

        setComments(
          nextComments
        );

        setLiked(
          likes.some(
            (item: any) =>
              item.user_id ===
              userId
          )
        );
      };

    useEffect(() => {
      let cancelled =
        false;

      const load =
        async () => {
          if (!userId) {
            setLoading(
              false
            );
            return;
          }

          try {
            const result =
              await getActiveStories(
                userId
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              !result.success
            ) {
              setStories(
                []
              );
              return;
            }

            const loaded =
              (
                (result.data ||
                  []) as FeedStory[]
              ).sort(
                (
                  a,
                  b
                ) =>
                  new Date(
                    a.created_at
                  ).getTime() -
                  new Date(
                    b.created_at
                  ).getTime()
              );

            setStories(
              loaded
            );

            let startIndex =
              loaded.findIndex(
                story =>
                  story.id ===
                  initialStoryId
              );

            if (
              startIndex <
                0 &&
              initialUserId
            ) {
              startIndex =
                loaded.findIndex(
                  story =>
                    story.user_id ===
                    initialUserId
                );
            }

            setCurrentIndex(
              startIndex >=
                0
                ? startIndex
                : 0
            );
          } catch (
            error
          ) {
            console.warn(
              "Story Viewer load error:",
              error
            );
          } finally {
            if (
              !cancelled
            ) {
              setLoading(
                false
              );
            }
          }
        };

      void load();

      return () => {
        cancelled = true;
      };
    }, [
      userId,
      initialStoryId,
      initialUserId,
    ]);

    useEffect(() => {
      if (
        !currentStory
      ) {
        return;
      }

      setProgress(
        0
      );

      setPaused(
        false
      );

      setMenuVisible(
        false
      );

      setShowInteractions(
        false
      );

      setImageError(
        false
      );

      void markStoryViewed(
        currentStory.id,
        userId
      );

      void refreshInteractions();
    }, [
      currentStory?.id,
      userId,
    ]);

    useEffect(() => {
      if (
        !currentStory ||
        currentStory.media_type !==
          "image"
      ) {
        return;
      }

      Image.getSize(
        mediaUri,
        (
          imageWidth,
          imageHeight
        ) => {
          if (
            !imageWidth ||
            !imageHeight
          ) {
            return;
          }

          const nextRatio =
            imageWidth /
            imageHeight;

          setRatio(
            Math.min(
              Math.max(
                nextRatio,
                0.5625
              ),
              0.7
            )
          );
        },
        () => {
          setRatio(
            0.5625
          );
        }
      );
    }, [
      currentStory?.id,
      mediaUri,
    ]);

    useEffect(() => {
      if (
        !currentStory ||
        paused
      ) {
        if (
          timerRef.current
        ) {
          clearInterval(
            timerRef.current
          );

          timerRef.current =
            null;
        }

        return;
      }

      const duration =
        currentStory.media_type ===
        "video"
          ? 15000
          : IMAGE_DURATION;

      if (
        timerRef.current
      ) {
        clearInterval(
          timerRef.current
        );
      }

      timerRef.current =
        setInterval(() => {
          setProgress(
            previous => {
              const next =
                previous +
                10000 /
                  duration;

              if (
                next >=
                100
              ) {
                void goNext();
                return 0;
              }

              return next;
            }
          );
        }, 500);

      return () => {
        if (
          timerRef.current
        ) {
          clearInterval(
            timerRef.current
          );

          timerRef.current =
            null;
        }
      };
    }, [
      currentStory?.id,
      paused,
    ]);

    const goNext =
      async () => {
        if (
          !currentStory
        ) {
          return;
        }

        const nextOwnerIndex =
          ownerStories.findIndex(
            story =>
              story.id ===
              currentStory.id
          );

        if (
          nextOwnerIndex >=
            0 &&
          nextOwnerIndex <
            ownerStories.length -
              1
        ) {
          const nextStory =
            ownerStories[
              nextOwnerIndex +
                1
            ];

          const absolute =
            stories.findIndex(
              story =>
                story.id ===
                nextStory.id
            );

          if (
            absolute >=
            0
          ) {
            setCurrentIndex(
              absolute
            );

            setProgress(
              0
            );

            return;
          }
        }

        const nextGlobal =
          currentIndex + 1;

        if (
          nextGlobal <
          stories.length
        ) {
          setCurrentIndex(
            nextGlobal
          );

          setProgress(
            0
          );

          return;
        }

        router.back();
      };

    const goPrevious =
      () => {
        if (
          !currentStory
        ) {
          return;
        }

        const ownerIndex =
          ownerStories.findIndex(
            story =>
              story.id ===
              currentStory.id
          );

        if (
          ownerIndex >
          0
        ) {
          const previousStory =
            ownerStories[
              ownerIndex -
                1
            ];

          const absolute =
            stories.findIndex(
              story =>
                story.id ===
                previousStory.id
            );

          if (
            absolute >=
            0
          ) {
            setCurrentIndex(
              absolute
            );

            setProgress(
              0
            );

            return;
          }
        }

        if (
          currentIndex >
          0
        ) {
          setCurrentIndex(
            current =>
              current - 1
          );

          setProgress(
            0
          );

          return;
        }

        router.back();
      };

    const toggleLike =
      async () => {
        if (
          !currentStory ||
          !userId
        ) {
          return;
        }

        const result =
          await toggleStoryLike(
            currentStory.id,
            userId
          );

        if (
          result.success
        ) {
          setLiked(
            Boolean(
              result.data
            )
          );

          setLikeCount(
            previous =>
              Boolean(
                result.data
              )
                ? previous +
                  1
                : Math.max(
                    previous -
                      1,
                    0
                  )
          );
        }
      };

    const submitComment =
      async () => {
        if (
          !currentStory ||
          !userId ||
          !comment.trim()
        ) {
          return;
        }

        const result =
          await addStoryComment(
            currentStory.id,
            userId,
            comment
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

        setComment(
          ""
        );

        await refreshInteractions();
      };

    const deleteCurrent =
      async () => {
        if (
          !currentStory
        ) {
          return;
        }

        const result =
          await deleteStory(
            currentStory.id
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

        const remaining =
          stories.filter(
            story =>
              story.id !==
              currentStory.id
          );

        if (
          remaining.length ===
          0
        ) {
          router.back();
          return;
        }

        setStories(
          remaining
        );

        setCurrentIndex(
          current =>
            Math.min(
              current,
              remaining.length -
                1
            )
        );
      };

    const handleDelete =
      () => {
        Alert.alert(
          "Hikâyeyi sil",
          "Bu hikâyeyi silmek istediğine emin misin?",
          [
            {
              text:
                "Vazgeç",
              style:
                "cancel",
            },
            {
              text:
                "Sil",
              style:
                "destructive",
              onPress:
                deleteCurrent,
            },
          ]
        );
      };

    const handleHighlight =
      async () => {
        if (
          !currentStory ||
          !userId
        ) {
          return;
        }

        const result =
          await highlightStory(
            currentStory.id,
            userId
          );

        Alert.alert(
          "Hikâye",
          result.message
        );

        setMenuVisible(
          false
        );
      };

    const handleHoldStart =
      async () => {
        setPaused(
          true
        );

        if (
          currentStory?.media_type ===
          "video"
        ) {
          try {
            await videoRef.current?.pauseAsync();
          } catch {}
        }
      };

    const handleHoldEnd =
      async () => {
        setPaused(
          false
        );

        if (
          currentStory?.media_type ===
          "video"
        ) {
          try {
            await videoRef.current?.playAsync();
          } catch {}
        }
      };

    const frameHeight =
      Math.min(
        height *
          0.74,
        width /
          Math.max(
            ratio,
            0.5625
          )
      );

    if (
      loading ||
      !currentStory
    ) {
      return (
        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={
              styles.loadingText
            }
          >
            Hikâye açılıyor...
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.container
        }
      >
        <View
          style={[
            styles.storyFrame,
            {
              height:
                frameHeight,
            },
          ]}
        >
          {currentStory.media_type ===
          "video" ? (
            <Video
              ref={
                videoRef
              }
              source={{
                uri:
                  mediaUri,
              }}
              style={
                styles.media
              }
              resizeMode={
                ResizeMode.CONTAIN
              }
              shouldPlay={
                !paused
              }
              isLooping={false}
              onPlaybackStatusUpdate={status => {
                if (
                  !status.isLoaded
                ) {
                  return;
                }

                if (
                  status.didJustFinish
                ) {
                  void goNext();
                }
              }}
            />
          ) : !imageError ? (
            <Image
              source={{
                uri:
                  mediaUri,
              }}
              style={
                styles.media
              }
              resizeMode="contain"
              onError={() =>
                setImageError(
                  true
                )
              }
            />
          ) : (
            <View
              style={
                styles.mediaError
              }
            >
              <Text
                style={
                  styles.mediaErrorText
                }
              >
                Medya yüklenemedi
              </Text>
            </View>
          )}
        </View>

        <View
          style={
            styles.topOverlay
          }
        >
          <View
            style={
              styles.progressRow
            }
          >
            {ownerStories.map(
              (
                story
              ) => {
                const absolute =
                  stories.findIndex(
                    item =>
                      item.id ===
                      story.id
                  );

                const complete =
                  absolute <
                  currentIndex;

                const active =
                  absolute ===
                  currentIndex;

                return (
                  <View
                    key={
                      story.id
                    }
                    style={
                      styles.progressTrack
                    }
                  >
                    <View
                      style={[
                        styles.progressFill,
                        complete && {
                          width:
                            "100%",
                        },
                        active && {
                          width:
                            `${progress}%`,
                        },
                      ]}
                    />
                  </View>
                );
              }
            )}
          </View>

          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.userInfo
            }
            >
              <Avatar
                uri={
                  currentUserImage
                }
                size={
                  hp(4.5)
                }
                rounded={
                  hp(2.25)
                }
              />

              <View>
                <Text
                  style={
                    styles.userName
                  }
                >
                  {
                    currentUserName
                  }
                </Text>

                {isOwner && (
                  <Text
                    style={
                      styles.ownerLabel
                    }
                  >
                    Hikâyen
                  </Text>
                )}
              </View>
            </View>

            <View
              style={
                styles.headerActions
              }
            >
              {isOwner && (
                <Pressable
                  onPress={() =>
                    setMenuVisible(
                      value =>
                        !value
                    )
                  }
                  style={
                    styles.actionCircle
                  }
                >
                  <Text
                    style={
                      styles.more
                    }
                  >
                    •••
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  router.back()
                }
                style={
                  styles.actionCircle
                }
              >
                <Icon
                  name="cancel"
                  size={22}
                  color="#F8FAFC"
                />
              </Pressable>
            </View>
          </View>

          {menuVisible &&
            isOwner && (
              <View
                style={
                  styles.menu
                }
              >
                <Pressable
                  onPress={
                    handleHighlight
                  }
                  style={
                    styles.menuItem
                  }
                >
                  <Text
                    style={
                      styles.menuText
                    }
                  >
                    Öne çıkar
                  </Text>
                </Pressable>

                <Pressable
                  onPress={
                    handleDelete
                  }
                  style={
                    styles.menuItem
                  }
                >
                  <Text
                    style={
                      styles.deleteText
                    }
                  >
                    Hikâyeyi sil
                  </Text>
                </Pressable>
              </View>
            )}
        </View>

        <View
          style={
            styles.touchZones
          }
        >
          <Pressable
            style={
              styles.leftZone
            }
            onPress={
              goPrevious
            }
            onLongPress={
              handleHoldStart
            }
            onPressOut={
              handleHoldEnd
            }
            delayLongPress={
              250
            }
          />

          <Pressable
            style={
              styles.rightZone
            }
            onPress={
              goNext
            }
            onLongPress={
              handleHoldStart
            }
            onPressOut={
              handleHoldEnd
            }
            delayLongPress={
              250
            }
          />
        </View>

        <View
          style={
            styles.bottom
          }
        >
          {isOwner && (
            <Pressable
              onPress={() =>
                setShowInteractions(
                  value =>
                    !value
                )
              }
              style={
                styles.stats
              }
            >
              <Text
                style={
                  styles.statsText
                }
              >
                {viewerCount} görüntüleme ·{" "}
                {likeCount} beğeni
              </Text>
            </Pressable>
          )}

          {isOwner &&
            showInteractions && (
              <View
                style={
                  styles.interactions
                }
              >
                <Text
                  style={
                    styles.interactionsTitle
                  }
                >
                  Hikâye etkileşimleri
                </Text>

                <Text
                  style={
                    styles.interactionsSubtitle
                  }
                >
                  {viewerCount} görüntüleme ·{" "}
                  {likeCount} beğeni
                </Text>

                {comments
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      item: any
                    ) => (
                      <View
                        key={
                          item.id
                        }
                        style={
                          styles.commentRow
                        }
                      >
                        <Avatar
                          uri={
                            item
                              .user
                              ?.image ||
                            null
                          }
                          size={
                            hp(3.8)
                          }
                          rounded={
                            hp(1.9)
                          }
                        />

                        <View
                          style={
                            styles.commentCopy
                          }
                        >
                          <Text
                            style={
                              styles.commentName
                            }
                          >
                            {item.user?.username ||
                              item.user?.name ||
                              "Kullanıcı"}
                          </Text>

                          <Text
                            style={
                              styles.commentBody
                            }
                          >
                            {
                              item.body
                            }
                          </Text>
                        </View>
                      </View>
                    )
                  )}
              </View>
            )}

          {!isOwner && (
            <View
              style={
                styles.replyRow
              }
            >
              <TextInput
                value={
                  comment
                }
                onChangeText={
                  setComment
                }
                placeholder="Hikâyeye yanıt ver..."
                placeholderTextColor="#94A3B8"
                style={
                  styles.replyInput
                }
                maxLength={
                  500
                }
                onFocus={() =>
                  setPaused(
                    true
                  )
                }
              />

              <Pressable
                onPress={
                  submitComment
                }
                style={
                  styles.commentSend
                }
              >
                <Text
                  style={
                    styles.commentSendText
                  }
                >
                  Gönder
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  toggleLike
                }
                style={[
                  styles.like,
                  liked &&
                    styles.likeActive,
                ]}
              >
                <Text
                  style={
                    styles.likeText
                  }
                >
                  {liked
                    ? "♥"
                    : "♡"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

export default StoryViewer;

const styles =
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      backgroundColor:
        "#000000",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.6),
    },

    container: {
      flex: 1,
      backgroundColor:
        "#000000",
    },

    storyFrame: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: "12%",
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#000000",
    },

    media: {
      width:
        "100%",
      height:
        "100%",
      backgroundColor:
        "#000000",
    },

    mediaError: {
      flex: 1,
      width: "100%",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    mediaErrorText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.5),
    },

    topOverlay: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: 0,
      paddingTop:
        hp(1.2),
      paddingHorizontal:
        wp(3),
      zIndex: 30,
    },

    progressRow: {
      flexDirection:
        "row",
      gap: 3,
    },

    progressTrack: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      overflow:
        "hidden",
      backgroundColor:
        "rgba(248,250,252,0.28)",
    },

    progressFill: {
      height:
        "100%",
      width: 0,
      backgroundColor:
        theme.colors
          .primary,
    },

    header: {
      marginTop:
        hp(1),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    userInfo: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        wp(2.5),
    },

    userName: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.6),
      fontWeight:
        theme.fonts
          .bold,
    },

    ownerLabel: {
      marginTop: 2,
      color:
        "#94A3B8",
      fontSize:
        hp(1.1),
    },

    headerActions: {
      flexDirection:
        "row",
      gap: 6,
    },

    actionCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.58)",
    },

    more: {
      color:
        "#F8FAFC",
      fontSize: 18,
      letterSpacing: 2,
      marginTop:
        -4,
    },

    menu: {
      position:
        "absolute",
      top:
        hp(7.5),
      right:
        wp(3),
      width: 175,
      borderRadius:
        16,
      overflow:
        "hidden",
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
    },

    menuItem: {
      paddingHorizontal:
        16,
      paddingVertical:
        14,
    },

    menuText: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts
          .semibold,
    },

    deleteText: {
      color:
        theme.colors
          .rose,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts
          .semibold,
    },

    touchZones: {
      ...StyleSheet.absoluteFillObject,
      flexDirection:
        "row",
      zIndex: 10,
    },

    leftZone: {
      width:
        "50%",
      height:
        "100%",
    },

    rightZone: {
      width:
        "50%",
      height:
        "100%",
    },

    bottom: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal:
        wp(3),
      paddingBottom:
        hp(2),
      zIndex: 40,
    },

    stats: {
      alignSelf:
        "flex-start",
      paddingHorizontal:
        12,
      paddingVertical:
        8,
      borderRadius:
        18,
      backgroundColor:
        "rgba(15,23,42,0.7)",
      marginBottom: 8,
    },

    statsText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.2),
      fontWeight:
        theme.fonts
          .semibold,
    },

    interactions: {
      maxHeight:
        hp(34),
      padding: 14,
      borderRadius:
        18,
      marginBottom: 8,
      backgroundColor:
        "rgba(15,23,42,0.94)",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.12)",
    },

    interactionsTitle: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts
          .bold,
    },

    interactionsSubtitle: {
      marginTop: 4,
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
    },

    commentRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      marginTop: 9,
    },

    commentCopy: {
      flex: 1,
    },

    commentName: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.2),
      fontWeight:
        theme.fonts
          .semibold,
    },

    commentBody: {
      marginTop: 2,
      color:
        "#CBD5E1",
      fontSize:
        hp(1.15),
    },

    replyRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
    },

    replyInput: {
      flex: 1,
      minHeight: 46,
      maxHeight: 100,
      paddingHorizontal:
        14,
      borderRadius:
        23,
      backgroundColor:
        "rgba(15,23,42,0.86)",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.18)",
      color:
        "#F8FAFC",
    },

    commentSend: {
      minHeight: 44,
      paddingHorizontal:
        13,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
    },

    commentSendText: {
      color:
        "#F8FAFC",
      fontSize:
        hp(1.2),
      fontWeight:
        theme.fonts
          .bold,
    },

    like: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.86)",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.18)",
    },

    likeActive: {
      backgroundColor:
        "rgba(251,113,133,0.16)",
      borderColor:
        theme.colors
          .rose,
    },

    likeText: {
      color:
        "#F8FAFC",
      fontSize: 22,
    },
  });
