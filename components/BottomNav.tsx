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

const BottomNav = ({
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
    pathname === "/home";

  const isSearch =
    pathname === "/search";

  const isDm =
    pathname === "/dm";

  const isProfile =
    pathname === "/profile";

  return (
    <View
      style={styles.wrapper}
    >
      <View
        style={styles.bar}
      >
        {/* HOME */}
        <Pressable
          onPress={() =>
            router.replace(
              "/home"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="home"
            size={hp(3.2)}
            strokeWidth={
              isHome ? 2.2 : 1.7
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
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="search"
            size={hp(3.2)}
            strokeWidth={
              isSearch ? 2.2 : 1.7
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

        {/* + */}
        <Pressable
          onPress={() =>
            router.push(
              "/newPosts"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <View
            style={
              styles.createButton
            }
          >
            <Icon
              name="plus"
              size={hp(3.2)}
              strokeWidth={2.2}
              color="white"
            />
          </View>
        </Pressable>

        {/* DM */}
        <Pressable
          onPress={() =>
            router.push(
              "/dm" as any
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="mail"
            size={hp(3.2)}
            strokeWidth={
              isDm ? 2.2 : 1.7
            }
            color={
              isDm
                ? theme.colors
                    .textDark
                : theme.colors
                    .textLight
            }
          />
        </Pressable>

        {/* NOTIFICATIONS */}
        <Pressable
          onPress={() =>
            router.push(
              "/notifications"
            )
          }
          style={styles.item}
          hitSlop={8}
        >
          <Icon
            name="notification"
            size={hp(3.1)}
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
          style={styles.item}
          hitSlop={8}
        >
          {image ? (
            <Avatar
              uri={image}
              size={hp(4.1)}
              rounded={
                theme.radius.sm
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
                isProfile ? 2.2 : 1.7
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
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7),
      zIndex: 1000,
      elevation: 1000,
    },

    bar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: hp(7),
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: wp(4),
      backgroundColor: "white",
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        theme.colors.gray,
    },

    item: {
      flex: 1,
      height: hp(7),
      alignItems: "center",
      justifyContent: "center",
    },

    createButton: {
      width: hp(4.8),
      height: hp(4.8),
      borderRadius: hp(2.4),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        theme.colors.primary,
    },
  });
