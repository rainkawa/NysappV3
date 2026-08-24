import React from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import Avatar from "@/components/Avatar";
import { theme } from "@/constants/theme";
import { hp, wp } from "@/helpers/common";
import { useAuth } from "@/contexts/AuthContext";

interface StoryItem {
  id: string;
  name: string;
  image: string | null;
}

const StoryBar = () => {
  const router = useRouter();
  const auth = useAuth();

  const myImage =
    auth?.user?.userData?.image || null;

  const demoStories: StoryItem[] = [
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
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.content}
      >
        <Pressable
          onPress={() =>
            router.push(
              "/storyShare" as any
            )
          }
          style={styles.storyItem}
        >
          <View
            style={styles.myStoryWrapper}
          >
            <View
              style={styles.avatarShell}
            >
              <Avatar
                uri={myImage}
                size={hp(7.8)}
                rounded={hp(3.9)}
              />
            </View>

            <View
              style={styles.plusButton}
            >
              <Text
                style={styles.plusText}
              >
                +
              </Text>
            </View>
          </View>

          <Text
            style={styles.storyName}
            numberOfLines={1}
          >
            Hikâyen
          </Text>
        </Pressable>

        {demoStories.map(
          story => (
            <Pressable
              key={story.id}
              style={
                styles.storyItem
              }
            >
              <View
                style={styles.ring}
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
                    size={hp(7.1)}
                    rounded={
                      hp(3.55)
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
                {story.name}
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
        theme.colors.background,
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
      gap: wp(2.5),
      alignItems:
        "flex-start",
    },

    storyItem: {
      width: wp(18),
      alignItems:
        "center",
    },

    myStoryWrapper: {
      position:
        "relative",
    },

    avatarShell: {
      width: hp(8.4),
      height: hp(8.4),
      borderRadius: hp(4.2),
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

    ring: {
      width: hp(8.4),
      height: hp(8.4),
      borderRadius: hp(4.2),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        theme.colors.primary,
    },

    innerRing: {
      width: hp(7.6),
      height: hp(7.6),
      borderRadius: hp(3.8),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.background,
    },

    plusButton: {
      position:
        "absolute",
      right: -1,
      bottom: -1,
      width: hp(3),
      height: hp(3),
      borderRadius: hp(1.5),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
      borderWidth: 2,
      borderColor:
        theme.colors.background,
    },

    plusText: {
      color:
        theme.colors.text,
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
      width: wp(17),
      textAlign: "center",
      fontSize:
        hp(1.35),
      color: "#94A3B8",
    },
  });
