import React from "react";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import Header from "@/components/Header";
import ScreenWarpper from "@/components/ScreenWrapper";
import BottomNav from "@/components/BottomNav";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

const DMScreen =
  () => {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.container
          }
        >
          <Header
            title="Mesajlar"
          />

          <View
            style={
              styles.empty
            }
          >
            <Text
              style={
                styles.title
              }
            >
              DM
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Direkt mesajlaşma
              alanı burada olacak.
            </Text>
          </View>
        </View>

        <BottomNav />
      </ScreenWarpper>
    );
  };

export default DMScreen;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: wp(4),
    },

    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: hp(7),
    },

    title: {
      fontSize: hp(3),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    description: {
      marginTop: 8,
      fontSize: hp(1.7),
      color:
        theme.colors.textLight,
      textAlign: "center",
    },
  });
