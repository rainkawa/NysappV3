import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Audio,
  ResizeMode,
  Video,
} from "expo-av";

import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import * as Haptics from "expo-haptics";
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
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

interface SearchUser {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
  show_online_status?: boolean;
}

interface OtherUser {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
  show_online_status?: boolean;
}

interface Conversation {
  id: string;
  updated_at: string;
  unread: boolean;
  otherUser: OtherUser | null;
  lastMessage: {
    body: string;
    created_at: string;
    sender_id: string;
    message_type?: MessageType;
  } | null;
}

type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  seen_at: string | null;
  read_at: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  reply_to_message_id?: string | null;
  message_type: MessageType;
  media_url?: string | null;
  thumbnail_url?: string | null;
  duration_ms?: number | null;
  metadata?: Record<string, any> | null;
  reaction?: string | null;
  reaction_user_id?: string | null;
  replyMessage?: Message | null;
}

const formatTime = (
  value?: string | null
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const formatDuration = (
  milliseconds?: number | null
) => {
  const seconds = Math.max(
    0,
    Math.round(
      Number(milliseconds || 0) / 1000
    )
  );

  return `${Math.floor(seconds / 60)}:${String(
    seconds % 60
  ).padStart(2, "0")}`;
};

const DMIcon = ({
  type,
  color = theme.colors.primary,
  size = 22,
}: {
  type:
    | "send"
    | "mic"
    | "gallery"
    | "reply"
    | "edit"
    | "trash"
    | "heart"
    | "check"
    | "play"
    | "close";
  color?: string;
  size?: number;
}) => {
  const s = size;
  const sw = 1.9;

  if (type === "send") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M21.4 2.7 3.2 9.1c-.9.3-.9 1.6 0 1.9l7.1 2.6 2.6 7.2c.3.9 1.6.9 1.9 0l6.8-18.1c.3-.8-.4-1.5-1.2-1.2Z"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <Path
          d="m10.3 13.7 10.4-10.2"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (type === "mic") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Rect
          x="8"
          y="3"
          width="8"
          height="12"
          rx="4"
          stroke={color}
          strokeWidth={sw}
        />
        <Path
          d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (type === "gallery") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="3"
          stroke={color}
          strokeWidth={sw}
        />
        <Circle
          cx="8.5"
          cy="9"
          r="1.5"
          stroke={color}
          strokeWidth={sw}
        />
        <Path
          d="m5.5 17 4.3-4.2 3.2 3 2.2-2 3.3 3.2"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === "reply") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M9 7 4 12l5 5"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M4 12h9c4.5 0 7 2.2 7 6"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (type === "edit") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <Path
          d="m13.5 6.5 4 4"
          stroke={color}
          strokeWidth={sw}
        />
      </Svg>
    );
  }

  if (type === "trash") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === "heart") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="M20.8 8.7c0 5.1-8.8 10.3-8.8 10.3S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === "check") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="m5 12 4 4L19 6"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (type === "play") {
    return (
      <Svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
      >
        <Path
          d="m8 5 11 7-11 7V5Z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="m6 6 12 12M18 6 6 18"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
};

const AudioMessage = ({
  uri,
  duration,
  mine,
}: {
  uri: string;
  duration?: number | null;
  mine: boolean;
}) => {
  const soundRef =
    useRef<Audio.Sound | null>(null);

  const [playing, setPlaying] =
    useState(false);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
    };
  }, []);

  const toggle = async () => {
    if (!soundRef.current) {
      const {
        sound,
      } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setPlaying(true);

      sound.setOnPlaybackStatusUpdate(
        status => {
          if (
            status.isLoaded &&
            status.didJustFinish
          ) {
            setPlaying(false);
          }
        }
      );

      return;
    }

    const status =
      await soundRef.current.getStatusAsync();

    if (
      status.isLoaded &&
      status.isPlaying
    ) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setPlaying(true);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      style={[
        styles.audioCard,
        mine && styles.audioCardMine,
      ]}
    >
      <View
        style={[
          styles.audioPlay,
          mine && styles.audioPlayMine,
        ]}
      >
        <DMIcon
          type={playing ? "close" : "play"}
          color="#FFFFFF"
          size={15}
        />
      </View>

      <View
        style={styles.wave}
      >
        {Array.from({
          length: 18,
        }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              mine && styles.waveBarMine,
              {
                height:
                  7 + ((index * 9) % 15),
              },
            ]}
          />
        ))}
      </View>

      <Text
        style={[
          styles.audioDuration,
          mine &&
            styles.audioDurationMine,
        ]}
      >
        {formatDuration(duration)}
      </Text>
    </Pressable>
  );
};

const SwipeMessage = ({
  children,
  onReply,
}: {
  children: React.ReactNode;
  onReply: () => void;
}) => {
  const startX =
    useRef(0);

  const [translateX, setTranslateX] =
    useState(0);

  const panResponder =
    useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder:
          (_, gesture) =>
            Math.abs(gesture.dx) > 8 &&
            Math.abs(gesture.dy) < 12,

        onPanResponderGrant: () => {
          startX.current = 0;
        },

        onPanResponderMove: (
          _,
          gesture
        ) => {
          const x = Math.max(
            0,
            Math.min(70, gesture.dx)
          );

          setTranslateX(x);
        },

        onPanResponderRelease: (
          _,
          gesture
        ) => {
          if (gesture.dx >= 48) {
            onReply();
          }

          setTranslateX(0);
        },

        onPanResponderTerminate: () => {
          setTranslateX(0);
        },
      })
    ).current;

  return (
    <View
      style={styles.swipeContainer}
      {...panResponder.panHandlers}
    >
      {translateX > 5 && (
        <View
          style={styles.swipeReply}
        >
          <DMIcon
            type="reply"
            size={19}
          />
        </View>
      )}

      <View
        style={{
          transform: [
            {
              translateX,
            },
          ],
        }}
      >
        {children}
      </View>
    </View>
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
    authContext?.user?.authInfo?.id || "";

  const [
    conversationId,
    setConversationId,
  ] = useState<string | null>(
    null
  );

  const [
    otherUser,
    setOtherUser,
  ] = useState<OtherUser | null>(
    null
  );

  const [
    otherUserOnline,
    setOtherUserOnline,
  ] = useState(false);

  const [
    otherUserTyping,
    setOtherUserTyping,
  ] = useState(false);

  const [
    otherUserRecording,
    setOtherUserRecording,
  ] = useState(false);

  const [
    conversations,
    setConversations,
  ] = useState<
    Conversation[]
  >([]);

  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

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
  ] = useState<SearchUser[]>([]);

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

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    recordedAudioUri,
    setRecordedAudioUri,
  ] = useState<
    string | null
  >(null);

  const [
    recordedAudioDuration,
    setRecordedAudioDuration,
  ] = useState(0);

  const [
    replyTo,
    setReplyTo,
  ] = useState<Message | null>(
    null
  );

  const [
    editingMessage,
    setEditingMessage,
  ] = useState<Message | null>(
    null
  );

  const [
    selectedMessage,
    setSelectedMessage,
  ] = useState<Message | null>(
    null
  );

  const [
    actionMenuVisible,
    setActionMenuVisible,
  ] = useState(false);

  const [
    mediaVisible,
    setMediaVisible,
  ] = useState(false);

  const [
    mediaLoading,
    setMediaLoading,
  ] = useState(false);

  const [
    mediaAssets,
    setMediaAssets,
  ] = useState<
    MediaLibrary.Asset[]
  >([]);

  const [
    selectedMedia,
    setSelectedMedia,
  ] = useState<
    MediaLibrary.Asset | null
  >(null);

  const [
    preview,
    setPreview,
  ] = useState<{
    uri: string;
    type:
      | "image"
      | "video";
  } | null>(null);

  const inputRef =
    useRef<TextInput>(null);

  const recordingRef =
    useRef<Audio.Recording | null>(
      null
    );

  const lastTapRef =
    useRef<{
      messageId: string;
      time: number;
    } | null>(null);

  const typingTimerRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  const conversationsMemo =
    useMemo(
      () => conversations,
      [conversations]
    );

  const updatePresence =
    useCallback(
      async () => {
        if (!userId) {
          return;
        }

        await supabase.rpc(
          "update_my_last_seen"
        );
      },
      [userId]
    );

  const loadPresence =
    useCallback(
      async (
        targetId: string
      ) => {
        const {
          data,
        } = await supabase
          .from("users")
          .select(
            "last_seen_at,show_online_status"
          )
          .eq("id", targetId)
          .maybeSingle();

        if (
          !data ||
          data.show_online_status === false
        ) {
          setOtherUserOnline(false);
          return;
        }

        if (!data.last_seen_at) {
          setOtherUserOnline(false);
          return;
        }

        const age =
          Date.now() -
          new Date(
            data.last_seen_at
          ).getTime();

        setOtherUserOnline(
          age <= 60_000
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
          data: members,
          error: membersError,
        } =
          await supabase
            .from("conversation_members")
            .select(
              "conversation_id,last_read_at"
            )
            .eq("user_id", userId);

        if (membersError) {
          return;
        }

        const ids =
          (members || []).map(
            item =>
              item.conversation_id
          );

        if (!ids.length) {
          setConversations([]);
          return;
        }

        const [
          peopleResult,
          messagesResult,
        ] = await Promise.all([
          supabase
            .from("conversation_members")
            .select(
              "conversation_id,user_id,users(id,name,username,image,show_online_status)"
            )
            .in(
              "conversation_id",
              ids
            ),

          supabase
            .from("messages")
            .select(
              "conversation_id,sender_id,body,created_at,message_type,deleted_at"
            )
            .is(
              "deleted_at",
              null
            )
            .in(
              "conversation_id",
              ids
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

        const people =
          peopleResult.data || [];

        const rows =
          messagesResult.data || [];

        const next =
          ids.map(
            id => {
              const member =
                (
                  people as any[]
                ).find(
                  person =>
                    person.conversation_id ===
                      id &&
                    person.user_id !==
                      userId
                );

              const last =
                (
                  rows as any[]
                ).find(
                  row =>
                    row.conversation_id ===
                    id
                );

              const myMember =
                (
                  members || []
                ).find(
                  item =>
                    item.conversation_id ===
                    id
                ) as any;

              const lastCreated =
                last?.created_at
                  ? new Date(
                      last.created_at
                    ).getTime()
                  : 0;

              const lastRead =
                myMember?.last_read_at
                  ? new Date(
                      myMember.last_read_at
                    ).getTime()
                  : 0;

              return {
                id,
                updated_at:
                  last?.created_at || "",
                unread:
                  !!last &&
                  last.sender_id !==
                    userId &&
                  lastCreated >
                    lastRead,
                otherUser:
                  member?.users ||
                  null,
                lastMessage:
                  last
                    ? {
                        body:
                          last.message_type ===
                          "image"
                            ? "Fotoğraf"
                            : last.message_type ===
                              "video"
                            ? "Video"
                            : last.message_type ===
                              "audio"
                            ? "Ses kaydı"
                            : last.body,
                        created_at:
                          last.created_at,
                        sender_id:
                          last.sender_id,
                        message_type:
                          last.message_type,
                      }
                    : null,
              } as Conversation;
            }
          );

        next.sort(
          (a, b) =>
            new Date(
              b.updated_at || 0
            ).getTime() -
            new Date(
              a.updated_at || 0
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
        const q =
          value.trim();

        if (!q) {
          setSearchResults([]);
          return;
        }

        setSearching(true);

        try {
          const {
            data,
          } = await supabase.rpc(
            "search_dm_users",
            {
              p_query: q,
            }
          );

          setSearchResults(
            (data || []) as SearchUser[]
          );
        } finally {
          setSearching(false);
        }
      },
      []
    );

  useEffect(() => {
    const timer =
      setTimeout(
        () => {
          void searchUsers(
            searchText
          );
        },
        250
      );

    return () =>
      clearTimeout(timer);
  }, [
    searchText,
    searchUsers,
  ]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void updatePresence();

    const timer =
      setInterval(
        () => {
          void updatePresence();
        },
        30_000
      );

    return () =>
      clearInterval(timer);
  }, [
    userId,
    updatePresence,
  ]);

  const openConversation =
    useCallback(
      async (
        targetId: string,
        user?: SearchUser | OtherUser | null
      ) => {
        if (
          !userId ||
          !targetId ||
          userId === targetId
        ) {
          return;
        }

        const {
          data: id,
          error,
        } = await supabase.rpc(
          "get_or_create_direct_conversation",
          {
            p_other_user:
              targetId,
          }
        );

        if (error || !id) {
          Alert.alert(
            "Mesaj",
            error?.message ||
              "Sohbet açılamadı."
          );
          return;
        }

        let profile =
          user || null;

        if (!profile) {
          const {
            data,
          } = await supabase
            .from("users")
            .select(
              "id,name,username,image,show_online_status"
            )
            .eq(
              "id",
              targetId
            )
            .maybeSingle();

          profile =
            data as OtherUser | null;
        }

        setConversationId(
          id
        );

        setOtherUserIdSafe(
          targetId
        );

        setOtherUser(
          profile as OtherUser | null
        );

        await loadPresence(
          targetId
        );

        setSearchText("");
        setSearchResults([]);
      },
      [
        userId,
        loadPresence,
      ]
    );

  const setOtherUserIdSafe =
    (id: string | null) => {
      void id;
    };

  const hydrateReplies =
    (
      rows: Message[]
    ) => {
      const map =
        new Map<
          string,
          Message
        >();

      rows.forEach(
        row =>
          map.set(
            row.id,
            row
          )
      );

      return rows.map(
        row => ({
          ...row,
          replyMessage:
            row.reply_to_message_id
              ? map.get(
                  row.reply_to_message_id
                ) || null
              : null,
        })
      );
    };

  const loadMessages =
    useCallback(
      async () => {
        if (!conversationId) {
          return;
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("messages")
            .select(
              "id,conversation_id,sender_id,body,created_at,seen_at,read_at,edited_at,deleted_at,reply_to_message_id,message_type,media_url,thumbnail_url,duration_ms,metadata,reaction,reaction_user_id"
            )
            .eq(
              "conversation_id",
              conversationId
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            );

        if (error) {
          return;
        }

        const rows =
          (data || []) as Message[];

        setMessages(
          hydrateReplies(rows)
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

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

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

      if (active) {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    loadConversations,
    openConversation,
    params.userId,
  ]);

  useEffect(() => {
    void loadMessages();
  }, [
    loadMessages,
  ]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `nys-dm-${conversationId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          payload => {
            const incoming =
              payload.new as Message;

            if (
              payload.eventType ===
              "INSERT"
            ) {
              setMessages(
                previous => {
                  if (
                    previous.some(
                      item =>
                        item.id ===
                        incoming.id
                    )
                  ) {
                    return previous;
                  }

                  const reply =
                    incoming.reply_to_message_id
                      ? previous.find(
                          item =>
                            item.id ===
                            incoming.reply_to_message_id
                        ) || null
                      : null;

                  return [
                    ...previous,
                    {
                      ...incoming,
                      replyMessage:
                        reply,
                    },
                  ];
                }
              );

              if (
                incoming.sender_id !==
                userId
              ) {
                void supabase.rpc(
                  "mark_conversation_read",
                  {
                    p_conversation_id:
                      conversationId,
                  }
                );
              }

              return;
            }

            if (
              payload.eventType ===
              "UPDATE"
            ) {
              setMessages(
                previous =>
                  previous.map(
                    item =>
                      item.id ===
                      incoming.id
                        ? {
                            ...item,
                            ...incoming,
                          }
                        : item
                  )
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "conversation_typing",
            filter:
              `conversation_id=eq.${conversationId}`,
          },
          payload => {
            const row =
              payload.new as any;

            if (
              row.user_id ===
              userId
            ) {
              return;
            }

            setOtherUserRecording(
              row.is_recording === true
            );

            setOtherUserTyping(
              row.is_typing === true &&
              row.is_recording !== true
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

  const setTyping =
    useCallback(
      async (
        typing: boolean,
        recording = false
      ) => {
        if (!conversationId) {
          return;
        }

        await supabase.rpc(
          "set_dm_typing",
          {
            p_conversation_id:
              conversationId,
            p_is_typing:
              typing,
            p_is_recording:
              recording,
          }
        );
      },
      [conversationId]
    );

  const onChangeText =
    (
      value: string
    ) => {
      setText(value);

      const active =
        value.trim().length > 0;

      void setTyping(
        active,
        false
      );

      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      typingTimerRef.current =
        setTimeout(
          () => {
            void setTyping(
              false,
              false
            );
          },
          1200
        );
    };

  const sendText =
    async () => {
      const body =
        text.trim();

      if (
        !conversationId ||
        !body ||
        sending
      ) {
        return;
      }

      setSending(true);

      try {
        if (
          editingMessage
        ) {
          const {
            data,
            error,
          } =
            await supabase.rpc(
              "edit_direct_message",
              {
                p_message_id:
                  editingMessage.id,
                p_body: body,
              }
            );

          if (error) {
            Alert.alert(
              "Mesaj",
              error.message
            );
            return;
          }

          if (data) {
            setMessages(
              previous =>
                previous.map(
                  item =>
                    item.id ===
                    editingMessage.id
                      ? {
                          ...item,
                          ...(data as Message),
                        }
                      : item
                )
            );
          }

          setEditingMessage(null);
          setText("");
          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "send_direct_message",
            {
              p_conversation_id:
                conversationId,
              p_body: body,
              p_reply_to_message_id:
                replyTo?.id ||
                null,
            }
          );

        if (error) {
          Alert.alert(
            "Mesaj",
            error.message
          );
          return;
        }

        if (data) {
          setMessages(
            previous => [
              ...previous,
              {
                ...(data as Message),
                replyMessage:
                  replyTo,
              },
            ]
          );
        }

        setText("");
        setReplyTo(null);

        await setTyping(
          false,
          false
        );

        await loadConversations();
      } finally {
        setSending(false);
      }
    };

  const startRecording =
    async () => {
      if (
        isRecording ||
        !conversationId
      ) {
        return;
      }

      try {
        const permission =
          await Audio.requestPermissionsAsync();

        if (
          permission.status !==
          "granted"
        ) {
          Alert.alert(
            "Mikrofon",
            "Mikrofon izni gerekli."
          );
          return;
        }

        await Audio.setAudioModeAsync(
          {
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          }
        );

        const recording =
          new Audio.Recording();

        await recording.prepareToRecordAsync(
          Audio.RecordingOptionsPresets
            .HIGH_QUALITY
        );

        await recording.startAsync();

        recordingRef.current =
          recording;

        setIsRecording(true);

        await setTyping(
          false,
          true
        );
      } catch (error) {
        Alert.alert(
          "Ses",
          "Ses kaydı başlatılamadı."
        );
      }
    };

  const stopRecording =
    async () => {
      const recording =
        recordingRef.current;

      if (!recording) {
        return;
      }

      try {
        await recording.stopAndUnloadAsync();

        const uri =
          recording.getURI();

        const status =
          await recording.getStatusAsync();

        const duration =
          status.durationMillis || 0;

        recordingRef.current =
          null;

        setIsRecording(false);

        await setTyping(
          false,
          false
        );

        if (!uri) {
          return;
        }

        setRecordedAudioUri(
          uri
        );

        setRecordedAudioDuration(
          duration
        );
      } catch (error: any) {
        setIsRecording(false);

        await setTyping(
          false,
          false
        );

        Alert.alert(
          "Ses",
          error?.message ||
            "Ses kaydı durdurulamadı."
        );
      }
    };

  const discardRecordedAudio =
    () => {
      setRecordedAudioUri(
        null
      );

      setRecordedAudioDuration(
        0
      );
    };

  const sendRecordedAudio =
    async () => {
      if (
        !recordedAudioUri ||
        !conversationId ||
        sending
      ) {
        return;
      }

      setSending(true);

      try {
        const mediaUrl =
          await uploadFile(
            recordedAudioUri,
            "audio",
            "audio/m4a"
          );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "send_media_message",
            {
              p_conversation_id:
                conversationId,
              p_message_type:
                "audio",
              p_media_url:
                mediaUrl,
              p_thumbnail_url:
                null,
              p_duration_ms:
                Math.round(
                  recordedAudioDuration
                ),
              p_reply_to_message_id:
                replyTo?.id ||
                null,
              p_metadata: {},
            }
          );

        if (error) {
          Alert.alert(
            "Ses",
            error.message
          );
          return;
        }

        if (data) {
          setMessages(
            previous => [
              ...previous,
              {
                ...(data as Message),
                replyMessage:
                  replyTo,
              },
            ]
          );
        }

        setReplyTo(null);
        discardRecordedAudio();
      } catch (error: any) {
        Alert.alert(
          "Ses",
          error?.message ||
            "Ses kaydı gönderilemedi."
        );
      } finally {
        setSending(false);
      }
    };

  const uploadFile =
    async (
      uri: string,
      folder: string,
      mimeType: string
    ) => {
      if (!userId) {
        throw new Error(
          "Oturum bulunamadı."
        );
      }

      const base64 =
        await FileSystem.readAsStringAsync(
          uri,
          {
            encoding:
              FileSystem.EncodingType
                .Base64,
          }
        );

      const arrayBuffer =
        decodeBase64(base64);

      const extension =
        mimeType.includes(
          "video"
        )
          ? "mp4"
          : mimeType.includes(
              "audio"
            )
          ? "m4a"
          : "jpg";

      const path =
        `${userId}/${folder}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

      const {
        error,
      } =
        await supabase.storage
          .from(
            "chat-media"
          )
          .upload(
            path,
            arrayBuffer,
            {
              contentType:
                mimeType,
              upsert: false,
            }
          );

      if (error) {
        throw error;
      }

      const {
        data,
      } =
        supabase.storage
          .from(
            "chat-media"
          )
          .getPublicUrl(
            path
          );

      return data.publicUrl;
    };

  const loadAppGallery =
    async () => {
      setMediaLoading(true);

      try {
        let permission =
          await MediaLibrary.getPermissionsAsync(
            true
          );

        if (
          permission.status !==
          "granted"
        ) {
          permission =
            await MediaLibrary.requestPermissionsAsync(
              true
            );
        }

        if (
          permission.status !==
          "granted"
        ) {
          Alert.alert(
            "Galeri erişimi",
            "Fotoğraf ve videolara erişim izni vermen gerekiyor."
          );
          return;
        }

        const result =
          await MediaLibrary.getAssetsAsync(
            {
              first: 150,
              mediaType: [
                MediaLibrary.MediaType.photo,
                MediaLibrary.MediaType.video,
              ],
              sortBy:
                MediaLibrary.SortBy.creationTime,
            }
          );

        setMediaAssets(
          result.assets
        );

        setMediaVisible(
          true
        );
      } finally {
        setMediaLoading(false);
      }
    };

  const sendGalleryAsset =
    async (
      asset: MediaLibrary.Asset
    ) => {
      if (
        !conversationId ||
        sending
      ) {
        return;
      }

      setSending(true);

      try {
        const info =
          await MediaLibrary.getAssetInfoAsync(
            asset
          );

        const uri =
          info.localUri ||
          asset.uri;

        const isVideo =
          asset.mediaType ===
          MediaLibrary.MediaType.video;

        const url =
          await uploadFile(
            uri,
            isVideo
              ? "video"
              : "image",
            isVideo
              ? "video/mp4"
              : "image/jpeg"
          );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "send_media_message",
            {
              p_conversation_id:
                conversationId,
              p_message_type:
                isVideo
                  ? "video"
                  : "image",
              p_media_url:
                url,
              p_thumbnail_url:
                null,
              p_duration_ms:
                asset.duration > 0
                  ? Math.round(
                      asset.duration *
                        1000
                    )
                  : null,
              p_reply_to_message_id:
                replyTo?.id ||
                null,
              p_metadata: {
                width:
                  asset.width,
                height:
                  asset.height,
              },
            }
          );

        if (error) {
          Alert.alert(
            "Medya",
            error.message
          );
          return;
        }

        if (data) {
          setMessages(
            previous => [
              ...previous,
              {
                ...(data as Message),
                replyMessage:
                  replyTo,
              },
            ]
          );
        }

        setReplyTo(null);
        setMediaVisible(false);
      } catch (error: any) {
        Alert.alert(
          "Medya",
          error?.message ||
            "Medya gönderilemedi."
        );
      } finally {
        setSending(false);
      }
    };

  const addReaction =
    async (
      message: Message
    ) => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "toggle_message_reaction",
          {
            p_message_id:
              message.id,
            p_reaction:
              "❤️",
          }
        );

      if (error) {
        Alert.alert(
          "Emoji",
          error.message
        );
        return;
      }

      setMessages(
        previous =>
          previous.map(
            item =>
              item.id ===
              message.id
                ? {
                    ...item,
                    reaction:
                      data?.reaction ||
                      null,
                    reaction_user_id:
                      data?.user_id ||
                      null,
                  }
                : item
          )
      );
    };

  const handleMessagePress =
    (
      message: Message
    ) => {
      const now =
        Date.now();

      const previous =
        lastTapRef.current;

      if (
        previous &&
        previous.messageId ===
          message.id &&
        now -
          previous.time <
          300
      ) {
        lastTapRef.current =
          null;

        void Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Light
        );

        void addReaction(
          message
        );

        return;
      }

      lastTapRef.current = {
        messageId:
          message.id,
        time: now,
      };
    };

  const closeChat =
    useCallback(
      async () => {
        if (conversationId) {
          await supabase.rpc(
            "mark_conversation_read",
            {
              p_conversation_id:
                conversationId,
            }
          );
        }

        setConversationId(null);
        setOtherUser(null);
        setMessages([]);
        setReplyTo(null);
        setEditingMessage(null);
        setText("");
        setOtherUserTyping(false);
        setOtherUserRecording(false);
        await loadConversations();
      },
      [
        conversationId,
        loadConversations,
      ]
    );

  useEffect(() => {
    if (
      Platform.OS !==
        "android" ||
      !conversationId
    ) {
      return;
    }

    const subscription =
      BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          void closeChat();
          return true;
        }
      );

    return () =>
      subscription.remove();
  }, [
    conversationId,
    closeChat,
  ]);

  const handleLongPress =
    (
      message: Message
    ) => {
      setSelectedMessage(
        message
      );

      setActionMenuVisible(
        true
      );

      void Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle.Medium
      );
    };

  const editSelected =
    () => {
      if (
        !selectedMessage ||
        selectedMessage.sender_id !==
          userId
      ) {
        return;
      }

      setEditingMessage(
        selectedMessage
      );

      setText(
        selectedMessage.body
      );

      setActionMenuVisible(
        false
      );

      setTimeout(
        () =>
          inputRef.current?.focus(),
        100
      );
    };

  const replySelected =
    () => {
      if (!selectedMessage) {
        return;
      }

      setReplyTo(
        selectedMessage
      );

      setActionMenuVisible(
        false
      );

      setTimeout(
        () =>
          inputRef.current?.focus(),
        100
      );
    };

  const deleteSelected =
    (
      scope:
        | "me"
        | "everyone"
    ) => {
      if (!selectedMessage) {
        return;
      }

      setActionMenuVisible(
        false
      );

      void (async () => {
        const {
          error,
        } =
          await supabase.rpc(
            "delete_direct_message",
            {
              p_message_id:
                selectedMessage.id,
              p_scope:
                scope,
            }
          );

        if (error) {
          Alert.alert(
            "Sil",
            error.message
          );
          return;
        }

        // Her iki silme türünde de önce UI'dan
        // anında kaldırıyoruz.
        setMessages(
          previous =>
            previous.filter(
              item =>
                item.id !==
                selectedMessage.id
            )
        );

        setSelectedMessage(
          null
        );
      })();
    };

  const renderMedia =
    (
      message: Message,
      mine: boolean
    ) => {
      if (
        message.message_type ===
          "image" &&
        message.media_url
      ) {
        return (
          <Pressable
            onPress={() =>
              setPreview({
                uri:
                  message.media_url!,
                type:
                  "image",
              })
            }
          >
            <Image
              source={{
                uri:
                  message.media_url,
              }}
              style={
                styles.messageImage
              }
            />
          </Pressable>
        );
      }

      if (
        message.message_type ===
          "video" &&
        message.media_url
      ) {
        return (
          <Pressable
            onPress={() =>
              setPreview({
                uri:
                  message.media_url!,
                type:
                  "video",
              })
            }
          >
            <View
              style={
                styles.messageVideo
              }
            >
              <Video
                source={{
                  uri:
                    message.media_url,
                }}
                style={
                  styles.messageVideoInner
                }
                resizeMode={
                  ResizeMode.COVER
                }
                shouldPlay={
                  false
                }
                isMuted
              />

              <View
                style={
                  styles.videoOverlay
                }
              >
                <View
                  style={
                    styles.videoPlayCircle
                  }
                >
                  <DMIcon
                    type="play"
                    size={17}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </View>
          </Pressable>
        );
      }

      if (
        message.message_type ===
          "audio" &&
        message.media_url
      ) {
        return (
          <AudioMessage
            uri={
              message.media_url
            }
            duration={
              message.duration_ms
            }
            mine={mine}
          />
        );
      }

      return null;
    };

  const renderReply =
    (
      message: Message
    ) => {
      if (
        !message.replyMessage
      ) {
        return null;
      }

      return (
        <View
          style={
            styles.replyQuote
          }
        >
          <View
            style={
              styles.replyLine
            }
          />

          <View
            style={
              styles.replyQuoteText
            }
          >
            <Text
              style={
                styles.replyQuoteName
              }
            >
              {message
                .replyMessage
                .sender_id ===
              userId
                ? "Siz"
                : otherUser?.username ||
                  otherUser?.name ||
                  "Kullanıcı"}
            </Text>

            <Text
              style={
                styles.replyQuoteBody
              }
              numberOfLines={1}
            >
              {message
                .replyMessage
                .message_type ===
              "image"
                ? "Fotoğraf"
                : message
                    .replyMessage
                    .message_type ===
                  "video"
                ? "Video"
                : message
                    .replyMessage
                    .message_type ===
                  "audio"
                ? "Ses kaydı"
                : message
                    .replyMessage
                    .body}
            </Text>
          </View>
        </View>
      );
    };

  const renderMessage =
    ({
      item,
    }: {
      item: Message;
    }) => {
      const mine =
        item.sender_id ===
        userId;

      const deleted =
        !!item.deleted_at;

      return (
        <SwipeMessage
          onReply={() =>
            setReplyTo(
              item
            )
          }
        >
          <Pressable
            onPress={() =>
              handleMessagePress(
                item
              )
            }
            onLongPress={() =>
              handleLongPress(
                item
              )
            }
            delayLongPress={
              420
            }
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
                deleted &&
                  styles.bubbleDeleted,
              ]}
            >
              {renderReply(
                item
              )}

              {deleted ? (
                <Text
                  style={[
                    styles.deletedMessage,
                    mine &&
                      styles.deletedMessageMine,
                  ]}
                >
                  Bu mesaj silindi
                </Text>
              ) : (
                <>
                  {renderMedia(
                    item,
                    mine
                  )}

                  {item.message_type ===
                    "text" && (
                    <Text
                      style={[
                        styles.messageText,
                        mine &&
                          styles.messageTextMine,
                      ]}
                    >
                      {item.body}
                      {item.edited_at
                        ? "  (düzenlendi)"
                        : ""}
                    </Text>
                  )}
                </>
              )}

              {item.reaction && (
                <View
                  style={[
                    styles.reactionBadge,
                    mine &&
                      styles.reactionBadgeMine,
                  ]}
                >
                  <Text
                    style={
                      styles.reactionEmoji
                    }
                  >
                    {item.reaction}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.messageMeta
              }
            >
              <Text
                style={
                  styles.messageTime
                }
              >
                {formatTime(
                  item.created_at
                )}
              </Text>

              {mine && (
                <View
                  style={
                    styles.readMeta
                  }
                >
                  <DMIcon
                    type="check"
                    size={11}
                    color={
                      item.read_at
                        ? theme.colors
                            .primary
                        : "#64748B"
                    }
                  />

                  <Text
                    style={[
                      styles.readText,
                      item.read_at &&
                        styles.readTextSeen,
                    ]}
                  >
                    {item.read_at
                      ? "Görüldü"
                      : item.seen_at
                      ? "Okundu"
                      : "Gönderildi"}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </SwipeMessage>
      );
    };

  if (
    loading
  ) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={false}
      >
        <View
          style={
            styles.loading
          }
        >
          <ActivityIndicator
            size="large"
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
    !conversationId
  ) {
    return (
      <ScreenWarpper
        autoDismissKeyboard={
          false
        }
      >
        <View
          style={
            styles.listScreen
          }
        >
          <View
            style={
              styles.listHeader
            }
          >
            <View>
              <Text
                style={
                  styles.eyebrow
                }
              >
                NYSAPP
              </Text>

              <Text
                style={
                  styles.listTitle
                }
              >
                Mesajlar
              </Text>

              <Text
                style={
                  styles.listSubtitle
                }
              >
                Sohbetlerine devam et
              </Text>
            </View>

            <View
              style={
                styles.headerCircle
              }
            >
              <Icon
                name="mail"
                size={22}
                color={
                  theme.colors
                    .primary
                }
              />
            </View>
          </View>

          <View
            style={
              styles.searchBox
            }
          >
            <Icon
              name="search"
              size={19}
              color="#94A3B8"
            />

            <TextInput
              value={
                searchText
              }
              onChangeText={
                setSearchText
              }
              placeholder="Kullanıcı ara..."
              placeholderTextColor="#64748B"
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
                  setSearchText(
                    ""
                  )
                }
              >
                <DMIcon
                  type="close"
                  size={18}
                  color="#94A3B8"
                />
              </Pressable>
            )}
          </View>

          {searching ? (
            <View
              style={
                styles.centerArea
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
                styles.listContent
              }
              renderItem={({
                item,
              }) => (
                <Pressable
                  style={
                    styles.searchUser
                  }
                  onPress={() =>
                    void openConversation(
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
                      hp(6)
                    }
                    rounded={
                      hp(3)
                    }
                  />

                  <View
                    style={
                      styles.searchUserInfo
                    }
                  >
                    <Text
                      style={
                        styles.searchUserName
                      }
                    >
                      {item.username ||
                        item.name}
                    </Text>

                    <Text
                      style={
                        styles.searchUserSub
                      }
                    >
                      {item.name}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.arrow
                    }
                  >
                    ›
                  </Text>
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={
                conversationsMemo
              }
              keyExtractor={
                item =>
                  item.id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.listContent
              }
              refreshControl={
                <RefreshControl
                  refreshing={
                    refreshing
                  }
                  onRefresh={async () => {
                    setRefreshing(
                      true
                    );
                    await loadConversations();
                    setRefreshing(
                      false
                    );
                  }}
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
                  style={[
                    styles.conversation,
                    item.unread &&
                      styles.conversationUnread,
                  ]}
                  onPress={() =>
                    void openConversation(
                      item
                        .otherUser
                        ?.id ||
                        "",
                      item.otherUser
                    )
                  }
                >
                  <View
                    style={
                      styles.conversationAvatar
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
                          styles.unreadDot
                        }
                      />
                    )}
                  </View>

                  <View
                    style={
                      styles.conversationInfo
                    }
                  >
                    <View
                      style={
                        styles.conversationTop
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

                      {item.lastMessage && (
                        <Text
                          style={
                            styles.conversationTime
                          }
                        >
                          {formatTime(
                            item
                              .lastMessage
                              .created_at
                          )}
                        </Text>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.conversationPreview,
                        item.unread &&
                          styles.conversationPreviewUnread,
                      ]}
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
                    styles.emptyArea
                  }
                >
                  <View
                    style={
                      styles.emptyIcon
                    }
                  >
                    <Icon
                      name="mail"
                      size={28}
                      color={
                        theme.colors
                          .primary
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    Henüz konuşma yok
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Yukarıdan bir kullanıcı arayarak
                    sohbet başlatabilirsin.
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <BottomNav />
      </ScreenWarpper>
    );
  }

  return (
    <ScreenWarpper
      autoDismissKeyboard={false}
    >
      <View
        style={
          styles.chatScreen
        }
      >
        <View
          style={
            styles.chatHeader
          }
        >
          <Pressable
            onPress={
              closeChat
            }
            style={
              styles.backButton
            }
            hitSlop={8}
          >
            <Icon
              name="arrowLeft"
              size={22}
              color={
                theme.colors
                  .text
              }
            />
          </Pressable>

          <Pressable
            style={
              styles.chatProfile
            }
            onPress={() => {
              if (
                otherUser?.id
              ) {
                router.push({
                  pathname:
                    "/profile",
                  params: {
                    userId:
                      otherUser.id,
                  },
                });
              }
            }}
          >
            <Avatar
              uri={
                otherUser?.image ||
                null
              }
              size={
                hp(5.4)
              }
              rounded={
                hp(2.7)
              }
            />

            <View
              style={
                styles.chatProfileText
              }
            >
              <Text
                style={
                  styles.chatProfileName
                }
                numberOfLines={
                  1
                }
              >
                {otherUser?.username ||
                  otherUser?.name ||
                  "Kullanıcı"}
              </Text>

              {otherUserRecording ? (
                <Text
                  style={
                    styles.typingText
                  }
                >
                  Ses kaydediyor...
                </Text>
              ) : otherUserTyping ? (
                <Text
                  style={
                    styles.typingText
                  }
                >
                  Yazıyor...
                </Text>
              ) : otherUser?.show_online_status !==
                false ? (
                <View
                  style={
                    styles.statusRow
                  }
                >
                  <View
                    style={[
                      styles.statusDot,
                      otherUserOnline
                        ? styles.statusOnline
                        : styles.statusOffline,
                    ]}
                  />

                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {otherUserOnline
                      ? "Çevrimiçi"
                      : "Çevrimdışı"}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        <KeyboardAvoidingView
          style={
            styles.chatBody
          }
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
          keyboardVerticalOffset={
            Platform.OS ===
            "ios"
              ? 0
              : 0
          }
        >
          {replyTo && (
            <View
              style={
                styles.replyComposer
              }
            >
              <View
                style={
                  styles.replyComposerLine
                }
              />

              <View
                style={
                  styles.replyComposerTextWrap
                }
              >
                <Text
                  style={
                    styles.replyComposerTitle
                  }
                >
                  Yanıtlanıyor
                </Text>

                <Text
                  style={
                    styles.replyComposerBody
                  }
                  numberOfLines={
                    1
                  }
                >
                  {replyTo.message_type ===
                  "image"
                    ? "Fotoğraf"
                    : replyTo.message_type ===
                      "video"
                    ? "Video"
                    : replyTo.message_type ===
                      "audio"
                    ? "Ses kaydı"
                    : replyTo.body}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setReplyTo(
                    null
                  )
                }
              >
                <DMIcon
                  type="close"
                  size={19}
                  color="#94A3B8"
                />
              </Pressable>
            </View>
          )}

          <FlatList
            inverted
            data={[
              ...messages,
            ].reverse()}
            renderItem={
              renderMessage
            }
            keyExtractor={
              item =>
                item.id
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.messageList
            }
            ListEmptyComponent={
              <View
                style={
                  styles.chatEmpty
                }
              >
                <View
                  style={
                    styles.chatEmptyIcon
                  }
                >
                  <Icon
                    name="mail"
                    size={26}
                    color={
                      theme.colors
                        .primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.chatEmptyTitle
                  }
                >
                  Yeni sohbet
                </Text>

                <Text
                  style={
                    styles.chatEmptyText
                  }
                >
                  İlk mesajı gönder.
                </Text>
              </View>
            }
          />

          {isRecording && (
            <View
              style={
                styles.recordingBar
              }
            >
              <View
                style={
                  styles.recordingDot
                }
              />

              <Text
                style={
                  styles.recordingText
                }
              >
                Ses kaydediliyor...
              </Text>

              <Pressable
                onPress={() =>
                  void stopRecording()
                }
              >
                <Text
                  style={
                    styles.recordingCancel
                  }
                >
                  İptal
                </Text>
              </Pressable>
            </View>
          )}

          {recordedAudioUri && (
            <View
              style={
                styles.recordedAudioRow
              }
            >
              <View
                style={
                  styles.recordedAudioPreview
                }
              >
                <AudioMessage
                  uri={
                    recordedAudioUri
                  }
                  duration={
                    recordedAudioDuration
                  }
                  mine={true}
                />
              </View>

              <Pressable
                onPress={
                  discardRecordedAudio
                }
                style={
                  styles.recordedAudioDelete
                }
              >
                <DMIcon
                  type="trash"
                  size={18}
                  color="#FB7185"
                />
              </Pressable>

              <Pressable
                onPress={
                  sendRecordedAudio
                }
                disabled={
                  sending
                }
                style={
                  styles.recordedAudioSend
                }
              >
                {sending ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <DMIcon
                    type="send"
                    size={19}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>
            </View>
          )}

          <View
            style={
              styles.composer
            }
          >
            <Pressable
              style={
                styles.composerButton
              }
              onPress={
                loadAppGallery
              }
              disabled={
                mediaLoading ||
                sending
              }
            >
              <DMIcon
                type="gallery"
                size={22}
              />
            </Pressable>

            <TextInput
              ref={
                inputRef
              }
              value={
                text
              }
              onChangeText={
                onChangeText
              }
              placeholder={
                editingMessage
                  ? "Mesajı düzenle..."
                  : "Mesaj..."
              }
              placeholderTextColor="#64748B"
              style={
                styles.composerInput
              }
              multiline
              maxLength={
                3000
              }
            />

            {text.trim() ||
            editingMessage ? (
              <Pressable
                style={
                  styles.sendButton
                }
                onPress={
                  sendText
                }
                disabled={
                  sending
                }
              >
                {sending ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <DMIcon
                    type="send"
                    size={21}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>
            ) : recordedAudioUri ? (
              <View
                style={
                  styles.recordedAudioActions
                }
              >
                <Pressable
                  onPress={
                    discardRecordedAudio
                  }
                  style={
                    styles.recordedAudioDelete
                  }
                >
                  <DMIcon
                    type="trash"
                    size={18}
                    color="#FB7185"
                  />
                </Pressable>

                <AudioMessage
                  uri={
                    recordedAudioUri
                  }
                  duration={
                    recordedAudioDuration
                  }
                  mine={true}
                />

                <Pressable
                  onPress={
                    sendRecordedAudio
                  }
                  disabled={
                    sending
                  }
                  style={
                    styles.recordedAudioSend
                  }
                >
                  {sending ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <DMIcon
                      type="send"
                      size={19}
                      color="#FFFFFF"
                    />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[
                  styles.sendButton,
                  isRecording &&
                    styles.sendButtonRecording,
                ]}
                onPress={() => {
                  // Basılı tutma kontrolü onLongPress/onPressOut'ta.
                }}
                onLongPress={
                  startRecording
                }
                onPressOut={() => {
                  if (
                    isRecording
                  ) {
                    void stopRecording();
                  }
                }}
                delayLongPress={
                  180
                }
              >
                <DMIcon
                  type="mic"
                  size={21}
                  color="#FFFFFF"
                />
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        visible={
          actionMenuVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setActionMenuVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalBackdrop
          }
          onPress={() =>
            setActionMenuVisible(
              false
            )
          }
        >
          <View
            style={
              styles.actionSheet
            }
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <Text
              style={
                styles.sheetTitle
              }
            >
              Mesaj
            </Text>

            <Pressable
              style={
                styles.sheetItem
              }
              onPress={
                replySelected
              }
            >
              <DMIcon
                type="reply"
                size={21}
              />

              <Text
                style={
                  styles.sheetItemText
                }
              >
                Yanıtla
              </Text>
            </Pressable>

            {selectedMessage &&
              selectedMessage.sender_id ===
                userId && (
                <Pressable
                  style={
                    styles.sheetItem
                  }
                  onPress={
                    editSelected
                  }
                >
                  <DMIcon
                    type="edit"
                    size={21}
                  />

                  <Text
                    style={
                      styles.sheetItemText
                    }
                  >
                    Düzenle
                  </Text>
                </Pressable>
              )}

            <Pressable
              style={
                styles.sheetItem
              }
              onPress={() => {
                if (
                  selectedMessage
                ) {
                  void addReaction(
                    selectedMessage
                  );
                }

                setActionMenuVisible(
                  false
                );
              }}
            >
              <DMIcon
                type="heart"
                size={21}
              />

              <Text
                style={
                  styles.sheetItemText
                }
              >
                ❤️ Tepki bırak
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.sheetItem
              }
              onPress={() => {
                if (
                  selectedMessage
                ) {
                  setActionMenuVisible(
                    false
                  );

                  Alert.alert(
                    "Mesajı sil",
                    "Mesajı kimden silmek istiyorsun?",
                    [
                      {
                        text:
                          "Vazgeç",
                        style:
                          "cancel",
                      },
                      {
                        text:
                          "Sadece benden",
                        onPress:
                          () =>
                            deleteSelected(
                              "me"
                            ),
                      },
                      ...(selectedMessage.sender_id ===
                      userId
                        ? [
                            {
                              text:
                                "Herkesten",
                              style:
                                "destructive" as const,
                              onPress:
                                () =>
                                  deleteSelected(
                                    "everyone"
                                  ),
                            },
                          ]
                        : []),
                    ]
                  );
                }
              }}
            >
              <DMIcon
                type="trash"
                size={21}
                color="#FB7185"
              />

              <Text
                style={[
                  styles.sheetItemText,
                  styles.deleteItem,
                ]}
              >
                Sil
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={
          mediaVisible
        }
        animationType="slide"
        transparent
        onRequestClose={() =>
          setMediaVisible(false)
        }
      >
        <View
          style={
            styles.mediaOverlay
          }
        >
          <View
            style={
              styles.mediaSheet
            }
          >
            <View
              style={
                styles.mediaHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.mediaTitle
                  }
                >
                  Nysapp Galerisi
                </Text>

                <Text
                  style={
                    styles.mediaSubtitle
                  }
                >
                  Fotoğraf veya video seç
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setMediaVisible(
                    false
                  )
                }
              >
                <DMIcon
                  type="close"
                  size={22}
                  color="#94A3B8"
                />
              </Pressable>
            </View>

            {mediaLoading ? (
              <View
                style={
                  styles.centerArea
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
              <>
                <FlatList
                data={
                  mediaAssets
                }
                numColumns={
                  3
                }
                keyExtractor={
                  asset =>
                    asset.id
                }
                contentContainerStyle={
                  styles.galleryGrid
                }
                renderItem={({
                  item,
                }) => (
                  <Pressable
                    style={[
                      styles.galleryItem,
                      selectedMedia?.id ===
                        item.id &&
                        styles.galleryItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMedia(
                        previous =>
                          previous?.id ===
                          item.id
                            ? null
                            : item
                      );
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          item.uri,
                      }}
                      style={[
                        styles.galleryImage,
                        selectedMedia?.id ===
                          item.id &&
                          styles.galleryImageSelected,
                      ]}
                    />

                    {item.mediaType ===
                      MediaLibrary.MediaType.video && (
                      <View
                        style={
                          styles.videoBadge
                        }
                      >
                        <DMIcon
                          type="play"
                          size={13}
                          color="#FFFFFF"
                        />
                      </View>
                    )}

                    {selectedMedia?.id ===
                      item.id && (
                      <View
                        style={
                          styles.gallerySelectedOverlay
                        }
                      >
                        <View
                          style={
                            styles.gallerySelectedCheck
                          }
                        >
                          <DMIcon
                            type="check"
                            size={15}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    )}
                  </Pressable>
                )}
                />
                {selectedMedia && (
                  <View
                    style={
                      styles.mediaSendBar
                    }
                  >
                    <View
                      style={
                        styles.mediaSelectedInfo
                      }
                    >
                      <Image
                        source={{
                          uri:
                            selectedMedia.uri,
                        }}
                        style={
                          styles.mediaSelectedPreview
                        }
                      />

                      <View
                        style={
                          styles.mediaSelectedText
                        }
                      >
                        <Text
                          style={
                            styles.mediaSelectedTitle
                          }
                        >
                          {selectedMedia.mediaType ===
                          MediaLibrary.MediaType.video
                            ? "Video seçildi"
                            : "Fotoğraf seçildi"}
                        </Text>

                        <Text
                          style={
                            styles.mediaSelectedSub
                          }
                        >
                          Göndermek için hazır
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={async () => {
                        await sendGalleryAsset(
                          selectedMedia
                        );

                        setSelectedMedia(
                          null
                        );
                      }}
                      disabled={
                        sending
                      }
                      style={
                        styles.mediaSendButton
                      }
                    >
                      {sending ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <>
                          <DMIcon
                            type="send"
                            size={18}
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.mediaSendButtonText
                            }
                          >
                            Gönder
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          !!preview
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPreview(null)
        }
      >
        <View
          style={
            styles.previewOverlay
          }
        >
          <Pressable
            style={
              styles.previewClose
            }
            onPress={() =>
              setPreview(null)
            }
          >
            <DMIcon
              type="close"
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          {preview?.type ===
          "image" ? (
            <Image
              source={{
                uri:
                  preview.uri,
              }}
              style={
                styles.previewImage
              }
              resizeMode="contain"
            />
          ) : preview ? (
            <Video
              source={{
                uri:
                  preview.uri,
              }}
              style={
                styles.previewVideo
              }
              resizeMode={
                ResizeMode.CONTAIN
              }
              useNativeControls
              shouldPlay
            />
          ) : null}
        </View>
      </Modal>

      {!conversationId && (
        <BottomNav />
      )}
    </ScreenWarpper>
  );
};

export default DMScreen;

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    listScreen: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
      paddingHorizontal:
        wp(4),
    },

    listHeader: {
      minHeight:
        hp(11),
      paddingTop:
        hp(1.5),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    eyebrow: {
      color:
        theme.colors
          .primary,
      fontSize:
        hp(1.05),
      fontWeight:
        theme.fonts.bold,
      letterSpacing:
        1.4,
    },

    listTitle: {
      marginTop: 3,
      color:
        theme.colors.text,
      fontSize:
        hp(2.7),
      fontWeight:
        theme.fonts.bold,
    },

    listSubtitle: {
      marginTop: 2,
      color:
        "#94A3B8",
      fontSize:
        hp(1.25),
    },

    headerCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
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

    searchBox: {
      minHeight:
        hp(6.2),
      borderRadius:
        20,
      paddingHorizontal:
        14,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 9,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      marginBottom:
        12,
    },

    searchInput: {
      flex: 1,
      color:
        theme.colors.text,
      fontSize:
        hp(1.45),
      minHeight:
        hp(5.6),
    },

    listContent: {
      paddingBottom:
        hp(10),
      gap: 8,
    },

    searchUser: {
      minHeight:
        hp(8),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      borderRadius:
        18,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    searchUserInfo: {
      flex: 1,
      marginLeft:
        12,
    },

    searchUserName: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.55),
      fontWeight:
        theme.fonts.bold,
    },

    searchUserSub: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.15),
    },

    arrow: {
      color:
        "#94A3B8",
      fontSize: 27,
      marginRight: 5,
    },

    conversation: {
      minHeight:
        hp(9),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      borderRadius:
        20,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    conversationUnread: {
      borderColor:
        theme.colors.primary,
    },

    conversationAvatar: {
      position:
        "relative",
    },

    unreadDot: {
      position:
        "absolute",
      right: 0,
      bottom: 2,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor:
        theme.colors.primary,
      borderWidth: 2,
      borderColor:
        theme.colors.card,
    },

    conversationInfo: {
      flex: 1,
      marginLeft:
        12,
    },

    conversationTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    conversationName: {
      flex: 1,
      color:
        theme.colors.text,
      fontSize:
        hp(1.55),
      fontWeight:
        theme.fonts.semibold,
    },

    conversationNameUnread: {
      fontWeight:
        theme.fonts.bold,
    },

    conversationPreview: {
      marginTop: 4,
      color:
        "#94A3B8",
      fontSize:
        hp(1.15),
    },

    conversationPreviewUnread: {
      color:
        theme.colors.text,
      fontWeight:
        theme.fonts.semibold,
    },

    conversationTime: {
      color:
        "#64748B",
      fontSize:
        hp(0.9),
    },

    emptyArea: {
      alignItems:
        "center",
      paddingTop:
        hp(18),
      paddingHorizontal:
        wp(8),
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
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

    emptyTitle: {
      marginTop: 16,
      color:
        theme.colors.text,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
    },

    emptyText: {
      marginTop: 6,
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
      textAlign:
        "center",
      lineHeight:
        hp(1.9),
    },

    centerArea: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chatScreen: {
      flex: 1,
      backgroundColor:
        theme.colors
          .background,
    },

    chatHeader: {
      height:
        hp(9),
      minHeight:
        66,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        8,
      backgroundColor:
        theme.colors.card,
      borderBottomWidth:
        1,
      borderBottomColor:
        theme.colors.gray,
    },

    backButton: {
      width: 44,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chatProfile: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        4,
      gap: 10,
    },

    chatProfileText: {
      flex: 1,
    },

    chatProfileName: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.55),
      fontWeight:
        theme.fonts.bold,
    },

    typingText: {
      marginTop: 2,
      color:
        theme.colors.primary,
      fontSize:
        hp(1.05),
      fontWeight:
        theme.fonts.semibold,
    },

    statusRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 2,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    statusOnline: {
      backgroundColor:
        "#22C55E",
    },

    statusOffline: {
      backgroundColor:
        "#64748B",
    },

    statusText: {
      color:
        "#94A3B8",
      fontSize:
        hp(0.95),
    },

    headerSpacer: {
      width: 44,
    },

    chatBody: {
      flex: 1,
    },

    messageList: {
      paddingHorizontal:
        wp(3.5),
      paddingTop:
        hp(1),
      paddingBottom:
        hp(1),
    },

    messageRow: {
      maxWidth:
        "88%",
      marginVertical:
        4,
    },

    messageRowMine: {
      alignSelf:
        "flex-end",
    },

    messageRowOther: {
      alignSelf:
        "flex-start",
    },

    bubble: {
      padding:
        10,
      borderRadius:
        18,
      minWidth: 46,
      maxWidth:
        wp(79),
      position:
        "relative",
    },

    bubbleMine: {
      backgroundColor:
        theme.colors.primary,
      borderBottomRightRadius:
        5,
    },

    bubbleOther: {
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderBottomLeftRadius:
        5,
    },

    bubbleDeleted: {
      opacity:
        0.72,
    },

    messageText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2.05),
    },

    messageTextMine: {
      color:
        "#FFFFFF",
    },

    deletedMessage: {
      color:
        "#94A3B8",
      fontStyle:
        "italic",
      fontSize:
        hp(1.3),
    },

    deletedMessageMine: {
      color:
        "#E2E8F0",
    },

    messageMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "flex-end",
      gap: 5,
      marginTop: 3,
      paddingHorizontal: 3,
    },

    messageTime: {
      color:
        "#64748B",
      fontSize:
        hp(0.88),
    },

    readMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 2,
    },

    readText: {
      color:
        "#64748B",
      fontSize:
        hp(0.88),
    },

    readTextSeen: {
      color:
        theme.colors.primary,
    },

    reactionBadge: {
      position:
        "absolute",
      right: -4,
      bottom: -10,
      width: 27,
      height: 27,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      elevation: 3,
    },

    reactionBadgeMine: {
      right: -4,
    },

    reactionEmoji: {
      fontSize: 15,
    },

    replyQuote: {
      flexDirection:
        "row",
      padding:
        7,
      marginBottom:
        7,
      borderRadius:
        10,
      backgroundColor:
        "rgba(255,255,255,0.09)",
    },

    replyLine: {
      width: 3,
      borderRadius: 2,
      backgroundColor:
        theme.colors.primary,
      marginRight: 7,
    },

    replyQuoteText: {
      flex: 1,
    },

    replyQuoteName: {
      color:
        "#A5B4FC",
      fontSize:
        hp(0.98),
      fontWeight:
        theme.fonts.bold,
    },

    replyQuoteBody: {
      marginTop: 2,
      color:
        "#CBD5E1",
      fontSize:
        hp(0.98),
    },

    messageImage: {
      width:
        wp(66),
      height:
        hp(25),
      borderRadius:
        14,
    },

    messageVideo: {
      width:
        wp(66),
      height:
        hp(25),
      borderRadius:
        14,
      overflow:
        "hidden",
    },

    messageVideoInner: {
      width:
        "100%",
      height:
        "100%",
    },

    videoOverlay: {
      position:
        "absolute",
      inset: 0,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.18)",
    },

    videoPlayCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.55)",
    },

    audioCard: {
      width:
        "100%",
      height: 54,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        8,
      gap: 8,
      borderRadius: 16,
      backgroundColor:
        "#EEF2FF",
    },

    audioCardMine: {
      backgroundColor:
        "rgba(255,255,255,0.14)",
    },

    audioPlay: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
    },

    audioPlayMine: {
      backgroundColor:
        "#6366F1",
    },

    wave: {
      flex: 1,
      height: 30,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 2,
    },

    waveBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor:
        "#6366F1",
    },

    waveBarMine: {
      backgroundColor:
        "#C7D2FE",
    },

    audioDuration: {
      color:
        "#475569",
      fontSize:
        hp(0.95),
    },

    audioDurationMine: {
      color:
        "#FFFFFF",
    },

    replyComposer: {
      minHeight:
        56,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        12,
      borderBottomWidth:
        1,
      borderBottomColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors.card,
      gap: 9,
    },

    replyComposerLine: {
      width: 4,
      alignSelf:
        "stretch",
      marginVertical: 8,
      borderRadius: 2,
      backgroundColor:
        theme.colors.primary,
    },

    replyComposerTextWrap: {
      flex: 1,
    },

    replyComposerTitle: {
      color:
        theme.colors.primary,
      fontSize:
        hp(1),
      fontWeight:
        theme.fonts.bold,
    },

    replyComposerBody: {
      marginTop: 2,
      color:
        "#CBD5E1",
      fontSize:
        hp(1.05),
    },

    recordedAudioRow: {
      minHeight: 64,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 8,
      backgroundColor:
        theme.colors.card,
      borderTopWidth: 1,
      borderTopColor:
        theme.colors.gray,
    },

    recordedAudioPreview: {
      flex: 1,
      minWidth: 0,
      overflow:
        "hidden",
    },

    recordedAudioDelete: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(244,63,94,0.10)",
      borderWidth: 1,
      borderColor:
        "rgba(244,63,94,0.25)",
    },

    recordedAudioSend: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
    },

    composer: {
      minHeight:
        64,
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      paddingHorizontal:
        10,
      paddingVertical:
        9,
      gap: 7,
      backgroundColor:
        theme.colors.card,
      borderTopWidth:
        1,
      borderTopColor:
        theme.colors.gray,
    },

    composerButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.background,
      borderWidth:
        1,
      borderColor:
        theme.colors.gray,
    },

    composerInput: {
      flex: 1,
      minHeight:
        42,
      maxHeight:
        hp(13),
      borderRadius:
        21,
      paddingHorizontal:
        15,
      paddingVertical:
        10,
      backgroundColor:
        theme.colors.background,
      borderWidth:
        1,
      borderColor:
        theme.colors.gray,
      color:
        theme.colors.text,
      fontSize:
        hp(1.4),
    },

    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
    },

    sendButtonRecording: {
      backgroundColor:
        "#EF4444",
    },

    recordingBar: {
      minHeight:
        42,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        14,
      gap: 8,
      backgroundColor:
        "#2A1620",
      borderTopWidth:
        1,
      borderTopColor:
        "#4A2530",
    },

    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        "#EF4444",
    },

    recordingText: {
      flex: 1,
      color:
        "#FCA5A5",
      fontSize:
        hp(1.1),
      fontWeight:
        theme.fonts.semibold,
    },

    recordingCancel: {
      color:
        "#FDA4AF",
      fontSize:
        hp(1.1),
      fontWeight:
        theme.fonts.bold,
    },

    chatEmpty: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "180deg",
        },
      ],
      paddingHorizontal:
        wp(12),
    },

    chatEmptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
      borderWidth:
        1,
      borderColor:
        theme.colors.gray,
    },

    chatEmptyTitle: {
      marginTop: 14,
      color:
        theme.colors.text,
      fontSize:
        hp(1.75),
      fontWeight:
        theme.fonts.bold,
    },

    chatEmptyText: {
      marginTop: 5,
      color:
        "#94A3B8",
      fontSize:
        hp(1.15),
    },

    swipeContainer: {
      position:
        "relative",
    },

    swipeReply: {
      position:
        "absolute",
      left: 4,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    modalBackdrop: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(0,0,0,0.5)",
    },

    actionSheet: {
      paddingTop: 9,
      paddingBottom:
        hp(3),
      paddingHorizontal:
        10,
      borderTopLeftRadius:
        28,
      borderTopRightRadius:
        28,
      backgroundColor:
        theme.colors.card,
      borderWidth:
        1,
      borderColor:
        theme.colors.gray,
    },

    sheetHandle: {
      alignSelf:
        "center",
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        "#64748B",
      marginBottom:
        14,
    },

    sheetTitle: {
      marginBottom: 6,
      paddingHorizontal: 10,
      color:
        "#94A3B8",
      fontSize:
        hp(1.05),
      fontWeight:
        theme.fonts.bold,
    },

    sheetItem: {
      minHeight:
        54,
      borderRadius:
        16,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        12,
      gap: 12,
    },

    sheetItemText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.semibold,
    },

    deleteItem: {
      color:
        "#FB7185",
    },

    mediaOverlay: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(0,0,0,0.55)",
    },

    mediaSheet: {
      height:
        "82%",
      borderTopLeftRadius:
        28,
      borderTopRightRadius:
        28,
      backgroundColor:
        theme.colors.background,
      overflow:
        "hidden",
    },

    mediaHeader: {
      minHeight:
        76,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        18,
      backgroundColor:
        theme.colors.card,
      borderBottomWidth:
        1,
      borderBottomColor:
        theme.colors.gray,
    },

    mediaSendBar: {
      minHeight: 76,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      backgroundColor:
        theme.colors.card,
      borderTopWidth:
        1,
      borderTopColor:
        theme.colors.gray,
    },

    mediaSelectedInfo: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      marginRight: 10,
    },

    mediaSelectedPreview: {
      width: 50,
      height: 50,
      borderRadius: 10,
      backgroundColor:
        theme.colors.background,
    },

    mediaSelectedText: {
      flex: 1,
    },

    mediaSelectedTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.25),
      fontWeight:
        theme.fonts.semibold,
    },

    mediaSelectedSub: {
      marginTop: 2,
      color:
        "#94A3B8",
      fontSize:
        hp(1),
    },

    mediaSendButton: {
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
      backgroundColor:
        theme.colors.primary,
    },

    mediaSendButtonText: {
      color:
        "#FFFFFF",
      fontSize:
        hp(1.15),
      fontWeight:
        theme.fonts.bold,
    },

    recordedAudioActions: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
    },

    mediaTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
    },

    mediaSubtitle: {
      marginTop: 3,
      color:
        "#94A3B8",
      fontSize:
        hp(1.05),
    },

    galleryGrid: {
      padding: 4,
    },

    galleryItem: {
      width:
        "33.3333%",
      aspectRatio:
        1,
      padding: 2,
      position:
        "relative",
    },

    galleryItemSelected: {
      padding: 1,
    },

    galleryImageSelected: {
      borderWidth: 2,
      borderColor:
        theme.colors.primary,
    },

    gallerySelectedOverlay: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems:
        "flex-end",
      justifyContent:
        "flex-start",
      padding: 7,
      backgroundColor:
        "rgba(99,102,241,0.12)",
    },

    gallerySelectedCheck: {
      width: 25,
      height: 25,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    galleryImage: {
      flex: 1,
      borderRadius: 9,
      backgroundColor:
        theme.colors.card,
    },

    videoBadge: {
      position:
        "absolute",
      right: 7,
      bottom: 7,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.65)",
    },

    previewOverlay: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#000000",
    },

    previewClose: {
      position:
        "absolute",
      top: hp(5),
      right: wp(5),
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 10,
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    previewImage: {
      width: "100%",
      height: "82%",
    },

    previewVideo: {
      width: "100%",
      height: "72%",
    },
  });
