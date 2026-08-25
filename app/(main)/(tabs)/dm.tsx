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
  ScrollView,
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

import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

import * as Haptics from "expo-haptics";

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
  supabase,
} from "@/lib/supabase";

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
  read_at?: string | null;

  edited_at?: string | null;
  deleted_at?: string | null;

  reply_to_message_id?:
    string | null;

  message_type?:
    MessageType;

  media_url?: string | null;
  thumbnail_url?: string | null;

  duration_ms?: number | null;

  metadata?: Record<
    string,
    any
  > | null;

  reaction?: string | null;
  reaction_user_id?:
    string | null;

  replyMessage?: Message | null;
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

const formatDuration = (
  milliseconds:
    | number
    | null
    | undefined
) => {
  const total =
    Math.max(
      0,
      Math.round(
        Number(
          milliseconds || 0
        ) / 1000
      )
    );

  const minutes =
    Math.floor(
      total / 60
    );

  const seconds =
    total % 60;

  return `${minutes}:${String(
    seconds
  ).padStart(2, "0")}`;
};

const DMScreen =
  () => {
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
      useState<
        string | null
      >(null);

    const [
      otherUserId,
      setOtherUserId,
    ] =
      useState<
        string | null
      >(
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
        Conversation[
          "otherUser"
        ]
      >(null);

    const [
      otherUserLastSeen,
      setOtherUserLastSeen,
    ] =
      useState<
        string | null
      >(null);

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
      useState<
        Message[]
      >([]);

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
      useState<
        SearchUser[]
      >([]);

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
      isTyping,
      setIsTyping,
    ] = useState(false);

    const [
      otherUserTyping,
      setOtherUserTyping,
    ] =
      useState(false);

    const [
      isRecording,
      setIsRecording,
    ] = useState(false);

    const [
      selectedMessage,
      setSelectedMessage,
    ] =
      useState<
        Message | null
      >(null);

    const [
      isActionMenuVisible,
      setActionMenuVisible,
    ] = useState(false);

    const [
      editingMessage,
      setEditingMessage,
    ] =
      useState<
        Message | null
      >(null);

    const [
      replyTo,
      setReplyTo,
    ] =
      useState<
        Message | null
      >(null);

    const [
      showMediaPicker,
      setShowMediaPicker,
    ] = useState(false);

    const [
      mediaAssets,
      setMediaAssets,
    ] =
      useState<
        MediaLibrary.Asset[]
      >([]);

    const [
      mediaLoading,
      setMediaLoading,
    ] = useState(false);

    const [
      previewMedia,
      setPreviewMedia,
    ] =
      useState<{
        uri: string;
        type:
          | "image"
          | "video";
      } | null>(null);

    const inputRef =
      useRef<TextInput>(
        null
      );

    const recordingRef =
      useRef<Audio.Recording | null>(
        null
      );

    const typingTimeoutRef =
      useRef<
        ReturnType<
          typeof setTimeout
        > | null
      >(null);

    const replySwipeThreshold =
      wp(18);

    const updateMyPresence =
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
            return;
          }

          const visible =
            data?.show_online_status !==
            false;

          const lastSeen =
            data?.last_seen_at ||
            null;

          setOtherUserLastSeen(
            lastSeen
          );

          if (
            !visible ||
            !lastSeen
          ) {
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
            return;
          }

          const ids =
            (
              memberships ||
              []
            ).map(
              (
                item: any
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
              (
                id: string
              ) => {
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
                            last.message_type ===
                            "image"
                              ? "📷 Fotoğraf"
                              : last.message_type ===
                                "video"
                              ? "🎥 Video"
                              : last.message_type ===
                                "audio"
                              ? "🎤 Ses kaydı"
                              : last.body,
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
            void searchUsers(
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
            return;
          }

          setConversationId(
            data
          );

          setOtherUserId(
            targetUserId
          );

          setOtherUser(
            profile
              ? profile
              : null
          );

          if (!profile) {
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
        [
          userId,
          loadOtherUserPresence,
        ]
      );

    useEffect(() => {
      let mounted = true;

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

        if (mounted) {
          setLoading(
            false
          );
        }
      })();

      return () => {
        mounted = false;
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
                "id,conversation_id,sender_id,body,created_at,seen_at,read_at,edited_at,deleted_at,reply_to_message_id,message_type,media_url,thumbnail_url,duration_ms,metadata,reaction,reaction_user_id"
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
            return;
          }

          const raw =
            (data ||
              []) as Message[];

          const replies =
            new Map<
              string,
              Message
            >();

          raw.forEach(
            message => {
              replies.set(
                message.id,
                message
              );
            }
          );

          const hydrated =
            raw.map(
              message => ({
                ...message,
                replyMessage:
                  message.reply_to_message_id
                    ? replies.get(
                        message.reply_to_message_id
                      ) ||
                      null
                    : null,
              })
            );

          setMessages(
            hydrated
          );

          await supabase.rpc(
            "mark_conversation_read",
            {
              p_conversation_id:
                conversationId,
            }
          );

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

    useEffect(() => {
      void loadMessages();
    }, [
      loadMessages,
    ]);

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
                "*",
              schema:
                "public",
              table:
                "messages",
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

                    return [
                      ...previous,
                      incoming,
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
              event:
                "*",
              schema:
                "public",
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

              if (
                row.is_typing
              ) {
                setOtherUserTyping(
                  true
                );
              } else {
                setOtherUserTyping(
                  false
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

    const updateTypingState =
      useCallback(
        async (
          value: boolean
        ) => {
          if (
            !conversationId ||
            !userId
          ) {
            return;
          }

          await supabase.rpc(
            "set_dm_typing",
            {
              p_conversation_id:
                conversationId,
              p_is_typing:
                value,
              p_is_recording:
                false,
            }
          );
        },
        [
          conversationId,
          userId,
        ]
      );

    const onTextChange =
      (
        value: string
      ) => {
        setText(value);

        const active =
          value.trim()
            .length > 0;

        setIsTyping(
          active
        );

        void updateTypingState(
          active
        );

        if (
          typingTimeoutRef.current
        ) {
          clearTimeout(
            typingTimeoutRef.current
          );
        }

        typingTimeoutRef.current =
          setTimeout(
            () => {
              setIsTyping(
                false
              );

              void updateTypingState(
                false
              );
            },
            1400
          );
      };

    const uploadToSupabase =
      async (
        uri: string,
        mimeType: string,
        folder: string
      ) => {
        if (!userId) {
          throw new Error(
            "Oturum bulunamadı."
          );
        }

        const fileInfo =
          await FileSystem.getInfoAsync(
            uri
          );

        if (
          !fileInfo.exists
        ) {
          throw new Error(
            "Dosya bulunamadı."
          );
        }

        const fileName =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${mimeType.includes(
            "video"
          )
            ? "mp4"
            : mimeType.includes(
                "audio"
              )
            ? "m4a"
            : "jpg"}`;

        const path =
          `${userId}/${folder}/${fileName}`;

        const base64 =
          await FileSystem.readAsStringAsync(
            uri,
            {
              encoding:
                FileSystem.EncodingType
                  .Base64,
            }
          );

        const bytes =
          Uint8Array.from(
            atob(base64),
            c => c.charCodeAt(0)
          );

        const {
          error,
        } =
          await supabase.storage
            .from(
              "chat-media"
            )
            .upload(
              path,
              bytes,
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
          data:
            publicData,
        } =
          supabase.storage
            .from(
              "chat-media"
            )
            .getPublicUrl(
              path
            );

        return publicData
          .publicUrl;
      };

    const sendMessage =
      async () => {
        const body =
          text.trim();

        if (
          !conversationId ||
          sending
        ) {
          return;
        }

        if (
          editingMessage
        ) {
          setSending(
            true
          );

          try {
            const {
              data,
              error,
            } =
              await supabase.rpc(
                "edit_direct_message",
                {
                  p_message_id:
                    editingMessage.id,
                  p_body:
                    body,
                }
              );

            if (
              error
            ) {
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
                            ...data,
                          }
                        : item
                  )
              );
            }

            setEditingMessage(
              null
            );

            setText(
              ""
            );
          } finally {
            setSending(
              false
            );
          }

          return;
        }

        if (
          !body
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
                p_reply_to_message_id:
                  replyTo?.id ||
                  null,
              }
            );

          if (
            error
          ) {
            Alert.alert(
              "Mesaj",
              error.message
            );
            return;
          }

          if (
            data
          ) {
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

          setText(
            ""
          );

          setReplyTo(
            null
          );

          inputRef.current?.clear();

          Keyboard.dismiss();

          await updateTypingState(
            false
          );

          await loadConversations();
        } finally {
          setSending(
            false
          );
        }
      };

    const startRecording =
      async () => {
        if (
          isRecording
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
              "Ses kaydı için mikrofon izni gerekli."
            );
            return;
          }

          await Audio.setAudioModeAsync(
            {
              allowsRecordingIOS:
                true,
              playsInSilentModeIOS:
                true,
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

          setIsRecording(
            true
          );

          if (
            conversationId
          ) {
            await supabase.rpc(
              "set_dm_typing",
              {
                p_conversation_id:
                  conversationId,
                p_is_typing:
                  false,
                p_is_recording:
                  true,
              }
            );
          }
        } catch {
          setIsRecording(
            false
          );
        }
      };

    const stopRecording =
      async (
        send = true
      ) => {
        const recording =
          recordingRef.current;

        if (
          !recording
        ) {
          return;
        }

        try {
          await recording.stopAndUnloadAsync();

          const uri =
            recording.getURI();

          recordingRef.current =
            null;

          setIsRecording(
            false
          );

          if (
            conversationId
          ) {
            await supabase.rpc(
              "set_dm_typing",
              {
                p_conversation_id:
                  conversationId,
                p_is_typing:
                  false,
                p_is_recording:
                  false,
              }
            );
          }

          if (
            !send ||
            !uri ||
            !conversationId
          ) {
            return;
          }

          setSending(
            true
          );

          const status =
            await recording.getStatusAsync();

          const duration =
            "durationMillis" in
            status
              ? status.durationMillis ||
                0
              : 0;

          const mediaUrl =
            await uploadToSupabase(
              uri,
              "audio/m4a",
              "audio"
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
                  duration,
                p_reply_to_message_id:
                  replyTo?.id ||
                  null,
                p_metadata:
                  {
                    waveform:
                      [],
                  },
              }
            );

          if (
            error
          ) {
            Alert.alert(
              "Ses kaydı",
              error.message
            );
            return;
          }

          if (
            data
          ) {
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

          setReplyTo(
            null
          );
        } catch (
          error
        ) {
          Alert.alert(
            "Ses kaydı",
            "Ses kaydı gönderilemedi."
          );
        } finally {
          setSending(
            false
          );
        }
      };

    const openInAppGallery =
      async () => {
        setMediaLoading(
          true
        );

        try {
          const permission =
            await MediaLibrary.requestPermissionsAsync();

          if (
            permission.status !==
            "granted"
          ) {
            Alert.alert(
              "Galeri",
              "Fotoğraf ve videolara erişim izni gerekli."
            );
            return;
          }

          const result =
            await MediaLibrary.getAssetsAsync(
              {
                mediaType: [
                  MediaLibrary.MediaType.photo,
                  MediaLibrary.MediaType.video,
                ],
                first: 120,
                sortBy:
                  MediaLibrary.SortBy.creationTime,
              }
            );

          setMediaAssets(
            result.assets
          );

          setShowMediaPicker(
            true
          );
        } finally {
          setMediaLoading(
            false
          );
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

        setSending(
          true
        );

        try {
          const assetInfo =
            await MediaLibrary.getAssetInfoAsync(
              asset
            );

          const uri =
            assetInfo.localUri ||
            asset.uri;

          const isVideo =
            asset.mediaType ===
            MediaLibrary.MediaType.video;

          const mediaUrl =
            await uploadToSupabase(
              uri,
              isVideo
                ? "video/mp4"
                : "image/jpeg",
              isVideo
                ? "video"
                : "image"
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
                  mediaUrl,
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
                p_metadata:
                  {
                    width:
                      asset.width,
                    height:
                      asset.height,
                  },
              }
            );

          if (
            error
          ) {
            Alert.alert(
              "Medya",
              error.message
            );
            return;
          }

          if (
            data
          ) {
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

          setReplyTo(
            null
          );

          setShowMediaPicker(
            false
          );
        } catch {
          Alert.alert(
            "Medya",
            "Medya gönderilemedi."
          );
        } finally {
          setSending(
            false
          );
        }
      };

    const setReaction =
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

    const deleteMessage =
      async (
        message: Message,
        scope:
          | "me"
          | "everyone"
      ) => {
        const {
          error,
        } =
          await supabase.rpc(
            "delete_direct_message",
            {
              p_message_id:
                message.id,
              p_scope:
                scope,
            }
          );

        if (error) {
          Alert.alert(
            "Mesaj",
            error.message
          );
          return;
        }

        if (
          scope ===
          "everyone"
        ) {
          setMessages(
            previous =>
              previous.map(
                item =>
                  item.id ===
                  message.id
                    ? {
                        ...item,
                        deleted_at:
                          new Date().toISOString(),
                        body:
                          "Bu mesaj silindi",
                        message_type:
                          "text",
                        media_url:
                          null,
                      }
                    : item
              )
          );
        } else {
          setMessages(
            previous =>
              previous.filter(
                item =>
                  item.id !==
                  message.id
              )
          );
        }
      };

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

    const onDoubleTap =
      (
        message: Message
      ) => {
        void Haptics.impactAsync(
          Haptics.ImpactFeedbackStyle.Light
        );

        void setReaction(
          message
        );
      };

    const beginReply =
      (
        message: Message
      ) => {
        setReplyTo(
          message
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

    const beginEdit =
      (
        message: Message
      ) => {
        if (
          message.sender_id !==
          userId
        ) {
          Alert.alert(
            "Mesaj",
            "Sadece kendi mesajlarını düzenleyebilirsin."
          );
          return;
        }

        setEditingMessage(
          message
        );

        setText(
          message.body
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

    const renderReplyPreview =
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
              styles.replyPreview
            }
          >
            <View
              style={
                styles.replyAccent
              }
            />

            <View
              style={
                styles.replyPreviewTextWrap
              }
            >
              <Text
                style={
                  styles.replyPreviewTitle
                }
                numberOfLines={1}
              >
                {message
                  .replyMessage
                  .sender_id ===
                userId
                  ? "Siz"
                  : otherUser
                      ?.username ||
                    "Kullanıcı"}
              </Text>

              <Text
                style={
                  styles.replyPreviewText
                }
                numberOfLines={1}
              >
                {message
                  .replyMessage
                  .message_type ===
                "image"
                  ? "📷 Fotoğraf"
                  : message
                      .replyMessage
                      .message_type ===
                    "video"
                  ? "🎥 Video"
                  : message
                      .replyMessage
                      .message_type ===
                    "audio"
                  ? "🎤 Ses kaydı"
                  : message
                      .replyMessage
                      .body}
              </Text>
            </View>
          </View>
        );
      };

    const renderMedia =
      (
        message: Message
      ) => {
        if (
          message.message_type ===
            "image" &&
          message.media_url
        ) {
          return (
            <Pressable
              onPress={() =>
                setPreviewMedia(
                  {
                    uri:
                      message.media_url!,
                    type:
                      "image",
                  }
                )
              }
            >
              <Image
                source={{
                  uri:
                    message.media_url,
                }}
                style={
                  styles.mediaImage
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
                setPreviewMedia(
                  {
                    uri:
                      message.media_url!,
                    type:
                      "video",
                  }
                )
              }
            >
              <View
                style={
                  styles.videoCard
                }
              >
                <Video
                  source={{
                    uri:
                      message.media_url,
                  }}
                  style={
                    styles.videoThumb
                  }
                  resizeMode={
                    ResizeMode.COVER
                  }
                  shouldPlay={false}
                  isMuted
                />

                <View
                  style={
                    styles.videoOverlay
                  }
                >
                  <View
                    style={
                      styles.videoPlay
                    }
                  >
                    <Text
                      style={
                        styles.videoPlayText
                      }
                    >
                      ▶
                    </Text>
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
              mine={
                message.sender_id ===
                userId
              }
            />
          );
        }

        return null;
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
          <SwipeableMessage
            message={
              item
            }
            threshold={
              replySwipeThreshold
            }
            onReply={() =>
              beginReply(item)
            }
          >
            <Pressable
              onLongPress={() =>
                handleLongPress(
                  item
                )
              }
              onPressOut={() => {}}
              onPress={() =>
                onDoubleTap(
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
                    deleted &&
                      styles.deletedBubble,
                  ]}
                >
                  {renderReplyPreview(
                    item
                  )}

                  {deleted ? (
                    <Text
                      style={[
                        styles.deletedText,
                        mine &&
                          styles.deletedTextMine,
                      ]}
                    >
                      Bu mesaj silindi
                    </Text>
                  ) : (
                    <>
                      {renderMedia(
                        item
                      )}

                      {item.message_type !==
                        "image" &&
                        item.message_type !==
                          "video" &&
                        item.message_type !==
                          "audio" && (
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
                            {item.edited_at
                              ? "  (düzenlendi)"
                              : ""}
                          </Text>
                        )}
                    </>
                  )}

                  {item.reaction && (
                    <View
                      style={
                        styles.reactionBadge
                      }
                    >
                      <Text
                        style={
                          styles.reactionText
                        }
                      >
                        {
                          item.reaction
                        }
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.metaRow
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
                    <Text
                      style={[
                        styles.readState,
                        item.read_at &&
                          styles.readStateSeen,
                      ]}
                    >
                      {item.read_at
                        ? "Görüldü"
                        : item.seen_at
                        ? "Okundu"
                        : "Gönderildi"}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          </SwipeableMessage>
        );
      };

    const closeChat =
      useCallback(
        async () => {
          if (
            conversationId
          ) {
            await supabase.rpc(
              "mark_conversation_read",
              {
                p_conversation_id:
                  conversationId,
              }
            );
          }

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

          setReplyTo(
            null
          );

          setEditingMessage(
            null
          );

          setText(
            ""
          );

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

    const openMediaFromPicker =
      async () => {
        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                [
                  "images",
                  "videos",
                ],
              allowsMultipleSelection:
                false,
              quality: 0.9,
            } as any
          );

        if (
          result.canceled
        ) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset) {
          return;
        }

        const mediaType =
          asset.type ===
          "video"
            ? "video"
            : "image";

        setSending(
          true
        );

        try {
          const mediaUrl =
            await uploadToSupabase(
              asset.uri,
              asset.mimeType ||
                (mediaType ===
                "video"
                  ? "video/mp4"
                  : "image/jpeg"),
              mediaType
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
                  mediaType,
                p_media_url:
                  mediaUrl,
                p_thumbnail_url:
                  null,
                p_duration_ms:
                  asset.duration
                    ? Math.round(
                        asset.duration
                      )
                    : null,
                p_reply_to_message_id:
                  replyTo?.id ||
                  null,
                p_metadata:
                  {
                    width:
                      asset.width,
                    height:
                      asset.height,
                  },
              }
            );

          if (
            error
          ) {
            Alert.alert(
              "Medya",
              error.message
            );
            return;
          }

          if (
            data
          ) {
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

          setReplyTo(
            null
          );
        } finally {
          setSending(
            false
          );
        }
      };

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

          {!conversationId && (
            <BottomNav />
          )}
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
                      router.push(
                        {
                          pathname:
                            "/profile",
                          params:
                            {
                              userId:
                                otherUserId,
                            },
                        }
                      );
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
                      hp(4.8)
                    }
                    rounded={
                      hp(2.4)
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

                    {otherUserTyping ||
                    isRecording ? (
                      <Text
                        style={
                          styles.typingText
                        }
                      >
                        {isRecording
                          ? "Ses kaydediyor..."
                          : "Yazıyor..."}
                      </Text>
                    ) : otherUser
                        ?.show_online_status !==
                      false ? (
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
                    ) : null}
                  </View>
                </Pressable>
              </View>

              {replyTo && (
                <View
                  style={
                    styles.replyComposer
                  }
                >
                  <View
                    style={
                      styles.replyComposerAccent
                    }
                  />

                  <View
                    style={
                      styles.replyComposerContent
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
                        styles.replyComposerText
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {replyTo
                        .message_type ===
                      "image"
                        ? "📷 Fotoğraf"
                        : replyTo
                            .message_type ===
                          "video"
                        ? "🎥 Video"
                        : replyTo
                            .message_type ===
                          "audio"
                        ? "🎤 Ses kaydı"
                        : replyTo.body}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setReplyTo(
                        null
                      )
                    }
                    style={
                      styles.replyClose
                    }
                  >
                    <Text
                      style={
                        styles.replyCloseText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              )}

              <FlatList
                data={[
                  ...messages,
                ].reverse()}
                inverted
                style={
                  styles.messageList
                }
                contentContainerStyle={
                  styles.messages
                }
                keyExtractor={
                  item =>
                    item.id
                }
                renderItem={
                  renderMessage
                }
                keyboardShouldPersistTaps="handled"
              />

              <View
                style={
                  styles.composer
                }
              >
                <Pressable
                  style={
                    styles.composerIcon
                  }
                  onPress={
                    openInAppGallery
                  }
                  disabled={
                    mediaLoading ||
                    sending
                  }
                >
                  <Icon
                    name="plus"
                    size={21}
                    color={
                      theme.colors
                        .primary
                    }
                  />
                </Pressable>

                <Pressable
                  style={
                    styles.composerIcon
                  }
                  onPress={
                    openMediaFromPicker
                  }
                  disabled={
                    sending
                  }
                >
                  <Text
                    style={
                      styles.galleryIcon
                    }
                  >
                    ▧
                  </Text>
                </Pressable>

                <TextInput
                  ref={
                    inputRef
                  }
                  value={
                    text
                  }
                  onChangeText={
                    onTextChange
                  }
                  placeholder={
                    editingMessage
                      ? "Mesajı düzenle..."
                      : "Mesaj..."
                  }
                  placeholderTextColor="#94A3B8"
                  style={
                    styles.composerInput
                  }
                  multiline
                  maxLength={
                    2000
                  }
                />

                {!text.trim() &&
                !editingMessage ? (
                  <Pressable
                    onPress={
                      isRecording
                        ? () =>
                            stopRecording(
                              true
                            )
                        : startRecording
                    }
                    onLongPress={
                      startRecording
                    }
                    style={[
                      styles.sendCircle,
                      isRecording &&
                        styles.recordingCircle,
                    ]}
                  >
                    <Text
                      style={
                        styles.micText
                      }
                    >
                      {isRecording
                        ? "■"
                        : "●"}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={
                      sendMessage
                    }
                    style={
                      styles.sendCircle
                    }
                    disabled={
                      sending
                    }
                  >
                    {sending ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          theme.colors
                            .text
                        }
                      />
                    ) : (
                      <Svg
                        width={22}
                        height={22}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M21.7 2.3 2.8 9.2c-.9.3-.9 1.5 0 1.8l7.3 2.7 2.7 7.3c.3.9 1.5.9 1.8 0L21.5 4c.3-.9.9-1.2.2-1.7Z"
                          fill="#F8FAFC"
                        />
                        <Path
                          d="m10.2 13.8 10.8-10.8"
                          stroke="#818CF8"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                        />
                      </Svg>
                    )}
                  </Pressable>
                )}
              </View>

              {isTyping && (
                <Text
                  style={
                    styles.localTypingHint
                  }
                >
                  Yazıyor...
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>

          <Modal
            visible={
              isActionMenuVisible
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
                styles.menuBackdrop
              }
              onPress={() =>
                setActionMenuVisible(
                  false
                )
              }
            >
              <View
                style={
                  styles.actionMenu
                }
              >
                {selectedMessage && (
                  <>
                    <Text
                      style={
                        styles.menuTitle
                      }
                    >
                      Mesaj işlemleri
                    </Text>

                    <Pressable
                      style={
                        styles.menuItem
                      }
                      onPress={() =>
                        beginReply(
                          selectedMessage
                        )
                      }
                    >
                      <Text
                        style={
                          styles.menuItemText
                        }
                      >
                        ↩ Yanıtla
                      </Text>
                    </Pressable>

                    {selectedMessage.sender_id ===
                      userId && (
                      <Pressable
                        style={
                          styles.menuItem
                        }
                        onPress={() =>
                          beginEdit(
                            selectedMessage
                          )
                        }
                      >
                        <Text
                          style={
                            styles.menuItemText
                          }
                        >
                          ✎ Düzenle
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={
                        styles.menuItem
                      }
                      onPress={() =>
                        void setReaction(
                          selectedMessage
                        ).then(() =>
                          setActionMenuVisible(
                            false
                          )
                        )
                      }
                    >
                      <Text
                        style={
                          styles.menuItemText
                        }
                      >
                        ❤️ Beğen
                      </Text>
                    </Pressable>

                    <Pressable
                      style={
                        styles.menuItem
                      }
                      onPress={() => {
                        setActionMenuVisible(
                          false
                        );

                        Alert.alert(
                          "Mesajı sil",
                          "Bu mesajı kimlerden silmek istiyorsun?",
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
                                  deleteMessage(
                                    selectedMessage,
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
                                        deleteMessage(
                                          selectedMessage,
                                          "everyone"
                                        ),
                                  },
                                ]
                              : []),
                          ]
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          styles.deleteText,
                        ]}
                      >
                        🗑 Sil
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </Pressable>
          </Modal>

          <Modal
            visible={
              showMediaPicker
            }
            animationType="slide"
            transparent
            onRequestClose={() =>
              setShowMediaPicker(
                false
              )
            }
          >
            <View
              style={
                styles.mediaModal
              }
            >
              <View
                style={
                  styles.mediaHeader
                }
              >
                <Text
                  style={
                    styles.mediaTitle
                  }
                >
                  Nysapp Galerisi
                </Text>

                <Pressable
                  onPress={() =>
                    setShowMediaPicker(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.mediaClose
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={
                  styles.mediaGrid
                }
              >
                {mediaAssets.map(
                  asset => (
                    <Pressable
                      key={
                        asset.id
                      }
                      style={
                        styles.mediaItem
                      }
                      onPress={() =>
                        void sendGalleryAsset(
                          asset
                        )
                      }
                    >
                      <Image
                        source={{
                          uri:
                            asset.uri,
                        }}
                        style={
                          styles.mediaGridImage
                        }
                      />

                      {asset.mediaType ===
                        MediaLibrary.MediaType.video && (
                        <View
                          style={
                            styles.videoBadge
                          }
                        >
                          <Text
                            style={
                              styles.videoBadgeText
                            }
                          >
                            ▶
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )
                )}
              </ScrollView>
            </View>
          </Modal>

          <Modal
            visible={
              !!previewMedia
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setPreviewMedia(
                null
              )
            }
          >
            <View
              style={
                styles.previewBackdrop
              }
            >
              <Pressable
                style={
                  styles.previewClose
                }
                onPress={() =>
                  setPreviewMedia(
                    null
                  )
                }
              >
                <Text
                  style={
                    styles.previewCloseText
                  }
                >
                  ×
                </Text>
              </Pressable>

              {previewMedia?.type ===
              "image" ? (
                <Image
                  source={{
                    uri:
                      previewMedia.uri,
                  }}
                  style={
                    styles.fullPreviewImage
                  }
                  resizeMode="contain"
                />
              ) : previewMedia ? (
                <Video
                  source={{
                    uri:
                      previewMedia.uri,
                  }}
                  style={
                    styles.fullPreviewVideo
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
                  theme.colors
                    .primary
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
                color="#94A3B8"
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
                  setSearchText(
                    ""
                  )
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
              contentContainerStyle={
                styles.searchResults
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={
                    styles.userRow
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
                      {
                        item.username ||
                        item.name
                      }
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

                  <Text
                    style={
                      styles.userArrowText
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
                conversations
              }
              keyExtractor={
                item =>
                  item.id
              }
              showsVerticalScrollIndicator={
                false
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
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.conversationRow,
                    item.unread &&
                      styles.conversationRowUnread,
                  ]}
                  onPress={async () => {
                    if (
                      !item
                        .otherUser
                        ?.id
                    ) {
                      return;
                    }

                    await openConversation(
                      item
                        .otherUser
                        .id,
                      item.otherUser
                    );
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

const AudioMessage =
  ({
    uri,
    duration,
    mine,
  }: {
    uri: string;
    duration:
      | number
      | null
      | undefined;
    mine: boolean;
  }) => {
    const [
      playing,
      setPlaying,
    ] = useState(false);

    const soundRef =
      useRef<Audio.Sound | null>(
        null
      );

    useEffect(() => {
      return () => {
        if (
          soundRef.current
        ) {
          void soundRef.current.unloadAsync();
        }
      };
    }, []);

    const toggle =
      async () => {
        if (
          !soundRef.current
        ) {
          const {
            sound,
          } =
            await Audio.Sound.createAsync(
              {
                uri,
              },
              {
                shouldPlay:
                  true,
              }
            );

          soundRef.current =
            sound;

          setPlaying(
            true
          );

          sound.setOnPlaybackStatusUpdate(
            status => {
              if (
                status.isLoaded &&
                status.didJustFinish
              ) {
                setPlaying(
                  false
                );
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

          setPlaying(
            false
          );
        } else {
          await soundRef.current.playAsync();

          setPlaying(
            true
          );
        }
      };

    return (
      <Pressable
        onPress={
          toggle
        }
        style={[
          styles.audioMessage,
          mine &&
            styles.audioMessageMine,
        ]}
      >
        <View
          style={
            styles.audioPlay
          }
        >
          <Text
            style={
              styles.audioPlayText
            }
          >
            {playing
              ? "❚❚"
              : "▶"}
          </Text>
        </View>

        <View
          style={
            styles.audioWave
          }
        >
          {Array.from(
            {
              length: 18,
            }
          ).map(
            (
              _,
              index
            ) => (
              <View
                key={
                  index
                }
                style={[
                  styles.waveBar,
                  {
                    height:
                      7 +
                      ((index *
                        11) %
                        18),
                  },
                ]}
              />
            )
          )}
        </View>

        <Text
          style={[
            styles.audioDuration,
            mine &&
              styles.audioDurationMine,
          ]}
        >
          {formatDuration(
            duration
          )}
        </Text>
      </Pressable>
    );
  };

const SwipeableMessage =
  ({
    children,
    message,
    threshold,
    onReply,
  }: {
    children:
      | React.ReactNode;
    message: Message;
    threshold: number;
    onReply: () => void;
  }) => {
    const translateX =
      useRef(0);

    const [
      offsetX,
      setOffsetX,
    ] = useState(0);

    const panResponder =
      useRef(
        PanResponder.create({
          onMoveShouldSetPanResponder:
            (
              _,
              gesture
            ) =>
              Math.abs(
                gesture.dx
              ) >
                8 &&
              Math.abs(
                gesture.dy
              ) <
                12,

          onPanResponderMove:
            (
              _,
              gesture
            ) => {
              const next =
                Math.min(
                  threshold + 18,
                  Math.max(
                    0,
                    gesture.dx
                  )
                );

              translateX.current =
                next;

              setOffsetX(
                next
              );
            },

          onPanResponderRelease:
            () => {
              if (
                translateX.current >=
                threshold
              ) {
                onReply();
              }

              translateX.current =
                0;

              setOffsetX(
                0
              );
            },

          onPanResponderTerminate:
            () => {
              translateX.current =
                0;

              setOffsetX(
                0
              );
            },
        })
      ).current;

    return (
      <View
        style={
          styles.swipeWrap
        }
        {...panResponder.panHandlers}
      >
        {offsetX >
          4 && (
          <View
            style={
              styles.replySwipeIcon
            }
          >
            <Text
              style={
                styles.replySwipeText
              }
            >
              ↩
            </Text>
          </View>
        )}

        <View
          style={{
            transform: [
              {
                translateX:
                  offsetX,
              },
            ],
          }}
        >
          {children}
        </View>
      </View>
    );
  };

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
      letterSpacing: 1.5,
    },

    title: {
      marginTop: 2,
      fontSize:
        hp(2.8),
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

    searchResults: {
      paddingBottom:
        hp(10),
      gap:
        hp(0.8),
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

    clearSearchText: {
      fontSize:
        hp(2.3),
      color:
        "#94A3B8",
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

    userArrowText: {
      color:
        "#94A3B8",
      fontSize: 25,
    },

    conversationList: {
      paddingBottom:
        hp(10),
      gap: hp(0.6),
    },

    conversationRow: {
      minHeight:
        hp(8.5),
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

    conversationRowUnread: {
      borderColor:
        theme.colors.primary,
    },

    conversationInfo: {
      flex: 1,
      marginLeft:
        wp(3),
    },

    conversationName: {
      fontSize:
        hp(1.65),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    conversationPreview: {
      marginTop: 4,
      fontSize:
        hp(1.3),
      color:
        "#94A3B8",
    },

    conversationPreviewUnread: {
      color:
        theme.colors.text,
      fontWeight:
        theme.fonts.semibold,
    },

    conversationTime: {
      fontSize:
        hp(1.05),
      color:
        "#64748B",
    },

    emptyList: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingTop:
        hp(18),
    },

    emptyChatTitle: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    emptyChatText: {
      marginTop: 6,
      fontSize:
        hp(1.3),
      color:
        "#94A3B8",
      textAlign:
        "center",
    },

    chatHeader: {
      minHeight:
        hp(8),
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(2),
      borderBottomWidth:
        1,
      borderBottomColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors.card,
    },

    backButton: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chatUser: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap:
        wp(2.5),
    },

    chatUserText: {
      flex: 1,
    },

    chatName: {
      fontSize:
        hp(1.65),
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
      marginTop: 2,
      gap: 5,
    },

    chatStatus: {
      fontSize:
        hp(1.1),
      color:
        "#94A3B8",
    },

    typingText: {
      marginTop: 2,
      fontSize:
        hp(1.15),
      color:
        theme.colors.primary,
      fontWeight:
        theme.fonts.semibold,
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    statusDotOnline: {
      backgroundColor:
        "#22C55E",
    },

    statusDotOffline: {
      backgroundColor:
        "#64748B",
    },

    messageList: {
      flex: 1,
    },

    messages: {
      paddingHorizontal:
        wp(3),
      paddingTop:
        hp(1.5),
      paddingBottom:
        hp(1),
    },

    swipeWrap: {
      position:
        "relative",
    },

    replySwipeIcon: {
      position:
        "absolute",
      left: 8,
      top: 0,
      bottom: 0,
      width: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    replySwipeText: {
      fontSize: 22,
      color:
        theme.colors.primary,
    },

    messageRow: {
      marginVertical: 4,
      maxWidth:
        "88%",
    },

    messageRowMine: {
      alignSelf:
        "flex-end",
    },

    messageRowOther: {
      alignSelf:
        "flex-start",
    },

    messageContent: {
      alignItems:
        "flex-end",
    },

    bubble: {
      minWidth: 45,
      paddingHorizontal:
        12,
      paddingVertical:
        9,
      borderRadius:
        18,
      overflow:
        "hidden",
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
      borderBottomLeftRadius:
        5,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    deletedBubble: {
      opacity: 0.7,
    },

    deletedText: {
      fontStyle:
        "italic",
      color:
        "#94A3B8",
    },

    deletedTextMine: {
      color:
        "#E2E8F0",
    },

    messageText: {
      fontSize:
        hp(1.5),
      lineHeight:
        hp(2.1),
      color:
        theme.colors.text,
    },

    messageTextMine: {
      color:
        "#FFFFFF",
    },

    metaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
      marginTop: 3,
    },

    messageTime: {
      fontSize:
        hp(0.95),
      color:
        "#64748B",
    },

    readState: {
      fontSize:
        hp(0.9),
      color:
        "#64748B",
    },

    readStateSeen: {
      color:
        theme.colors.primary,
    },

    reactionBadge: {
      position:
        "absolute",
      right: -2,
      bottom: -10,
      minWidth: 24,
      height: 24,
      borderRadius: 12,
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

    reactionText: {
      fontSize: 13,
    },

    replyPreview: {
      flexDirection:
        "row",
      backgroundColor:
        "rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: 7,
      marginBottom: 7,
    },

    replyAccent: {
      width: 3,
      borderRadius: 2,
      backgroundColor:
        theme.colors.primary,
      marginRight: 7,
    },

    replyPreviewTextWrap: {
      flex: 1,
    },

    replyPreviewTitle: {
      fontSize:
        hp(1.05),
      color:
        "#A5B4FC",
      fontWeight:
        theme.fonts.bold,
    },

    replyPreviewText: {
      marginTop: 2,
      fontSize:
        hp(1.05),
      color:
        "#CBD5E1",
    },

    replyComposer: {
      minHeight: 58,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        wp(3),
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors.card,
    },

    replyComposerAccent: {
      width: 4,
      alignSelf:
        "stretch",
      borderRadius: 2,
      backgroundColor:
        theme.colors.primary,
      marginRight: 9,
    },

    replyComposerContent: {
      flex: 1,
    },

    replyComposerTitle: {
      color:
        theme.colors.primary,
      fontSize:
        hp(1.1),
      fontWeight:
        theme.fonts.bold,
    },

    replyComposerText: {
      marginTop: 2,
      color:
        "#CBD5E1",
      fontSize:
        hp(1.2),
    },

    replyClose: {
      width: 34,
      height: 34,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    replyCloseText: {
      fontSize: 24,
      color:
        "#94A3B8",
    },

    composer: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      gap: 7,
      paddingHorizontal:
        wp(2.5),
      paddingTop: 8,
      paddingBottom:
        hp(1),
      backgroundColor:
        theme.colors.card,
      borderTopWidth: 1,
      borderTopColor:
        theme.colors.gray,
    },

    composerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
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

    galleryIcon: {
      color:
        theme.colors.primary,
      fontSize: 22,
      fontWeight:
        theme.fonts.bold,
    },

    composerInput: {
      flex: 1,
      maxHeight: hp(15),
      minHeight: 42,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 21,
      backgroundColor:
        theme.colors
          .background,
      color:
        theme.colors.text,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      fontSize:
        hp(1.45),
    },

    sendCircle: {
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

    recordingCircle: {
      backgroundColor:
        theme.colors.rose,
    },

    micText: {
      color:
        "#FFFFFF",
      fontSize: 18,
      fontWeight:
        theme.fonts.bold,
    },

    localTypingHint: {
      paddingHorizontal:
        wp(4),
      paddingBottom: 4,
      color:
        "#64748B",
      fontSize:
        hp(0.95),
    },

    audioMessage: {
      width: wp(60),
      minHeight: 52,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        8,
      gap: 8,
      borderRadius: 15,
      backgroundColor:
        "#EEF2FF",
    },

    audioMessageMine: {
      backgroundColor:
        "rgba(255,255,255,0.16)",
    },

    audioPlay: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.primary,
    },

    audioPlayText: {
      color:
        "#FFFFFF",
      fontSize: 12,
    },

    audioWave: {
      flex: 1,
      height: 24,
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
        theme.colors.primary,
    },

    audioDuration: {
      fontSize:
        hp(1.05),
      color:
        "#475569",
    },

    audioDurationMine: {
      color:
        "#FFFFFF",
    },

    mediaImage: {
      width:
        wp(62),
      height:
        hp(24),
      borderRadius: 14,
    },

    videoCard: {
      width:
        wp(62),
      height:
        hp(24),
      borderRadius: 14,
      overflow:
        "hidden",
    },

    videoThumb: {
      width: "100%",
      height: "100%",
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
        "rgba(0,0,0,0.2)",
    },

    videoPlay: {
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

    videoPlayText: {
      color:
        "#FFFFFF",
      fontSize: 20,
      marginLeft: 2,
    },

    actionMenu: {
      position:
        "absolute",
      left: wp(8),
      right: wp(8),
      bottom: hp(10),
      padding: 10,
      borderRadius: 22,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    menuBackdrop: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.45)",
    },

    menuTitle: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      color:
        "#94A3B8",
      fontSize:
        hp(1.1),
      fontWeight:
        theme.fonts.bold,
    },

    menuItem: {
      minHeight: 50,
      justifyContent:
        "center",
      paddingHorizontal: 12,
      borderRadius: 13,
    },

    menuItemText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts.semibold,
    },

    deleteText: {
      color:
        "#FB7185",
    },

    mediaModal: {
      flex: 1,
      marginTop:
        hp(8),
      backgroundColor:
        theme.colors
          .background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow:
        "hidden",
    },

    mediaHeader: {
      minHeight:
        hp(7),
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        wp(4),
      borderBottomWidth: 1,
      borderBottomColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors.card,
    },

    mediaTitle: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
    },

    mediaClose: {
      color:
        "#94A3B8",
      fontSize: 30,
    },

    mediaGrid: {
      padding: 4,
      flexDirection:
        "row",
      flexWrap:
        "wrap",
    },

    mediaItem: {
      width:
        "33.3333%",
      aspectRatio: 1,
      padding: 2,
    },

    mediaGridImage: {
      flex: 1,
      borderRadius: 6,
      backgroundColor:
        theme.colors.card,
    },

    videoBadge: {
      position:
        "absolute",
      right: 6,
      bottom: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.65)",
    },

    videoBadgeText: {
      color:
        "#FFFFFF",
      fontSize: 10,
    },

    previewBackdrop: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.95)",
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
      backgroundColor:
        "rgba(255,255,255,0.12)",
      zIndex: 2,
    },

    previewCloseText: {
      color:
        "#FFFFFF",
      fontSize: 28,
    },

    fullPreviewImage: {
      width: "100%",
      height: "80%",
    },

    fullPreviewVideo: {
      width: "100%",
      height: "70%",
    },
  });
