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
                  hp(8.8)
                }
                rounded={
                  hp(4.4)
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
                        hp(7.8)
                      }
                      rounded={
                        hp(3.9)
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
      backgroundColor:
        "white",
      paddingTop:
        hp(1),
      paddingBottom:
        hp(1),
    },

    content: {
      paddingHorizontal:
        wp(3),
      gap: wp(3),
    },

    storyItem: {
      width:
        wp(20),
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
        hp(8.8),
      height:
        hp(8.8),
      borderRadius:
        hp(4.4),
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
        hp(8.2),
      height:
        hp(8.2),
      borderRadius:
        hp(4.1),
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
        -1,
      bottom:
        -1,
      width:
        hp(3.1),
      height:
        hp(3.1),
      borderRadius:
        hp(1.55),
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
        hp(2.2),
      lineHeight:
        hp(2.2),
      fontWeight:
        theme.fonts.bold,
    },

    storyName: {
      marginTop: 5,
      maxWidth:
        wp(19),
      textAlign:
        "center",
      fontSize:
        hp(1.45),
      color:
        theme.colors
          .text,
    },
  });
