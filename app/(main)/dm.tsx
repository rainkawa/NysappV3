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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Svg, {
  Path,
} from "react-native-svg";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

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
    show_online_status?: boolean;
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
  show_online_status?: boolean;
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
    otherUserLastSeen,
    setOtherUserLastSeen,
  ] =
    useState<string | null>(
      null
    );

  const [
    otherUserOnline,
    setOtherUserOnline,
  ] =
    useState(false);


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

  const updateMyPresence =
    useCallback(
      async () => {
        if (!userId) {
          return;
        }

        const {
          error,
        } =
          await supabase.rpc(
            "update_my_last_seen"
          );

        if (error) {
          console.warn(
            "DM - presence update error:",
            error.message
          );
        }
      },
      [userId]
    );

  const loadOtherUserPresence =
    useCallback(
      async (
        targetUserId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from("users")
            .select(
              "last_seen_at,show_online_status"
            )
            .eq(
              "id",
              targetUserId
            )
            .maybeSingle();

        if (error) {
          console.warn(
            "DM - presence read error:",
            error.message
          );
          return;
        }

        const showOnlineStatus =
          data?.show_online_status !== false;

        const lastSeen =
          data?.last_seen_at ||
          null;

        setOtherUserLastSeen(
          lastSeen
        );

        if (!showOnlineStatus) {
          setOtherUserOnline(
            false
          );
          return;
        }

        if (!lastSeen) {
          setOtherUserOnline(
            false
          );
          return;
        }

        const age =
          Date.now() -
          new Date(
            lastSeen
          ).getTime();

        setOtherUserOnline(
          age <=
            60 * 1000
        );
      },
      []
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
            membershipError,
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
          membershipError
        ) {
          console.warn(
            "DM - memberships error:",
            membershipError.message
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
                "conversation_id,user_id,users(id,name,username,image,show_online_status)"
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

  useEffect(
    () => {
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
    },
    [
      searchText,
      searchUsers,
    ]
  );

  
  useEffect(() => {
    if (!userId) {
      return;
    }

    void updateMyPresence();

    const timer =
      setInterval(
        () => {
          void updateMyPresence();
        },
        30000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    userId,
    updateMyPresence,
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
          } =
            await supabase
              .from(
                "users"
              )
              .select(
                "id,name,username,image,show_online_status"
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

        await loadOtherUserPresence(
          targetUserId
        );

        setSearchText(
          ""
        );

        setSearchResults(
          []
        );
      },
      [userId]
    );

  useEffect(
    () => {
      let mounted =
        true;

      (async () => {
        setLoading(
          true
        );

        if (
          params.userId
        ) {
          await openConversation(
            String(
              params.userId
            )
          );
        }

        await loadConversations();

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
    },
    [
      loadConversations,
      openConversation,
      params.userId,
    ]
  );

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

        const {
          error:
            readError,
        } = await supabase.rpc(
          "mark_conversation_read",
          {
            p_conversation_id:
              conversationId,
          }
        );

        if (readError) {
          console.warn(
            "DM - mark read error:",
            readError.message
          );
          return;
        }

        setConversations(
          previous =>
            previous.map(
              conversation =>
                conversation.id ===
                conversationId
                  ? {
                      ...conversation,
                      unread:
                        false,
                    }
                  : conversation
            )
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

  useEffect(
    () => {
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
    },
    [
      conversationId,
      userId,
    ]
  );

  const onRefresh =
    async () => {
      setRefreshing(
        true
      );

      try {
        await loadConversations();
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

        inputRef.current?.clear();

        Keyboard.dismiss();

        await loadConversations();
      } finally {
        setSending(
          false
        );
      }
    };

  useEffect(() => {
    if (
      !conversationId ||
      !otherUserId
    ) {
      return;
    }

    void loadOtherUserPresence(
      otherUserId
    );

    const timer =
      setInterval(
        () => {
          void loadOtherUserPresence(
            otherUserId
          );
        },
        30000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    conversationId,
    otherUserId,
    loadOtherUserPresence,
  ]);

  const closeChat =
    async () => {
      await supabase.rpc(
        "mark_conversation_read",
        {
          p_conversation_id:
            conversationId,
        }
      );

      setConversationId(
        null
      );

      setOtherUserId(
        null
      );

      setOtherUser(
        null
      );

      setOtherUserLastSeen(
        null
      );

      setOtherUserOnline(
        false
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
              : undefined
          }
          keyboardVerticalOffset={0}
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
                hitSlop={8}
              >
                <Icon
                  name="arrowLeft"
                  size={22}
                  strokeWidth={2}
                  color={
                    theme.colors.text
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
                <View
                  style={
                    styles.chatAvatarWrap
                  }
                >
                  <Avatar
                    uri={
                      otherUser
                        ?.image ||
                      null
                    }
                    size={
                      hp(4.8)
                    }
                    rounded={
                      hp(2.4)
                    }
                  />
                </View>

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

                  {otherUser?.show_online_status !== false && (
                    <View
                      style={
                        styles.chatStatusRow
                      }
                    >
                      <View
                        style={[
                          styles.statusDot,
                          otherUserOnline
                            ? styles.statusDotOnline
                            : styles.statusDotOffline,
                        ]}
                      />

                      <Text
                        style={
                          styles.chatStatus
                        }
                      >
                        {otherUserOnline
                          ? "Çevrimiçi"
                          : "Çevrimdışı"}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              <Pressable
                style={
                  styles.chatHeaderAction
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
                <Text
                  style={
                    styles.chatHeaderActionText
                  }
                >
                  ›
                </Text>
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
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
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
                ref={
                  inputRef
                }
                value={
                  text
                }
                onChangeText={
                  setText
                }
                placeholder="Mesaj..."
                placeholderTextColor={
                  theme.colors
                    .textLight
                }
                autoCapitalize="sentences"
                autoCorrect
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (
                    text.trim()
                  ) {
                    sendMessage();
                  }
                }}
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
                    color={
                      theme.colors.text
                    }
                    size="small"
                  />
                ) : (
                  <Svg
                    width={26}
                    height={26}
                    viewBox="0 0 24 24"
                    fill="none"
                    pointerEvents="none"
                  >
                    <Path
                      d="M21.7 2.3L2.8 9.2c-.9.3-.9 1.5 0 1.8l7.3 2.7 2.7 7.3c.3.9 1.5 1.5 1.8 0L21.5 4c.3-.9.9-1.2.2-1.7Z"
                      fill="#F8FAFC"
                    />

                    <Path
                      d="M10.2 13.8L21 3"
                      stroke="#818CF8"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                  </Svg>
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
              styles.titleBlock
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              NYSAPP DM
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Mesajlar
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Sohbetlerine devam et.
            </Text>
          </View>

          <View
            style={
              styles.titleBadge
            }
          >
            <Icon
              name="mail"
              size={20}
              color={
                theme.colors.primary
              }
            />
          </View>
        </View>

        <View
          style={
            styles.searchBar
          }
        >
          <View
            style={
              styles.searchIconWrap
            }
          >
            <Icon
              name="search"
              size={20}
              strokeWidth={1.8}
              color={
                "#94A3B8"
              }
            />
          </View>

          <TextInput
            value={
              searchText
            }
            onChangeText={
              setSearchText
            }
            placeholder="Kullanıcı ara..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={
              false
            }
            style={
              styles.searchInput
            }
          />

          {searchText.length >
            0 && (
            <Pressable
              onPress={() =>
                setSearchText("")
              }
              hitSlop={8}
              style={
                styles.clearSearch
              }
            >
              <Text
                style={
                  styles.clearSearchText
                }
              >
                ×
              </Text>
            </Pressable>
          )}
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
                style={({ pressed }) => [
                  styles.userRow,
                  pressed &&
                    styles.rowPressed,
                ]}
                onPress={() =>
                  openConversation(
                    item.id,
                    item
                  )
                }
              >
                <View
                  style={
                    styles.userAvatarWrap
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
                </View>

                <View
                  style={
                    styles.userInfo
                  }
                >
                  <Text
                    style={
                      styles.userName
                    }
                    numberOfLines={1}
                  >
                    {
                      item.username ||
                      item.name
                    }
                  </Text>

                  <Text
                    style={
                      styles.userSub
                    }
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>

                <View
                  style={
                    styles.userArrow
                  }
                >
                  <Text
                    style={
                      styles.userArrowText
                    }
                  >
                    ›
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
              />
            }
            renderItem={({
              item,
            }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.conversationRow,
                  item.unread &&
                    styles.conversationRowUnread,
                  pressed &&
                    styles.rowPressed,
                ]}
                onPress={async () => {
                  if (
                    !item
                      .otherUser
                      ?.id
                  ) {
                    return;
                  }

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

                  await openConversation(
                    item
                      .otherUser
                      .id,
                    item.otherUser
                  );
                }}
              >
                <View
                  style={
                    styles.conversationAvatarWrap
                  }
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

                  {item.unread && (
                    <View
                      style={
                        styles.onlineDot
                      }
                    />
                  )}
                </View>

                <View
                  style={
                    styles.conversationInfo
                  }
                >
                  <Text
                    style={[
                      styles.conversationName,
                      item.unread &&
                        styles.conversationNameUnread,
                    ]}
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

                  <View
                    style={
                      styles.previewLine
                    }
                  >
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

                    {item.lastMessage && (
                      <Text
                        style={
                          styles.conversationTime
                        }
                      >
                        {formatTime(
                          item.lastMessage
                            .created_at
                        )}
                      </Text>
                    )}
                  </View>
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
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
    },

    container: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
      paddingHorizontal:
        wp(4),
    },

    chatContainer: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    topNav: {
      minHeight:
        hp(10),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingTop:
        hp(1),
    },

    titleBlock: {
      flex: 1,
    },

    eyebrow: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.15),
      fontWeight:
        theme.fonts.bold,
      letterSpacing:
        1.5,
    },

    title: {
      marginTop: 2,
      fontSize:
        hp(2.8),
      lineHeight:
        hp(3.3),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    subtitle: {
      marginTop: 2,
      fontSize:
        hp(1.35),
      color:
        "#94A3B8",
    },

    titleBadge: {
      width:
        hp(5),
      height:
        hp(5),
      borderRadius:
        hp(2.5),
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

    searchBar: {
      minHeight:
        hp(6),
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.xl,
      paddingHorizontal:
        wp(3),
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        wp(2),
      backgroundColor:
        theme.colors.card,
      marginBottom:
        hp(1.5),
    },

    searchIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
    },

    searchInput: {
      flex: 1,
      minHeight:
        hp(5.5),
      fontSize:
        hp(1.6),
      color:
        theme.colors.text,
    },

    clearSearch: {
      width: 34,
      height: 34,
      borderRadius: 17,
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

    clearSearchText: {
      color:
        "#94A3B8",
      fontSize:
        hp(2.2),
      lineHeight:
        hp(2.2),
      includeFontPadding:
        false,
    },

    searchLoading: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingBottom:
        hp(12),
    },

    searchResults: {
      paddingTop:
        hp(0.5),
      paddingBottom:
        hp(10),
      gap: hp(0.8),
    },

    userRow: {
      minHeight:
        hp(8),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3),
      paddingVertical:
        hp(1),
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    userAvatarWrap: {
      width:
        hp(5.7),
      height:
        hp(5.7),
      borderRadius:
        hp(2.85),
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors
          .background,
    },

    userInfo: {
      flex: 1,
      marginLeft:
        wp(3),
    },

    userName: {
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    userSub: {
      marginTop: 3,
      fontSize:
        hp(1.35),
      color:
        "#94A3B8",
    },

    userArrow: {
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

    userArrowText: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(2.8),
      lineHeight:
        hp(2.8),
      marginTop: -2,
    },

    conversationList: {
      paddingTop:
        hp(0.2),
      paddingBottom:
        hp(10),
      gap:
        hp(0.8),
    },

    conversationRow: {
      minHeight:
        hp(9),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3),
      paddingVertical:
        hp(1),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    conversationRowUnread: {
      borderColor:
        "rgba(129,140,248,0.55)",
      backgroundColor:
        "#222E44",
    },

    conversationAvatarWrap: {
      width:
        hp(6.2),
      height:
        hp(6.2),
      borderRadius:
        hp(3.1),
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    conversationInfo: {
      flex: 1,
      marginLeft:
        wp(3),
      minWidth: 0,
    },

    conversationName: {
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors.text,
    },

    conversationNameUnread: {
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    previewLine: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 4,
      gap: 8,
    },

    conversationPreview: {
      flex: 1,
      fontSize:
        hp(1.42),
      color:
        "#94A3B8",
    },

    conversationPreviewUnread: {
      fontWeight:
        theme.fonts
          .semibold,
      color:
        "#CBD5E1",
    },

    conversationTime: {
      fontSize:
        hp(1.15),
      color:
        "#64748B",
    },

    conversationUnreadDot: {
      width: 9,
      height: 9,
      borderRadius:
        4.5,
      backgroundColor:
        theme.colors
          .primary,
      marginLeft:
        wp(2),
    },

    onlineDot: {
      position:
        "absolute",
      right: 0,
      bottom: 1,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        theme.colors
          .rose,
      borderWidth: 2,
      borderColor:
        theme.colors.card,
    },

    rowPressed: {
      backgroundColor:
        "#263449",
      borderColor:
        theme.colors
          .primary,
    },

    emptyList: {
      alignItems:
        "center",
      paddingTop:
        hp(15),
      paddingHorizontal:
        wp(8),
    },

    chatHeader: {
      height:
        hp(8),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(2),
      backgroundColor:
        theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor:
        theme.colors.gray,
      zIndex: 20,
      elevation: 12,
    },

    backButton: {
      width: 44,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight:
        wp(1),
      borderRadius: 22,
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    chatUser: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      minWidth: 0,
    },

    chatAvatarWrap: {
      width:
        hp(5),
      height:
        hp(5),
      borderRadius:
        hp(2.5),
      position:
        "relative",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chatUserText: {
      flex: 1,
      marginLeft:
        wp(2.5),
    },

    chatName: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    chatStatusRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 3,
      gap: 5,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },

    statusDotOnline: {
      backgroundColor:
        "#22C55E",
    },

    statusDotOffline: {
      backgroundColor:
        theme.colors.rose,
    },

    chatStatus: {
      fontSize:
        hp(1.15),
      color:
        "#94A3B8",
    },

    chatHeaderAction: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft:
        wp(1),
      backgroundColor:
        theme.colors
          .background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    chatHeaderActionText: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(2.8),
      lineHeight:
        hp(2.8),
      marginTop: -2,
    },

    messageList: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    messages: {
      paddingTop:
        hp(2),
      paddingBottom:
        hp(1),
      paddingHorizontal:
        wp(3),
    },

    messageRow: {
      width:
        "100%",
      marginBottom:
        hp(0.8),
    },

    messageRowMine: {
      alignItems:
        "flex-end",
    },

    messageRowOther: {
      alignItems:
        "flex-start",
    },

    messageContent: {
      maxWidth:
        "84%",
      alignItems:
        "flex-start",
    },

    bubble: {
      maxWidth:
        "100%",
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(1.15),
      borderRadius:
        20,
    },

    bubbleMine: {
      backgroundColor:
        theme.colors
          .primary,
      borderBottomRightRadius:
        6,
    },

    bubbleOther: {
      backgroundColor:
        theme.colors.card,
      borderBottomLeftRadius:
        6,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    messageText: {
      fontSize:
        hp(1.65),
      lineHeight:
        hp(2.25),
      color:
        theme.colors.text,
    },

    messageTextMine: {
      color:
        "#F8FAFC",
    },

    messageTime: {
      marginTop: 4,
      paddingHorizontal: 4,
      fontSize:
        hp(1.1),
      color:
        "#64748B",
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

    inputBar: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3),
      paddingVertical:
        hp(1),
      borderTopWidth: 1,
      borderTopColor:
        theme.colors.gray,
      gap:
        wp(2),
      backgroundColor:
        theme.colors.card,
    },

    input: {
      flex: 1,
      minHeight:
        hp(5.8),
      maxHeight:
        hp(12),
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.xl,
      paddingHorizontal:
        wp(4),
      paddingVertical:
        hp(1.4),
      fontSize:
        hp(1.65),
      color:
        theme.colors.text,
      backgroundColor:
        theme.colors
          .background,
    },

    sendButton: {
      width:
        hp(5.6),
      height:
        hp(5.6),
      borderRadius:
        hp(2.8),
      backgroundColor:
        theme.colors
          .primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "rgba(248,250,252,0.18)",
    },

    sendButtonDisabled: {
      opacity:
        0.38,
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
        hp(1.45),
      color:
        "#94A3B8",
      textAlign:
        "center",
      lineHeight:
        hp(2.1),
    },
  });

