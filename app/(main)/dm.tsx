import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import Header from "@/components/Header";
import ScreenWarpper from "@/components/ScreenWrapper";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import Icon from "@/assets/icons";

import { theme } from "@/constants/theme";
import { hp, wp } from "@/helpers/common";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    name: string;
    username?: string | null;
    image?: string | null;
  } | null;
  lastMessage: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  seen_at: string | null;
}

interface SearchUser {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
}

const DMScreen = () => {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      userId?: string;
    }>();

  const authContext =
    useAuth();

  const userId =
    authContext?.user
      ?.authInfo?.id || "";

  const [
    conversationId,
    setConversationId,
  ] =
    useState<string | null>(
      null
    );

  const [
    otherUserId,
    setOtherUserId,
  ] =
    useState<string | null>(
      params.userId
        ? String(
            params.userId
          )
        : null
    );

  const [
    otherUser,
    setOtherUser,
  ] =
    useState<
      Conversation["otherUser"]
    >(null);

  const [
    conversations,
    setConversations,
  ] =
    useState<
      Conversation[]
    >([]);

  const [
    messages,
    setMessages,
  ] =
    useState<Message[]>(
      []
    );

  const [
    text,
    setText,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<SearchUser[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadConversations =
    useCallback(
      async () => {
        if (!userId) {
          return;
        }

        const {
          data:
            memberships,
          error:
            membershipsError,
        } =
          await supabase
            .from(
              "conversation_members"
            )
            .select(
              "conversation_id"
            )
            .eq(
              "user_id",
              userId
            );

        if (
          membershipsError
        ) {
          console.warn(
            "DM - memberships error:",
            membershipsError.message
          );
          return;
        }

        const ids =
          (
            memberships ||
            []
          ).map(
            (
              item
            ) =>
              item.conversation_id
          );

        if (!ids.length) {
          setConversations(
            []
          );
          return;
        }

        const [
          membersResult,
          messagesResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "conversation_members"
              )
              .select(
                "conversation_id,user_id,users(id,name,username,image)"
              )
              .in(
                "conversation_id",
                ids
              ),

            supabase
              .from(
                "messages"
              )
              .select(
                "conversation_id,sender_id,body,created_at"
              )
              .in(
                "conversation_id",
                ids
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (
          membersResult.error
        ) {
          console.warn(
            "DM - members error:",
            membersResult
              .error.message
          );
        }

        if (
          messagesResult.error
        ) {
          console.warn(
            "DM - list messages error:",
            messagesResult
              .error.message
          );
        }

        const members =
          membersResult.data ||
          [];

        const msgs =
          messagesResult.data ||
          [];

        const next =
          ids.map(
            (
              id
            ) => {
              const member =
                (
                  members ||
                  []
                ).find(
                  (
                    item: any
                  ) =>
                    item.conversation_id ===
                      id &&
                    item.user_id !==
                      userId
                ) as any;

              const last =
                (
                  msgs ||
                  []
                ).find(
                  (
                    item: any
                  ) =>
                    item.conversation_id ===
                    id
                ) as any;

              return {
                id,
                updated_at:
                  last?.created_at ||
                  "",
                otherUser:
                  member?.users ||
                  null,
                lastMessage:
                  last
                    ? {
                        body:
                          last.body,
                        created_at:
                          last.created_at,
                        sender_id:
                          last.sender_id,
                      }
                    : null,
              } as Conversation;
            }
          );

        next.sort(
          (
            a,
            b
          ) =>
            new Date(
              b.updated_at ||
                0
            ).getTime() -
            new Date(
              a.updated_at ||
                0
            ).getTime()
        );

        setConversations(
          next
        );
      },
      [userId]
    );

  const searchUsers =
    useCallback(
      async (
        value: string
      ) => {
        const query =
          value.trim();

        if (
          query.length <
          1
        ) {
          setSearchResults(
            []
          );
          return;
        }

        setSearching(
          true
        );

        try {
          const {
            data,
            error,
          } =
            await supabase.rpc(
              "search_dm_users",
              {
                p_query:
                  query,
              }
            );

          if (
            error
          ) {
            console.warn(
              "DM - user search error:",
              error.message
            );

            setSearchResults(
              []
            );
            return;
          }

          setSearchResults(
            (data ||
              []) as SearchUser[]
          );
        } finally {
          setSearching(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    const timer =
      setTimeout(
        () => {
          searchUsers(
            searchText
          );
        },
        250
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [
    searchText,
    searchUsers,
  ]);

  const openConversation =
    useCallback(
      async (
        targetUserId: string,
        profile?: SearchUser | null
      ) => {
        if (
          !userId ||
          !targetUserId ||
          userId ===
            targetUserId
        ) {
          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_or_create_direct_conversation",
            {
              p_other_user:
                targetUserId,
            }
          );

        if (
          error
        ) {
          console.warn(
            "DM - open conversation error:",
            error.message
          );
          return;
        }

        setConversationId(
          data
        );

        setOtherUserId(
          targetUserId
        );

        if (
          profile
        ) {
          setOtherUser(
            profile
          );
        } else {
          const {
            data:
              profileData,
            error:
              profileError,
          } =
            await supabase
              .from(
                "users"
              )
              .select(
                "id,name,username,image"
              )
              .eq(
                "id",
                targetUserId
              )
              .maybeSingle();

          if (
            profileError
          ) {
            console.warn(
              "DM - profile error:",
              profileError.message
            );
          }

          setOtherUser(
            profileData ||
              null
          );
        }

        setSearchText(
          ""
        );

        setSearchResults(
          []
        );
      },
      [userId]
    );

  useEffect(() => {
    let mounted =
      true;

    (async () => {
      setLoading(
        true
      );

      await loadConversations();

      if (
        params.userId
      ) {
        await openConversation(
          String(
            params.userId
          )
        );
      }

      if (
        mounted
      ) {
        setLoading(
          false
        );
      }
    })();

    return () => {
      mounted =
        false;
    };
  }, [
    loadConversations,
    openConversation,
    params.userId,
  ]);

  const loadMessages =
    useCallback(
      async () => {
        if (
          !conversationId
        ) {
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from(
              "messages"
            )
            .select(
              "id,conversation_id,sender_id,body,created_at,seen_at"
            )
            .eq(
              "conversation_id",
              conversationId
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            );

        if (
          error
        ) {
          console.warn(
            "DM - messages error:",
            error.message
          );
          return;
        }

        setMessages(
          (data ||
            []) as Message[]
        );

        await supabase.rpc(
          "mark_conversation_read",
          {
            p_conversation_id:
              conversationId,
          }
        );
      },
      [conversationId]
    );

  useEffect(
    () => {
      loadMessages();
    },
    [loadMessages]
  );

  useEffect(() => {
    if (
      !conversationId
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `dm:${conversationId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",
            schema:
              "public",
            table:
              "messages",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          (
            payload
          ) => {
            const message =
              payload.new as Message;

            setMessages(
              previous => {
                if (
                  previous.some(
                    item =>
                      item.id ===
                      message.id
                  )
                ) {
                  return previous;
                }

                return [
                  ...previous,
                  message,
                ];
              }
            );

            if (
              message.sender_id !==
              userId
            ) {
              supabase.rpc(
                "mark_conversation_read",
                {
                  p_conversation_id:
                    conversationId,
                }
              );
            }
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    conversationId,
    userId,
  ]);

  const onRefresh =
    async () => {
      setRefreshing(true);

      try {
        await loadConversations();

        if (conversationId) {
          await loadMessages();
        }
      } finally {
        setRefreshing(false);
      }
    };

  const sendMessage =
    async () => {
      const body =
        text.trim();

      if (
        !body ||
        !conversationId ||
        sending
      ) {
        return;
      }

      setSending(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "send_direct_message",
            {
              p_conversation_id:
                conversationId,
              p_body:
                body,
            }
          );

        if (
          error
        ) {
          console.warn(
            "DM - send error:",
            error.message
          );
          return;
        }

        if (
          data
        ) {
          setMessages(
            previous => {
              if (
                previous.some(
                  item =>
                    item.id ===
                    data.id
                )
              ) {
                return previous;
              }

              return [
                ...previous,
                data as Message,
              ];
            }
          );
        }

        setText(
          ""
        );

        await loadConversations();
      } finally {
        setSending(
          false
        );
      }
    };

  const closeChat =
    async () => {
      setConversationId(
        null
      );
      setOtherUserId(
        null
      );
      setOtherUser(
        null
      );
      setMessages(
        []
      );
      await loadConversations();
    };

  const conversationList =
    useMemo(
      () =>
        conversations,
      [conversations]
    );

  if (
    loading
  ) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.loadingScreen
          }
        >
          <ActivityIndicator
            color={
              theme.colors
                .primary
            }
          />
        </View>

        <BottomNav />
      </ScreenWarpper>
    );
  }

  if (
    conversationId
  ) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <KeyboardAvoidingView
          style={
            styles.flex
          }
          behavior={
            Platform.OS ===
            "ios"
              ? "padding"
              : "height"
          }
          keyboardVerticalOffset={
            Platform.OS ===
            "android"
              ? 8
              : 0
          }
        >
          <View
            style={
              styles.chatContainer
            }
          >
            <View
              style={
                styles.chatHeader
              }
            >
              <Pressable
                style={
                  styles.backButton
                }
                onPress={
                  closeChat
                }
              >
                <Icon
                  name="arrowLeft"
                  size={
                    hp(2.9)
                  }
                  color={
                    theme.colors
                      .text
                  }
                />
              </Pressable>

              <Pressable
                style={
                  styles.chatUser
                }
                onPress={() => {
                  if (
                    otherUserId
                  ) {
                    router.push({
                      pathname:
                        "/profile",
                      params: {
                        userId:
                          otherUserId,
                      },
                    });
                  }
                }}
              >
                <Avatar
                  uri={
                    otherUser
                      ?.image ||
                    null
                  }
                  size={
                    hp(4.5)
                  }
                  rounded={
                    hp(2.25)
                  }
                />

                <View
                  style={
                    styles.chatUserText
                  }
                >
                  <Text
                    style={
                      styles.chatName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {otherUser
                      ?.username ||
                      otherUser
                        ?.name ||
                      "Kullanıcı"}
                  </Text>

                  <Text
                    style={
                      styles.chatStatus
                    }
                  >
                    Mesajlar
                  </Text>
                </View>
              </Pressable>
            </View>

            <FlatList
              data={[
                ...messages,
              ].reverse()}
              inverted
              keyExtractor={item =>
                item.id
              }
              contentContainerStyle={
                styles.messages
              }
              refreshControl={
                <RefreshControl
                  refreshing={
                    refreshing
                  }
                  onRefresh={
                    onRefresh
                  }
                  tintColor={
                    theme.colors
                      .primary
                  }
                  colors={[
                    theme.colors
                      .primary,
                  ]}
                />
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({
                item,
              }) => {
                const mine =
                  item.sender_id ===
                  userId;

                return (
                  <View
                    style={[
                      styles.messageRow,
                      mine
                        ? styles.messageRowMine
                        : styles.messageRowOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? styles.bubbleMine
                          : styles.bubbleOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          mine &&
                            styles.messageTextMine,
                        ]}
                      >
                        {item.body}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View
                  style={
                    styles.emptyChat
                  }
                >
                  <Text
                    style={
                      styles.emptyChatTitle
                    }
                  >
                    Henüz mesaj yok
                  </Text>

                  <Text
                    style={
                      styles.emptyChatText
                    }
                  >
                    İlk mesajı gönder.
                  </Text>
                </View>
              }
            />

            <View
              style={
                styles.inputBar
              }
            >
              <TextInput
                value={
                  text
                }
                onChangeText={
                  setText
                }
                placeholder="Mesaj yaz..."
                placeholderTextColor={
                  theme.colors
                    .textLight
                }
                multiline
                style={
                  styles.input
                }
                maxLength={
                  2000
                }
              />

              <Pressable
                onPress={
                  sendMessage
                }
                disabled={
                  sending ||
                  !text.trim()
                }
                style={[
                  styles.sendButton,
                  (!text.trim() ||
                    sending) &&
                    styles.sendButtonDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator
                    color="white"
                    size="small"
                  />
                ) : (
                  <Icon
                    name="send"
                    size={
                      hp(2.8)
                    }
                    color="white"
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

      </ScreenWarpper>
    );
  }

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
            styles.topNav
          }
        >
          <View
            style={
              styles.titleWrap
            }
          >
            <Text
              style={
                styles.title
              }
            >
              Mesajlar
            </Text>
          </View>
        </View>

        <View
          style={
            styles.searchBar
          }
        >
          <Icon
            name="search"
            size={
              hp(2.5)
            }
            color={
              theme.colors
                .textLight
            }
          />

          <TextInput
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            placeholder="Kullanıcı ara..."
            placeholderTextColor={
              theme.colors
                .textLight
            }
            autoCapitalize="none"
            autoCorrect={false}
            style={
              styles.searchInput
            }
          />
        </View>

        {searching ? (
          <View
            style={
              styles.searchLoading
            }
          >
            <ActivityIndicator
              color={
                theme.colors
                  .primary
              }
            />
          </View>
        ) : searchText.trim() ? (
          <FlatList
            data={
              searchResults
            }
            keyExtractor={
              item =>
                item.id
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={
              styles.searchResults
            }
            renderItem={({
              item,
            }) => (
              <Pressable
                style={
                  styles.userRow
                }
                onPress={() =>
                  openConversation(
                    item.id,
                    item
                  )
                }
              >
                <Avatar
                  uri={
                    item.image ||
                    null
                  }
                  size={
                    hp(5.5)
                  }
                  rounded={
                    hp(2.75)
                  }
                />

                <View
                  style={
                    styles.userInfo
                  }
                >
                  <Text
                    style={
                      styles.userName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item.username ||
                      item.name}
                  </Text>

                  <Text
                    style={
                      styles.userSub
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item.name}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View
                style={
                  styles.emptyList
                }
              >
                <Text
                  style={
                    styles.emptyChatTitle
                  }
                >
                  Kullanıcı bulunamadı
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={
              conversationList
            }
            keyExtractor={
              item =>
                item.id
            }
            contentContainerStyle={
              styles.conversationList
            }
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  onRefresh
                }
                tintColor={
                  theme.colors
                    .primary
                }
                colors={[
                  theme.colors
                    .primary,
                ]}
              />
            }
            renderItem={({
              item,
            }) => (
              <Pressable
                style={
                  styles.conversationRow
                }
                onPress={() => {
                  if (
                    item.otherUser
                      ?.id
                  ) {
                    openConversation(
                      item
                        .otherUser
                        .id,
                      item.otherUser
                    );
                  }
                }}
              >
                <Avatar
                  uri={
                    item
                      .otherUser
                      ?.image ||
                    null
                  }
                  size={
                    hp(6)
                  }
                  rounded={
                    hp(3)
                  }
                />

                <View
                  style={
                    styles.conversationInfo
                  }
                >
                  <Text
                    style={
                      styles.conversationName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item
                      .otherUser
                      ?.username ||
                      item
                        .otherUser
                        ?.name ||
                      "Kullanıcı"}
                  </Text>

                  <Text
                    style={
                      styles.conversationPreview
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {item
                      .lastMessage
                      ?.body ||
                      "Yeni konuşma"}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View
                style={
                  styles.emptyList
                }
              >
                <Text
                  style={
                    styles.emptyChatTitle
                  }
                >
                  Henüz konuşma yok
                </Text>

                <Text
                  style={
                    styles.emptyChatText
                  }
                >
                  Yukarıdaki aramadan
                  bir kullanıcı seç.
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

export default DMScreen;

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    container: {
      flex: 1,
      backgroundColor: "white",
      paddingHorizontal: wp(4),
    },

    chatContainer: {
      flex: 1,
      backgroundColor: "white",
    },

    topNav: {
      minHeight: hp(7),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    titleWrap: {
      flex: 1,
      justifyContent: "center",
    },

    title: {
      fontSize: hp(2.8),
      fontWeight: theme.fonts.bold,
      color: theme.colors.text,
    },

    searchBar: {
      minHeight: hp(5.8),
      borderWidth: 1,
      borderColor: theme.colors.gray,
      borderRadius: theme.radius.lg,
      paddingHorizontal: wp(3.5),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      backgroundColor: "white",
      marginBottom: hp(1.5),
    },

    searchInput: {
      flex: 1,
      fontSize: hp(1.65),
      color: theme.colors.text,
    },

    searchLoading: {
      paddingTop: hp(2),
    },

    searchResults: {
      paddingBottom: hp(10),
    },

    userRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.1),
    },

    userInfo: {
      flex: 1,
      marginLeft: wp(3),
    },

    userName: {
      fontSize: hp(1.8),
      fontWeight: theme.fonts.semibold,
      color: theme.colors.text,
    },

    userSub: {
      marginTop: 3,
      fontSize: hp(1.45),
      color: theme.colors.textLight,
    },

    conversationList: {
      paddingTop: hp(0.5),
      paddingBottom: hp(10),
    },

    conversationRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.1),
    },

    conversationInfo: {
      flex: 1,
      marginLeft: wp(3),
    },

    conversationName: {
      fontSize: hp(1.8),
      fontWeight: theme.fonts.semibold,
      color: theme.colors.text,
    },

    conversationPreview: {
      marginTop: 4,
      fontSize: hp(1.55),
      color: theme.colors.textLight,
    },

    emptyList: {
      alignItems: "center",
      paddingTop: hp(15),
      paddingHorizontal: wp(8),
    },

    chatHeader: {
      minHeight: hp(7),
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.gray,
    },

    backButton: {
      width: hp(4.5),
      height: hp(4.5),
      alignItems: "center",
      justifyContent: "center",
      marginRight: wp(2),
    },

    chatUser: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },

    chatUserText: {
      flex: 1,
      marginLeft: wp(2.5),
    },

    chatName: {
      fontSize: hp(1.85),
      fontWeight: theme.fonts.semibold,
      color: theme.colors.text,
    },

    chatStatus: {
      marginTop: 2,
      fontSize: hp(1.35),
      color: theme.colors.textLight,
    },

    messages: {
      paddingTop: hp(2),
      paddingBottom: hp(1),
    },

    messageRow: {
      width: "100%",
      marginBottom: hp(1),
    },

    messageRowMine: {
      alignItems: "flex-end",
    },

    messageRowOther: {
      alignItems: "flex-start",
    },

    bubble: {
      maxWidth: "78%",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.2),
      borderRadius: theme.radius.lg,
    },

    bubbleMine: {
      backgroundColor: theme.colors.primary,
      borderBottomRightRadius: 5,
    },

    bubbleOther: {
      backgroundColor: theme.colors.lightGray,
      borderBottomLeftRadius: 5,
    },

    messageText: {
      fontSize: hp(1.7),
      lineHeight: hp(2.25),
      color: theme.colors.text,
    },

    messageTextMine: {
      color: "white",
    },

    emptyChat: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: hp(45),
      paddingHorizontal: wp(10),
    },

    emptyChatTitle: {
      fontSize: hp(2.1),
      fontWeight: theme.fonts.semibold,
      color: theme.colors.text,
      textAlign: "center",
    },

    emptyChatText: {
      marginTop: 6,
      fontSize: hp(1.55),
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: hp(2.1),
    },

    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingVertical: hp(1),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.gray,
      gap: wp(2),
    },

    input: {
      flex: 1,
      minHeight: hp(5.5),
      maxHeight: hp(14),
      borderWidth: 1,
      borderColor: theme.colors.gray,
      borderRadius: theme.radius.lg,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1.2),
      fontSize: hp(1.7),
      color: theme.colors.text,
      backgroundColor: "white",
    },

    sendButton: {
      width: hp(5.5),
      height: hp(5.5),
      borderRadius: hp(2.75),
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    sendButtonDisabled: {
      opacity: 0.45,
    },
  });
