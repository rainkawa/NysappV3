import React from "react";

import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  usePathname,
  useRouter,
} from "expo-router";

import Icon from "@/assets/icons";
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

interface BottomNavProps {
  hide?: boolean;
}

const BottomNav =
  ({
    hide = false,
  }: BottomNavProps) => {
    const router =
      useRouter();

    const pathname =
      usePathname();

    const authContext =
      useAuth();

    if (
      hide ||
      pathname?.includes(
        "postDetails"
      )
    ) {
      return null;
    }

    const image =
      authContext?.user
        ?.userData?.image;

    const isHome =
      pathname ===
      "/home";

    const isSearch =
      pathname ===
      "/search";

    const isProfile =
      pathname ===
      "/profile";

    return (
      <View
        pointerEvents="box-none"
        style={
          styles.wrapper
        }
      >
        <View
          style={
            styles.bar
          }
        >
          {/* HOME */}
          <Pressable
            onPress={() =>
              router.replace(
                "/home"
              )
            }
            style={
              styles.item
            }
            hitSlop={8}
          >
            <Icon
              name="home"
              size={hp(3.2)}
              strokeWidth={
                isHome
                  ? 2.2
                  : 1.7
              }
              color={
                isHome
                  ? theme.colors
                      .textDark
                  : theme.colors
                      .textLight
              }
            />
          </Pressable>

          {/* SEARCH */}
          <Pressable
            onPress={() =>
              router.push(
                "./search" as any
              )
            }
            style={
              styles.item
            }
            hitSlop={8}
          >
            <Icon
              name="search"
              size={hp(3.2)}
              strokeWidth={
                isSearch
                  ? 2.2
                  : 1.7
              }
              color={
                isSearch
                  ? theme.colors
                      .textDark
                  : theme.colors
                      .textLight
              }
            />
          </Pressable>

          {/* CENTER CREATE */}
          <View
            style={
              styles.center
            }
          >
            <Pressable
              onPress={() =>
                router.push(
                  "/newPosts"
                )
              }
              style={
                styles.createButton
              }
              hitSlop={8}
            >
              <Icon
                name="plus"
                size={hp(3.4)}
                strokeWidth={2}
                color={
                  theme.colors
                    .textDark
                }
              />
            </Pressable>
          </View>

          {/* DM */}
          <Pressable
            onPress={() => {
              /*
               * DM ekranı henüz eklenmedi.
               * Şimdilik ileride bağlanacak.
               */
              router.push(
                "/notifications"
              );
            }}
            style={
              styles.item
            }
            hitSlop={8}
          >
            <Icon
              name="mail"
              size={hp(3.2)}
              strokeWidth={1.7}
              color={
                theme.colors
                  .textLight
              }
            />
          </Pressable>

          {/* PROFILE */}
          <Pressable
            onPress={() =>
              router.push(
                "/profile"
              )
            }
            style={
              styles.item
            }
            hitSlop={8}
          >
            {image ? (
              <Avatar
                uri={
                  image
                }
                size={
                  hp(4.1)
                }
                rounded={
                  theme.radius
                    .sm
                }
                style={{
                  borderWidth: 2,
                }}
              />
            ) : (
              <Icon
                name="user"
                size={hp(3.2)}
                strokeWidth={
                  isProfile
                    ? 2.2
                    : 1.7
                }
                color={
                  isProfile
                    ? theme.colors
                        .textDark
                    : theme.colors
                        .textLight
                }
              />
            )}
          </Pressable>
        </View>
      </View>
    );
  };

export default BottomNav;

const styles =
  StyleSheet.create({
    wrapper: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(8.5),
      zIndex: 1000,
      elevation: 1000,
      pointerEvents:
        "box-none",
    },

    bar: {
      position:
        "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        wp(4),
      backgroundColor:
        "white",
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        theme.colors
          .gray,
    },

    item: {
      width:
        wp(14),
      height:
        hp(7),
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    center: {
      width:
        wp(20),
      height:
        hp(8.5),
      alignItems:
        "center",
      justifyContent:
        "flex-start",
    },

    createButton: {
      position:
        "absolute",
      top:
        -hp(2.8),
      width:
        hp(6.2),
      height:
        hp(6.2),
      borderRadius:
        hp(3.1),
      backgroundColor:
        "white",
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      alignItems:
        "center",
      justifyContent:
        "center",
      shadowColor:
        "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.15,
      shadowRadius: 5,
      elevation: 7,
    },
  });
