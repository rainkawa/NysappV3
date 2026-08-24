import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  unread: boolean;
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
  read_at?: string | null;
}

interface SearchUser {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
}

const formatTime = (
  value: string
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "tr-TR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

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
  ] =
    useState("");

  const [
    searchText,
    setSearchText,
  ] =
    useState("");

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
  ] =
    useState(true);

  const [
    searching,
    setSearching,
  ] =
    useState(false);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const inputRef =
    useRef<TextInput>(
      null
    );

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
              "conversation_id,last_read_at"
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
            item =>
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

        const members =
          membersResult.data ||
          [];

        const msgs =
          messagesResult.data ||
          [];

        const next =
          ids.map(
            id => {
              const membership =
                (
                  memberships ||
                  []
                ).find(
                  (
                    item: any
                  ) =>
                    item.conversation_id ===
                    id
                ) as any;

              const member =
                (
                  members as any[]
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
                  msgs as any[]
                ).find(
                  (
                    item: any
                  ) =>
                    item.conversation_id ===
                    id
                ) as any;

              const lastReadAt =
                membership?.last_read_at
                  ? new Date(
                      membership.last_read_at
                    ).getTime()
                  : 0;

              const lastCreatedAt =
                last?.created_at
                  ? new Date(
                      last.created_at
                    ).getTime()
                  : 0;

              const unread =
                !!last &&
                last.sender_id !==
                  userId &&
                lastCreatedAt >
                  lastReadAt;

              return {
                id,
                updated_at:
                  last?.created_at ||
                  "",
                unread,
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

        if (!query) {
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

          if (error) {
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

        if (error) {
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

        if (profile) {
          setOtherUser(
            profile
          );
        } else {
          const {
            data:
              profileData,
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

          setOtherUser(
            profileData ||
              null
          );
        }

        setSearchText("");
        setSearchResults([]);
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
              "id,conversation_id,sender_id,body,created_at,seen_at,read_at"
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

        if (error) {
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
          payload => {
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
      setRefreshing(
        true
      );

      try {
        await loadConversations();

        if (
          conversationId
        ) {
          await loadMessages();
        }
      } finally {
        setRefreshing(
          false
        );
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

        if (error) {
          console.warn(
            "DM - send error:",
            error.message
          );
          return;
        }

        if (data) {
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

        setText("");

        inputRef.current?.clear();

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

  if (loading) {
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
              : "padding"
          }
          keyboardVerticalOffset={0}
        >
          <View
            style={
              styles.chatContainer
            }
          >
            {/* SABİT CHAT HEADER */}
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
              style={
                styles.messageList
              }
              keyExtractor={
                item =>
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
                />
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({
                item,
              }) => {
                const mine =
                  item.sender_id ===
                  userId;

                const unread =
                  !mine &&
                  !item.read_at;

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
                      style={
                        styles.messageContent
                      }
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
                          {
                            item.body
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.metaRow
                        }
                      >
                        {!mine &&
                        unread ? (
                          <View
                            style={
                              styles.unreadDot
                            }
                          />
                        ) : null}

                        <Text
                          style={
                            styles.messageTime
                          }
                        >
                          {formatTime(
                            item.created_at
                          )}
                        </Text>
                      </View>
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
                    İlk mesajı
                    gönder.
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
                ref={
                  inputRef
                }
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
          <Text
            style={
              styles.title
            }
          >
            Mesajlar
          </Text>
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
                  >
                    {item.username ||
                      item.name}
                  </Text>

                  <Text
                    style={
                      styles.userSub
                    }
                  >
                    {
                      item.name
                    }
                  </Text>
                </View>
              </Pressable>
            )}
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
              />
            }
            renderItem={({
              item,
            }) => (
              <Pressable
                style={
                  styles.conversationRow
                }
                onPress={async () => {
                  if (
                    item.otherUser?.id
                  ) {
                    await openConversation(
                      item
                        .otherUser
                        .id,
                      item.otherUser
                    );

                    /*
                     * Sohbete girildiğinde
                     * local liste de hemen okunmuş
                     * hale gelsin.
                     */
                    setConversations(
                      previous =>
                        previous.map(
                          conversation =>
                            conversation.id ===
                            item.id
                              ? {
                                  ...conversation,
                                  unread:
                                    false,
                                }
                              : conversation
                        )
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
                  size={hp(6)}
                  rounded={hp(3)}
                />

                <View
                  style={[
                    styles.conversationInfo,
                    item.unread &&
                      styles.conversationInfoUnread,
                  ]}
                >
                  <Text
                    style={[
                      styles.conversationName,
                      item.unread &&
                        styles.conversationNameUnread,
                    ]}
                    numberOfLines={1}
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
                    style={[
                      styles.conversationPreview,
                      item.unread &&
                        styles.conversationPreviewUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item
                      .lastMessage
                      ?.body ||
                      "Yeni konuşma"}
                  </Text>
                </View>

                {item.unread && (
                  <View
                    style={
                      styles.conversationUnreadDot
                    }
                  />
                )}
              </Pressable>
            )}
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
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    container: {
      flex: 1,
      backgroundColor:
        "white",
      paddingHorizontal:
        wp(4),
    },

    chatContainer: {
      flex: 1,
      backgroundColor:
        "white",
    },

    topNav: {
      minHeight:
        hp(7),
      justifyContent:
        "center",
    },

    title: {
      fontSize:
        hp(2.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    searchBar: {
      minHeight:
        hp(5.8),
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.lg,
      paddingHorizontal:
        wp(3.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: wp(2),
      backgroundColor:
        "white",
      marginBottom:
        hp(1.5),
    },

    searchInput: {
      flex: 1,
      fontSize:
        hp(1.65),
      color:
        theme.colors.text,
    },

    searchLoading: {
      paddingTop:
        hp(2),
    },

    userRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical:
        hp(1.1),
    },

    userInfo: {
      flex: 1,
      marginLeft:
        wp(3),
    },

    userName: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    userSub: {
      marginTop: 3,
      fontSize:
        hp(1.45),
      color:
        theme.colors
          .textLight,
    },

    conversationList: {
      paddingTop:
        hp(0.5),
      paddingBottom:
        hp(10),
    },

    conversationRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical:
        hp(1.1),
    },

    conversationInfo: {
      flex: 1,
      marginLeft:
        wp(3),
    },

    conversationInfoUnread: {
      opacity: 1,
    },

    conversationNameUnread: {
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    conversationPreviewUnread: {
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    conversationUnreadDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor:
        "black",
      marginLeft:
        wp(2),
      marginRight:
        wp(1),
    },

    conversationName: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    conversationPreview: {
      marginTop: 4,
      fontSize:
        hp(1.55),
      color:
        theme.colors
          .textLight,
    },

    chatHeader: {
      minHeight:
        hp(7),
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "white",
      borderBottomWidth:
        StyleSheet
          .hairlineWidth,
      borderBottomColor:
        theme.colors.gray,
      zIndex: 10,
      elevation: 3,
    },

    backButton: {
      width:
        hp(4.5),
      height:
        hp(4.5),
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight:
        wp(2),
    },

    chatUser: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    chatUserText: {
      flex: 1,
      marginLeft:
        wp(2.5),
    },

    chatName: {
      fontSize:
        hp(1.85),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors.text,
    },

    chatStatus: {
      marginTop: 2,
      fontSize:
        hp(1.35),
      color:
        theme.colors
          .textLight,
    },

    messageList: {
      flex: 1,
    },

    messages: {
      paddingTop:
        hp(2),
      paddingBottom:
        hp(1),
    },

    messageRow: {
      width:
        "100%",
      marginBottom:
        hp(0.6),
      flexDirection:
        "row",
    },

    messageRowMine: {
      justifyContent:
        "flex-end",
    },

    messageRowOther: {
      justifyContent:
        "flex-start",
    },

    messageContent: {
      maxWidth:
        "78%",
      alignItems:
        "flex-start",
    },

    bubble: {
      maxWidth:
        "100%",
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(1.2),
      borderRadius:
        theme.radius.lg,
    },

    bubbleMine: {
      backgroundColor:
        theme.colors
          .primary,
      borderBottomRightRadius:
        5,
    },

    bubbleOther: {
      backgroundColor:
        theme.colors
          .lightGray,
      borderBottomLeftRadius:
        5,
    },

    messageText: {
      fontSize:
        hp(1.7),
      lineHeight:
        hp(2.25),
      color:
        theme.colors.text,
    },

    messageTextMine: {
      color:
        "white",
    },

    metaRow: {
      minHeight:
        hp(2),
      marginTop: 2,
      paddingHorizontal: 3,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
    },

    messageTime: {
      fontSize:
        hp(1.2),
      color:
        theme.colors
          .textLight,
    },

    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "black",
    },

    emptyChat: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      minHeight:
        hp(45),
      paddingHorizontal:
        wp(10),
    },

    emptyChatTitle: {
      fontSize:
        hp(2.1),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors.text,
      textAlign:
        "center",
    },

    emptyChatText: {
      marginTop: 6,
      fontSize:
        hp(1.55),
      color:
        theme.colors
          .textLight,
      textAlign:
        "center",
    },

    inputBar: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      paddingVertical:
        hp(1),
      borderTopWidth:
        StyleSheet
          .hairlineWidth,
      borderTopColor:
        theme.colors.gray,
      gap: wp(2),
      backgroundColor:
        "white",
    },
    input: {
      flex: 1,
      height: hp(6.2),
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.xl,
      paddingHorizontal:
        wp(4),
      fontSize:
        hp(1.7),
      color:
        theme.colors.text,
      backgroundColor:
        "white",
    },

    sendButton: {
      width: hp(5.5),
      height: hp(5.5),
      borderRadius: hp(2.75),
      backgroundColor:
        theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    sendButtonDisabled: {
      opacity:
        0.45,
    },
  });
