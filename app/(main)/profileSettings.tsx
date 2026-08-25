import Icon from "@/assets/icons";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import { hp, wp } from "@/helpers/common";
import { useAuth } from "@/contexts/AuthContext";
import {
  changeCurrentPassword,
  deleteProfileLink,
  getProfileLinks,
  getShowOnlineStatus,
  ProfileLink,
  ProfileLinkKind,
  SOCIAL_OPTIONS,
  setShowOnlineStatus,
  upsertProfileLink,
} from "@/services/profileSettingsService";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const ProfileSettings =
  () => {
    const router =
      useRouter();

    const authContext =
      useAuth();

    const userId =
      authContext?.user
        ?.authInfo?.id ||
      authContext?.user
        ?.userData?.id ||
      "";

    const email =
      authContext?.user
        ?.authInfo?.email ||
      authContext?.user
        ?.userData?.email ||
      "";

    const [
      links,
      setLinks,
    ] = useState<
      ProfileLink[]
    >([]);

    const [
      selectedKind,
      setSelectedKind,
    ] =
      useState<ProfileLinkKind>(
        "instagram"
      );

    const [
      socialUsername,
      setSocialUsername,
    ] = useState("");

    const [
      externalTitle,
      setExternalTitle,
    ] = useState("");

    const [
      externalUrl,
      setExternalUrl,
    ] = useState("");

    const [
      editingLinkId,
      setEditingLinkId,
    ] = useState<
      string | null
    >(null);

    const [
      onlineVisible,
      setOnlineVisible,
    ] = useState(true);

    const [
      savingLink,
      setSavingLink,
    ] = useState(false);

    const [
      changingPassword,
      setChangingPassword,
    ] = useState(false);

    const [
      currentPassword,
      setCurrentPassword,
    ] = useState("");

    const [
      newPassword,
      setNewPassword,
    ] = useState("");

    const [
      newPasswordAgain,
      setNewPasswordAgain,
    ] = useState("");

    const loadData =
      useCallback(
        async () => {
          if (!userId) {
            return;
          }

          const [
            profileLinks,
            showOnline,
          ] =
            await Promise.all(
              [
                getProfileLinks(
                  userId
                ),
                getShowOnlineStatus(
                  userId
                ),
              ]
            );

          setLinks(
            profileLinks
          );

          setOnlineVisible(
            showOnline
          );
        },
        [userId]
      );

    useEffect(() => {
      void loadData();
    }, [loadData]);

    const resetForm =
      () => {
        setSelectedKind(
          "instagram"
        );

        setSocialUsername(
          ""
        );

        setExternalTitle(
          ""
        );

        setExternalUrl(
          ""
        );

        setEditingLinkId(
          null
        );
      };

    const saveLink =
      async () => {
        if (!userId) {
          return;
        }

        setSavingLink(
          true
        );

        try {
          const result =
            await upsertProfileLink(
              {
                userId,
                kind:
                  selectedKind,
                username:
                  selectedKind ===
                  "external"
                    ? undefined
                    : socialUsername,
                title:
                  selectedKind ===
                  "external"
                    ? externalTitle
                    : undefined,
                url:
                  selectedKind ===
                  "external"
                    ? externalUrl
                    : undefined,
                linkId:
                  editingLinkId ||
                  undefined,
                position:
                  editingLinkId
                    ? (
                        links.find(
                          item =>
                            item.id ===
                            editingLinkId
                        )
                      )
                        ?.position ||
                      0
                    : links.length,
              }
            );

          if (
            !result.success
          ) {
            Alert.alert(
              "Bağlantı",
              result.message
            );
            return;
          }

          resetForm();

          await loadData();
        } finally {
          setSavingLink(
            false
          );
        }
      };

    const editLink =
      (
        link: ProfileLink
      ) => {
        setEditingLinkId(
          link.id
        );

        setSelectedKind(
          link.kind
        );

        if (
          link.kind ===
          "external"
        ) {
          setExternalTitle(
            link.title
          );

          setExternalUrl(
            link.url
          );

          setSocialUsername(
            ""
          );
        } else {
          setSocialUsername(
            link.username ||
              ""
          );

          setExternalTitle(
            ""
          );

          setExternalUrl(
            ""
          );
        }
      };

    const removeLink =
      (
        link: ProfileLink
      ) => {
        Alert.alert(
          "Bağlantıyı sil",
          `${link.title} bağlantısı silinsin mi?`,
          [
            {
              text: "Vazgeç",
              style:
                "cancel",
            },
            {
              text: "Sil",
              style:
                "destructive",
              onPress:
                async () => {
                  const result =
                    await deleteProfileLink(
                      userId,
                      link.id
                    );

                  if (
                    !result.success
                  ) {
                    Alert.alert(
                      "Bağlantı",
                      result.message
                    );

                    return;
                  }

                  resetForm();

                  await loadData();
                },
            },
          ]
        );
      };

    const toggleOnlineStatus =
      async (
        value: boolean
      ) => {
        setOnlineVisible(
          value
        );

        const result =
          await setShowOnlineStatus(
            userId,
            value
          );

        if (
          !result.success
        ) {
          setOnlineVisible(
            !value
          );

          Alert.alert(
            "Ayar",
            result.message
          );
        }
      };

    const handlePasswordChange =
      async () => {
        if (
          !currentPassword ||
          !newPassword ||
          !newPasswordAgain
        ) {
          Alert.alert(
            "Şifre",
            "Tüm şifre alanlarını doldurun."
          );

          return;
        }

        if (
          newPassword !==
          newPasswordAgain
        ) {
          Alert.alert(
            "Şifre",
            "Yeni şifreler aynı değil."
          );

          return;
        }

        setChangingPassword(
          true
        );

        try {
          const result =
            await changeCurrentPassword(
              {
                email,
                currentPassword,
                newPassword,
              }
            );

          if (
            !result.success
          ) {
            Alert.alert(
              "Şifre",
              result.message
            );

            return;
          }

          setCurrentPassword(
            ""
          );

          setNewPassword(
            ""
          );

          setNewPasswordAgain(
            ""
          );

          Alert.alert(
            "Şifre",
            result.message
          );
        } finally {
          setChangingPassword(
            false
          );
        }
      };

    const selectedOption =
      SOCIAL_OPTIONS.find(
        item =>
          item.kind ===
          selectedKind
      );

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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.content
            }
          >
            <Header
              title="Profil ayarları"
              marginBottom={
                18
              }
            />

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Profil bağlantıları
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Sosyal hesabını veya harici
                bir bağlantıyı profiline ekle.
                Birden fazla bağlantı ekleyebilirsin.
              </Text>

              {links.map(
                link => (
                  <View
                    key={
                      link.id
                    }
                    style={
                      styles.savedLink
                    }
                  >
                    <View
                      style={
                        styles.savedLinkIcon
                      }
                    >
                      <Icon
                        name={
                          link.kind === "instagram"
                            ? "instagram"
                            : link.kind === "whatsapp"
                            ? "whatsapp"
                            : link.kind === "x"
                            ? "x"
                            : link.kind === "tiktok"
                            ? "tiktok"
                            : link.kind === "reddit"
                            ? "reddit"
                            : "backward"
                        }
                        size={20}
                      />
                    </View>

                    <View
                      style={
                        styles.savedLinkInfo
                      }
                    >
                      <Text
                        style={
                          styles.savedLinkTitle
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {link.title}
                      </Text>

                      <Text
                        style={
                          styles.savedLinkSubtitle
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {link.kind ===
                        "external"
                          ? link.url
                          : link.username ||
                            link.url}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() =>
                        editLink(
                          link
                        )
                      }
                      style={
                        styles.iconButton
                      }
                    >
                      <Icon
                        name="edit"
                        size={
                          18
                        }
                      />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        removeLink(
                          link
                        )
                      }
                      style={
                        styles.iconButton
                      }
                    >
                      <Icon
                        name="delete"
                        size={
                          18
                        }
                      />
                    </Pressable>
                  </View>
                )
              )}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Platform
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.platformRow
                }
              >
                {SOCIAL_OPTIONS.map(
                  option => {
                    const active =
                      selectedKind ===
                      option.kind;

                    return (
                      <Pressable
                        key={
                          option.kind
                        }
                        onPress={() =>
                          setSelectedKind(
                            option.kind
                          )
                        }
                        style={[
                          styles.platformButton,
                          active &&
                            styles.platformButtonActive,
                        ]}
                      >
                        <Icon
                          name={
                            option.kind === "instagram"
                              ? "instagram"
                              : option.kind === "whatsapp"
                              ? "whatsapp"
                              : option.kind === "x"
                              ? "x"
                              : option.kind === "tiktok"
                              ? "tiktok"
                              : option.kind === "reddit"
                              ? "reddit"
                              : "backward"
                          }
                          size={22}
                          color={
                            active
                              ? theme.colors.primary
                              : "#94A3B8"
                          }
                        />

                        <Text
                          style={[
                            styles.platformText,
                            active &&
                              styles.platformTextActive,
                          ]}
                        >
                          {
                            option.label
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>

              {selectedKind ===
              "external" ? (
                <>
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Bağlantı adı
                  </Text>

                  <Input
                    icon={
                      <Icon
                        name="backward"
                        size={
                          20
                        }
                      />
                    }
                    placeholder="Web sitem, Portföyüm..."
                    value={
                      externalTitle
                    }
                    onChangeText={
                      setExternalTitle
                    }
                  />

                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    URL
                  </Text>

                  <Input
                    icon={
                      <Icon
                        name="backward"
                        size={
                          20
                        }
                      />
                    }
                    placeholder="https://example.com"
                    value={
                      externalUrl
                    }
                    autoCapitalize="none"
                    autoCorrect={
                      false
                    }
                    keyboardType="url"
                    onChangeText={
                      setExternalUrl
                    }
                  />
                </>
              ) : (
                <>
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    {
                      selectedOption?.label
                    } kullanıcı adı
                  </Text>

                  <Input
                    icon={
                      <Icon
                        name="user"
                        size={
                          20
                        }
                      />
                    }
                    placeholder={
                      selectedOption?.placeholder
                    }
                    value={
                      socialUsername
                    }
                    autoCapitalize="none"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      setSocialUsername
                    }
                  />
                </>
              )}

              <Button
                title={
                  editingLinkId
                    ? "Bağlantıyı güncelle"
                    : "Bağlantı ekle"
                }
                loading={
                  savingLink
                }
                onPress={
                  saveLink
                }
              />

              {editingLinkId ? (
                <Pressable
                  onPress={
                    resetForm
                  }
                  style={
                    styles.cancelEdit
                  }
                >
                  <Text
                    style={
                      styles.cancelEditText
                    }
                  >
                    Düzenlemeyi iptal et
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Çevrimiçi durumu
              </Text>

              <View
                style={
                  styles.switchRow
                }
              >
                <View
                  style={
                    styles.switchText
                  }
                >
                  <Text
                    style={
                      styles.rowTitle
                    }
                  >
                    Çevrimiçi durumunu göster
                  </Text>

                  <Text
                    style={
                      styles.rowDescription
                    }
                  >
                    Şu an{" "}
                    {onlineVisible
                      ? "açık"
                      : "kapalı"}
                  </Text>
                </View>

                <Switch
                  value={
                    onlineVisible
                  }
                  onValueChange={
                    toggleOnlineStatus
                  }
                  trackColor={{
                    false:
                      theme.colors
                        .gray,
                    true:
                      theme.colors
                        .primary,
                  }}
                  thumbColor={
                    theme.colors
                      .text
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Şifre değiştir
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Önce mevcut şifre, sonra iki
                kez yeni şifre.
              </Text>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Mevcut şifre
              </Text>

              <Input
                icon={
                  <Icon
                    name="lock"
                    size={20}
                  />
                }
                placeholder="Mevcut şifre"
                value={
                  currentPassword
                }
                secureTextEntry
                onChangeText={
                  setCurrentPassword
                }
                autoCapitalize="none"
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Yeni şifre
              </Text>

              <Input
                icon={
                  <Icon
                    name="lock"
                    size={20}
                  />
                }
                placeholder="Yeni şifre"
                value={
                  newPassword
                }
                secureTextEntry
                onChangeText={
                  setNewPassword
                }
                autoCapitalize="none"
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Yeni şifre tekrar
              </Text>

              <Input
                icon={
                  <Icon
                    name="lock"
                    size={20}
                  />
                }
                placeholder="Yeni şifre tekrar"
                value={
                  newPasswordAgain
                }
                secureTextEntry
                onChangeText={
                  setNewPasswordAgain
                }
                autoCapitalize="none"
              />

              <Button
                title="Şifreyi değiştir"
                loading={
                  changingPassword
                }
                onPress={
                  handlePasswordChange
                }
              />
            </View>
          </ScrollView>
        </View>
      </ScreenWarpper>
    );
  };

export default ProfileSettings;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(4),
      backgroundColor:
        theme.colors.background,
    },

    content: {
      paddingBottom:
        hp(8),
    },

    section: {
      gap: 10,
      marginBottom:
        16,
      padding:
        wp(4),
      borderRadius:
        theme.radius.xl,
      backgroundColor:
        theme.colors.card,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    sectionTitle: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    sectionDescription: {
      fontSize:
        hp(1.25),
      lineHeight:
        hp(1.85),
      color:
        "#94A3B8",
    },

    fieldLabel: {
      marginTop: 3,
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    platformRow: {
      gap: 8,
      paddingVertical: 2,
    },

    platformButton: {
      minWidth: 82,
      minHeight: 72,
      paddingHorizontal: 10,
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    platformButtonActive: {
      borderColor:
        theme.colors.primary,
      backgroundColor:
        theme.colors.card,
    },

    platformIcon: {
      fontSize: 22,
      color:
        "#94A3B8",
      fontWeight:
        theme.fonts.bold,
    },

    platformIconActive: {
      color:
        theme.colors.primary,
    },

    platformText: {
      marginTop: 4,
      fontSize:
        hp(1.05),
      color:
        "#94A3B8",
    },

    platformTextActive: {
      color:
        theme.colors.text,
      fontWeight:
        theme.fonts.semibold,
    },

    savedLink: {
      minHeight: 62,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      padding: 10,
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
    },

    savedLinkIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.colors.card,
    },

    savedLinkIconText: {
      fontSize: 18,
      color:
        theme.colors.primary,
      fontWeight:
        theme.fonts.bold,
    },

    savedLinkInfo: {
      flex: 1,
      minWidth: 0,
    },

    savedLinkTitle: {
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    savedLinkSubtitle: {
      marginTop: 2,
      fontSize:
        hp(1.1),
      color:
        "#94A3B8",
    },

    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      backgroundColor:
        theme.colors.card,
    },

    cancelEdit: {
      alignItems:
        "center",
      paddingVertical: 5,
    },

    cancelEditText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.2),
    },

    switchRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: 10,
    },

    switchText: {
      flex: 1,
    },

    rowTitle: {
      fontSize:
        hp(1.4),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    rowDescription: {
      marginTop: 3,
      fontSize:
        hp(1.1),
      color:
        "#94A3B8",
    },
  });
