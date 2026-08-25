import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import ScreenWarpper from "@/components/ScreenWrapper";
import Avatar from "@/components/Avatar";
import BottomNav from "@/components/BottomNav";
import Icon from "@/assets/icons";

import {
  supabase,
} from "@/lib/supabase";

import {
  theme,
} from "@/constants/theme";

import {
  hp,
  wp,
} from "@/helpers/common";

interface SearchUser {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
}

const SearchScreen = () => {
  const router =
    useRouter();

  const inputRef =
    useRef<TextInput>(null);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    users,
    setUsers,
  ] =
    useState<SearchUser[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    focused,
    setFocused,
  ] =
    useState(false);

  const [
    hasSearched,
    setHasSearched,
  ] =
    useState(false);

  useEffect(() => {
    const timer =
      setTimeout(
        () => {
          void searchUsers();
        },
        300
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [query]);

  const searchUsers =
    async () => {
      const value =
        query
          .trim()
          .toLowerCase();

      if (!value) {
        setUsers([]);
        setHasSearched(
          false
        );
        return;
      }

      setLoading(true);
      setHasSearched(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from("users")
            .select(
              "id,username,name,image,bio"
            )
            .or(
              `username.ilike.%${value}%,name.ilike.%${value}%`
            )
            .limit(30);

        if (error) {
          console.warn(
            "Search error:",
            error.message
          );

          setUsers([]);
          return;
        }

        setUsers(
          (data ||
            []) as SearchUser[]
        );
      } catch (
        error
      ) {
        console.warn(
          "Search error:",
          error
        );

        setUsers([]);
      } finally {
        setLoading(
          false
        );
      }
    };

  const clearSearch =
    () => {
      setQuery("");
      setUsers([]);
      setHasSearched(
        false
      );
      inputRef.current?.focus();
    };

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
        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerCopy
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              KEŞFET
            </Text>

            <Text
              style={
                styles.title
              }
            >
              İnsanları bul
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Kullanıcı adı veya
              isimle ara.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchShell,
            focused &&
              styles.searchShellFocused,
          ]}
        >
          <Icon
            name="search"
            size={23}
            strokeWidth={1.8}
            color={
              focused
                ? theme.colors
                    .primary
                : "#64748B"
            }
          />

          <TextInput
            ref={
              inputRef
            }
            value={
              query
            }
            onChangeText={
              setQuery
            }
            placeholder="Kullanıcı ara..."
            placeholderTextColor={
              "#94A3B8"
            }
            autoCapitalize="none"
            autoCorrect={
              false
            }
            onFocus={() =>
              setFocused(
                true
              )
            }
            onBlur={() =>
              setFocused(
                false
              )
            }
            style={
              styles.searchInput
            }
            returnKeyType="search"
          />

          {query.length >
            0 && (
            <Pressable
              onPress={
                clearSearch
              }
              style={
                styles.clearButton
              }
              hitSlop={8}
            >
              <Text
                style={
                  styles.clearText
                }
              >
                ×
              </Text>
            </Pressable>
          )}
        </View>

        {!hasSearched ? (
          <View
            style={
              styles.discoveryCard
            }
          >
            <View
              style={
                styles.discoveryIcon
              }
            >
              <Icon
                name="search"
                size={28}
                strokeWidth={1.8}
                color={
                  theme.colors
                    .primary
                }
              />
            </View>

            <Text
              style={
                styles.discoveryTitle
              }
            >
              Birini ara 👀
            </Text>

            <Text
              style={
                styles.discoveryText
              }
            >
              Kullanıcı adı veya isim
              yaz. Profiline tek
              dokunuşla geç.
            </Text>
          </View>
        ) : loading ? (
          <View
            style={
              styles.loadingContainer
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
              Arıyoruz...
            </Text>
          </View>
        ) : (
          <FlatList
            data={
              users
            }
            keyExtractor={(
              item
            ) =>
              item.id
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              users.length
                ? styles.list
                : styles.emptyList
            }
            renderItem={({
              item,
            }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      "/profile",
                    params: {
                      userId:
                        item.id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.userRow,
                  pressed &&
                    styles.userRowPressed,
                ]}
              >
                <View
                  style={
                    styles.avatarWrap
                  }
                >
                  <Avatar
                    uri={
                      item.image
                    }
                    size={
                      hp(6.2)
                    }
                    rounded={
                      hp(3.1)
                    }
                  />
                </View>

                <View
                  style={
                    styles.userInfo
                  }
                >
                  <Text
                    style={
                      styles.name
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item.name ||
                      item.username ||
                      "Kullanıcı"}
                  </Text>

                  <Text
                    style={
                      styles.username
                    }
                    numberOfLines={
                      1
                    }
                  >
                    @
                    {item.username ||
                      "kullanici"}
                  </Text>

                  {item.bio ? (
                    <Text
                      style={
                        styles.bio
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {
                        item.bio
                      }
                    </Text>
                  ) : null}
                </View>

                <View
                  style={
                    styles.profileArrow
                  }
                >
                  <Text
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View
                style={
                  styles.notFoundCard
                }
              >
                <View
                  style={
                    styles.notFoundIcon
                  }
                >
                  <Text
                    style={
                      styles.notFoundEmoji
                    }
                  >
                    👀
                  </Text>
                </View>

                <Text
                  style={
                    styles.notFoundTitle
                  }
                >
                  Kullanıcı bulunamadı
                </Text>

                <Text
                  style={
                    styles.notFoundText
                  }
                >
                  Farklı bir kullanıcı
                  adı veya isim dene.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <BottomNav />
    </ScreenWarpper>
  );
};

export default SearchScreen;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
      paddingHorizontal:
        wp(5),
      paddingTop:
        hp(2.4),
      paddingBottom:
        hp(8),
    },

    header: {
      marginBottom:
        hp(2),
    },

    headerCopy: {
      gap: 4,
    },

    eyebrow: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.25),
      fontWeight:
        theme.fonts.bold,
      letterSpacing:
        1.6,
    },

    title: {
      marginTop: 2,
      color:
        theme.colors.text,
      fontSize:
        hp(3),
      lineHeight:
        hp(3.6),
      fontWeight:
        theme.fonts.bold,
    },

    subtitle: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.5),
      lineHeight:
        hp(2),
    },

    searchShell: {
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        "#334155",
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3.5),
      gap:
        wp(2.5),
    },

    searchShellFocused: {
      borderColor:
        theme.colors.primary,
      shadowColor:
        theme.colors.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity:
        0.14,
      shadowRadius: 8,
      elevation: 3,
    },

    searchInput: {
      flex: 1,
      minHeight: 48,
      color:
        theme.colors.text,
      fontSize:
        hp(1.65),
      paddingVertical: 0,
    },

    clearButton: {
      width: 36,
      height: 36,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 18,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    clearText: {
      color:
        "#94A3B8",
      fontSize:
        hp(2.4),
      lineHeight:
        hp(2.4),
      includeFontPadding:
        false,
    },

    discoveryCard: {
      marginTop:
        hp(2),
      flex: 1,
      minHeight:
        hp(42),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(10),
    },

    discoveryIcon: {
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
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors
          .primary,
    },

    discoveryTitle: {
      marginTop:
        hp(1.8),
      color:
        theme.colors.text,
      fontSize:
        hp(2.1),
      fontWeight:
        theme.fonts.bold,
      textAlign:
        "center",
    },

    discoveryText: {
      marginTop:
        hp(0.8),
      color:
        "#94A3B8",
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2),
      textAlign:
        "center",
      maxWidth:
        wp(72),
    },

    loadingContainer: {
      flex: 1,
      minHeight:
        hp(40),
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingText: {
      marginTop:
        hp(1),
      color:
        "#94A3B8",
      fontSize:
        hp(1.45),
    },

    list: {
      paddingTop:
        hp(1.6),
      paddingBottom:
        hp(10),
      gap: hp(1),
    },

    userRow: {
      minHeight:
        hp(8.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3.2),
      paddingVertical:
        hp(1),
      gap:
        wp(3),
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    userRowPressed: {
      backgroundColor:
        "#263449",
      borderColor:
        theme.colors.primary,
    },

    avatarWrap: {
      width:
        hp(6.4),
      height:
        hp(6.4),
      borderRadius:
        hp(3.2),
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors
          .background,
    },

    userInfo: {
      flex: 1,
      minWidth: 0,
    },

    name: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts.bold,
    },

    username: {
      marginTop: 2,
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
    },

    bio: {
      marginTop: 4,
      color:
        "#94A3B8",
      fontSize:
        hp(1.3),
    },

    profileArrow: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    arrow: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(2.8),
      lineHeight:
        hp(2.8),
      marginTop: -2,
    },

    emptyList: {
      flexGrow: 1,
      justifyContent:
        "center",
    },

    notFoundCard: {
      marginTop:
        hp(2),
      minHeight:
        hp(30),
      borderRadius:
        theme.radius.xxl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(8),
    },

    notFoundIcon: {
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
        theme.colors
          .background,
    },

    notFoundEmoji: {
      fontSize:
        hp(3),
    },

    notFoundTitle: {
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

    notFoundText: {
      marginTop:
        hp(0.6),
      color:
        "#94A3B8",
      fontSize:
        hp(1.4),
      textAlign:
        "center",
    },
  });
