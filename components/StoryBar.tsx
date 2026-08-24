import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useFocusEffect,
  useRouter,
} from "expo-router";

import Avatar from "@/components/Avatar";

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
  getActiveStories,
} from "@/services/storyService";

interface Story {
  id: string;
  user_id: string;
  media_path: string;
  media_type:
    | "image"
    | "video";
  created_at: string;
  expires_at: string;
  user?: {
    id: string;
    name: string;
    image: string | null;
    username?: string | null;
  };
}

const StoryBar =
  () => {
    const router =
      useRouter();

    const auth =
      useAuth();

    const [
      stories,
      setStories,
    ] = useState<
      Story[]
    >([]);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const userId =
      auth?.user
        ?.authInfo?.id ||
      "";

    const myImage =
      auth?.user
        ?.userData
        ?.image ||
      null;

    const myName =
      auth?.user
        ?.userData
        ?.name ||
      "Sen";

    const loadStories =
      useCallback(
        async () => {
          if (!userId) {
            return;
          }

          setLoading(
            true
          );

          try {
            const result =
              await getActiveStories(
                userId
              );

            if (
              result.success
            ) {
              setStories(
                (result.data ||
                  []) as Story[]
              );
            } else {
              setStories(
                []
              );
            }
          } catch (
            error
          ) {
            console.warn(
              "StoryBar load error:",
              error
            );
          } finally {
            setLoading(
              false
            );
          }
        },
        [userId]
      );

    useFocusEffect(
      useCallback(
        () => {
          void loadStories();
        },
        [loadStories]
      )
    );

    const groupedStories =
      useMemo(() => {
        const groups =
          new Map<
            string,
            Story[]
          >();

        stories.forEach(
          story => {
            const key =
              story.user_id;

            const current =
              groups.get(
                key
              ) || [];

            current.push(
              story
            );

            groups.set(
              key,
              current
            );
          }
        );

        return Array.from(
          groups.values()
        ).map(
          group => ({
            user:
              group[0]
                .user,
            stories:
              group,
          })
        );
      }, [stories]);

    const myStories =
      groupedStories.find(
        group =>
          group.stories[0]
            ?.user_id ===
          userId
      );

    const otherStories =
      groupedStories.filter(
        group =>
          group.stories[0]
            ?.user_id !==
          userId
      );

    const openStory =
      (
        story: Story
      ) => {
        router.push({
          pathname:
            "/storyViewer" as any,
          params: {
            storyId:
              story.id,
            userName:
              story.user
                ?.username ||
              story.user
                ?.name ||
              "Kullanıcı",
            userImage:
              story.user
                ?.image ||
              "",
            mediaPath:
              story.media_path,
            mediaType:
              story.media_type,
          },
        });
      };

    const openMine =
      () => {
        if (
          myStories &&
          myStories
            .stories
            .length > 0
        ) {
          openStory(
            myStories
              .stories[0]
          );
          return;
        }

        router.push(
          "/storyShare"
        );
      };

    return (
      <View
        style={
          styles.container
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          bounces={false}
          contentContainerStyle={
            styles.content
          }
        >
          <Pressable
            onPress={
              openMine
            }
            style={
              styles.storyItem
            }
          >
            <View
              style={
                styles.myStoryWrapper
              }
            >
              <View
                style={[
                  styles.avatarShell,
                  myStories &&
                    styles.avatarShellActive,
                ]}
              >
                <Avatar
                  uri={
                    myImage
                  }
                  size={
                    hp(7.8)
                  }
                  rounded={
                    hp(3.9)
                  }
                />
              </View>

              <View
                style={
                  styles.plusButton
                }
              >
                <Text
                  style={
                    styles.plusText
                  }
                >
                  +
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.storyName
              }
              numberOfLines={1}
            >
              {myStories
                ? "Hikâyen"
                : "Hikâye ekle"}
            </Text>
          </Pressable>

          {loading ? (
            <View
              style={
                styles.loadingBox
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  theme.colors
                    .primary
                }
              />
            </View>
          ) : (
            otherStories.map(
              group => {
                const story =
                  group
                    .stories[0];

                if (
                  !story
                ) {
                  return null;
                }

                return (
                  <Pressable
                    key={
                      story
                        .user_id
                    }
                    onPress={() =>
                      openStory(
                        story
                      )
                    }
                    style={
                      styles.storyItem
                    }
                  >
                    <View
                      style={
                        styles.ring
                      }
                    >
                      <View
                        style={
                          styles.innerRing
                        }
                      >
                        <Avatar
                          uri={
                            story
                              .user
                              ?.image ||
                            null
                          }
                          size={
                            hp(7.1)
                          }
                          rounded={
                            hp(
                              3.55
                            )
                          }
                        />
                      </View>
                    </View>

                    <Text
                      style={
                        styles.storyName
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {story
                        .user
                        ?.username ||
                        story
                          .user
                          ?.name ||
                        "Kullanıcı"}
                    </Text>
                  </Pressable>
                );
              }
            )
          )}
        </ScrollView>
      </View>
    );
  };

export default StoryBar;

const styles =
  StyleSheet.create({
    container: {
      width: "100%",
      backgroundColor:
        theme.colors
          .background,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        theme.colors.gray,
      paddingTop:
        hp(0.8),
      paddingBottom:
        hp(1.2),
    },

    content: {
      paddingHorizontal:
        wp(4),
      gap:
        wp(2.5),
      alignItems:
        "flex-start",
    },

    storyItem: {
      width:
        wp(18),
      alignItems:
        "center",
    },

    myStoryWrapper: {
      position:
        "relative",
    },

    avatarShell: {
      width:
        hp(8.4),
      height:
        hp(8.4),
      borderRadius:
        hp(4.2),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    avatarShellActive: {
      borderWidth: 2,
      borderColor:
        theme.colors
          .primary,
    },

    ring: {
      width:
        hp(8.4),
      height:
        hp(8.4),
      borderRadius:
        hp(4.2),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        theme.colors
          .primary,
    },

    innerRing: {
      width:
        hp(7.6),
      height:
        hp(7.6),
      borderRadius:
        hp(3.8),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
    },

    plusButton: {
      position:
        "absolute",
      right: -1,
      bottom: -1,
      width:
        hp(3),
      height:
        hp(3),
      borderRadius:
        hp(1.5),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .primary,
      borderWidth: 2,
      borderColor:
        theme.colors
          .background,
    },

    plusText: {
      color:
        theme.colors
          .text,
      fontSize:
        hp(2.1),
      lineHeight:
        hp(2.1),
      fontWeight:
        theme.fonts.bold,
      includeFontPadding:
        false,
    },

    storyName: {
      marginTop: 6,
      width:
        wp(17),
      textAlign:
        "center",
      fontSize:
        hp(1.3),
      color:
        "#94A3B8",
    },

    loadingBox: {
      width:
        wp(18),
      height:
        hp(8.4),
      alignItems:
        "center",
      justifyContent:
        "center",
    },
  });
