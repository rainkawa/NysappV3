import React, {
  useEffect,
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

const SearchScreen =
  () => {
    const router =
      useRouter();

    const [
      query,
      setQuery,
    ] =
      useState("");

    const [
      users,
      setUsers,
    ] =
      useState<
        SearchUser[]
      >([]);

    const [
      loading,
      setLoading,
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
          return;
        }

        setLoading(true);

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
          setLoading(false);
        }
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
          <Text
            style={
              styles.title
            }
          >
            Ara
          </Text>

          <TextInput
            value={query}
            onChangeText={
              setQuery
            }
            placeholder="Kullanıcı ara..."
            placeholderTextColor={
              theme.colors
                .textLight
            }
            autoCapitalize="none"
            autoCorrect={false}
            style={
              styles.input
            }
          />

          {loading ? (
            <View
              style={
                styles.loading
              }
            >
              <ActivityIndicator
                color={
                  theme.colors
                    .primary
                }
              />
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(
                item
              ) =>
                item.id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.list
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
                  style={
                    styles.userRow
                  }
                >
                  <Avatar
                    uri={
                      item.image
                    }
                    size={
                      hp(5.6)
                    }
                    rounded={
                      theme.radius
                        .md
                    }
                  />

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
                      {item.username ||
                        item.name ||
                        "Kullanıcı"}
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
                </Pressable>
              )}
              ListEmptyComponent={
                query.trim() ? (
                  <View
                    style={
                      styles.empty
                    }
                  >
                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Kullanıcı
                      bulunamadı.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.empty
                    }
                  >
                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Kullanıcı
                      ara.
                    </Text>
                  </View>
                )
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
      paddingHorizontal:
        wp(5),
      paddingBottom:
        hp(8),
    },

    title: {
      marginTop:
        hp(2),
      marginBottom:
        hp(2),
      fontSize:
        hp(3.2),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors
          .text,
    },

    input: {
      height:
        hp(6),
      borderWidth: 1,
      borderColor:
        theme.colors
          .gray,
      borderRadius:
        theme.radius
          .md,
      paddingHorizontal:
        wp(4),
      color:
        theme.colors
          .text,
      fontSize:
        hp(1.7),
      backgroundColor:
        "white",
    },

    list: {
      paddingTop:
        hp(2),
      paddingBottom:
        hp(10),
    },

    userRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical:
        10,
      gap: 12,
    },

    userInfo: {
      flex: 1,
    },

    name: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .text,
    },

    bio: {
      marginTop: 3,
      fontSize:
        hp(1.45),
      color:
        theme.colors
          .textLight,
    },

    loading: {
      paddingTop:
        hp(4),
    },

    empty: {
      paddingTop:
        hp(8),
      alignItems:
        "center",
    },

    emptyText: {
      fontSize:
        hp(1.7),
      color:
        theme.colors
          .textLight,
    },
  });
