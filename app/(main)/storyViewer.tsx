import React, {
  useEffect,
  useRef,
} from "react";

import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
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
} from "@/helpers/common";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  getSupabaseFileUrl,
} from "@/helpers/common";

const { width, height } =
  Dimensions.get(
    "window"
  );

const StoryViewer =
  () => {
    const router =
      useRouter();

    const params =
      useLocalSearchParams();

    const auth =
      useAuth();

    const progress =
      useRef(0);

    const userName =
      String(
        params.userName ||
          "Kullanıcı"
      );

    const userImage =
      params.userImage
        ? String(
            params.userImage
          )
        : null;

    const mediaPath =
      String(
        params.mediaPath ||
          ""
      );

    const mediaType =
      String(
        params.mediaType ||
          "image"
      );

    const mediaUri =
      mediaPath.startsWith(
        "http"
      )
        ? mediaPath
        : getSupabaseFileUrl(
            mediaPath
          )?.uri || "";

    useEffect(() => {
      const duration =
        mediaType ===
        "video"
          ? 15000
          : 5000;

      const started =
        Date.now();

      const timer =
        setInterval(
          () => {
            progress.current =
              (Date.now() -
                started) /
              duration;

            if (
              progress.current >=
              1
            ) {
              clearInterval(
                timer
              );

              router.back();
            }
          },
          100
        );

      return () =>
        clearInterval(
          timer
        );
    }, [
      mediaType,
      router,
    ]);

    return (
      <View
        style={
          styles.container
        }
      >
        {mediaType ===
        "video" ? (
          <Video
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
            shouldPlay
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
                router.back();
              }
            }}
          />
        ) : (
          <Image
            source={{
              uri:
                mediaUri,
            }}
            style={
              styles.media
            }
            resizeMode="contain"
          />
        )}

        <View
          style={
            styles.topOverlay
          }
        >
          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressBar,
                {
                  width:
                    `${Math.min(
                      progress.current *
                        100,
                      100
                    )}%`,
                },
              ]}
            />
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
                  userImage
                }
                size={
                  hp(4.5)
                }
                rounded={
                  hp(2.25)
                }
              />

              <Text
                style={
                  styles.userName
                }
              >
                {userName}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.back()
              }
              style={
                styles.closeButton
              }
              hitSlop={10}
            >
              <Icon
                name="cancel"
                size={24}
                color={
                  "#F8FAFC"
                }
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

export default StoryViewer;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#000000",
    },

    media: {
      width,
      height,
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
    },

    progressTrack: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      overflow:
        "hidden",
      backgroundColor:
        "rgba(248,250,252,0.3)",
    },

    progressBar: {
      height: "100%",
      backgroundColor:
        theme.colors.primary,
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
        theme.fonts.bold,
    },

    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(15,23,42,0.55)",
    },
  });
