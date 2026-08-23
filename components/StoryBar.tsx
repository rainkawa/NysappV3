import React from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
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

interface StoryItem {
  id: string;
  name: string;
  image: string | null;
}

const StoryBar =
  () => {
    const router =
      useRouter();

    const auth =
      useAuth();

    const myImage =
      auth?.user
        ?.userData?.image ||
      null;

    const demoStories: StoryItem[] =
      [
        {
          id: "demo-1",
          name: "ege_wav",
          image: null,
        },
        {
          id: "demo-2",
          name: "yunusbaykus7",
          image: null,
        },
        {
          id: "demo-3",
          name: "gafarguliy",
          image: null,
        },
        {
          id: "demo-4",
          name: "bpthaber",
          image: null,
        },
      ];

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
          {/* KENDİ HİKAYEN */}
          <Pressable
            onPress={() =>
              router.push(
                "/storyShare" as any
              )
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
              <Avatar
                uri={
                  myImage
                }
                size={
                  hp(8.3)
                }
                rounded={
                  hp(4.15)
                }
              />

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
              Hikayen
            </Text>
          </Pressable>

          {demoStories.map(
            (
              story
            ) => (
              <Pressable
                key={
                  story.id
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
                        story.image
                      }
                      size={
                        hp(7.3)
                      }
                      rounded={
                        hp(3.65)
                      }
                    />
                  </View>
                </View>

                <Text
                  style={
                    styles.storyName
                  }
                  numberOfLines={1}
                >
                  {
                    story.name
                  }
                </Text>
              </Pressable>
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
        "white",
      paddingTop:
        hp(0.7),
      paddingBottom:
        hp(1),
      overflow:
        "hidden",
    },

    content: {
      paddingHorizontal:
        wp(2),
      gap: wp(2),
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
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    ring: {
      width:
        hp(8.3),
      height:
        hp(8.3),
      borderRadius:
        hp(4.15),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth:
        3,
      borderColor:
        theme.colors
          .primary,
    },

    innerRing: {
      width:
        hp(7.7),
      height:
        hp(7.7),
      borderRadius:
        hp(3.85),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "white",
    },

    plusButton: {
      position:
        "absolute",
      right:
        0,
      bottom:
        0,
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
        "white",
    },

    plusText: {
      color:
        "white",
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
      marginTop: 5,
      width:
        wp(17),
      textAlign:
        "center",
      fontSize:
        hp(1.4),
      color:
        theme.colors
          .text,
    },
  });
