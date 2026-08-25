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

const ProfileSettings = () => {
  const router = useRouter();
  const authContext = useAuth();

  const userId =
    authContext?.user?.authInfo?.id ||
    authContext?.user?.userData?.id ||
    "";

  const email =
    authContext?.user?.authInfo?.email ||
    authContext?.user?.userData?.email ||
    "";

  const [
    links,
    setLinks,
  ] = useState<ProfileLink[]>([]);

  const [
    linkTitle,
    setLinkTitle,
  ] = useState("");

  const [
    linkUrl,
    setLinkUrl,
  ] = useState("");

  const [
    editingLinkId,
    setEditingLinkId,
  ] = useState<string | null>(null);

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

  const loadData = useCallback(
    async () => {
      if (!userId) {
        return;
      }

      const [
        profileLinks,
        showOnline,
      ] = await Promise.all([
        getProfileLinks(userId),
        getShowOnlineStatus(userId),
      ]);

      setLinks(profileLinks);
      setOnlineVisible(showOnline);
    },
    [userId]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetLinkForm = () => {
    setLinkTitle("");
    setLinkUrl("");
    setEditingLinkId(null);
  };

  const saveLink = async () => {
    if (!userId) {
      return;
    }

    if (!linkTitle.trim()) {
      Alert.alert(
        "Bağlantı",
        "Bağlantı adı girin."
      );
      return;
    }

    if (!linkUrl.trim()) {
      Alert.alert(
        "Bağlantı",
        "Bağlantı adresi girin."
      );
      return;
    }

    setSavingLink(true);

    try {
      const result =
        await upsertProfileLink({
          userId,
          title: linkTitle,
          url: linkUrl,
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
                )?.position || 0
              : links.length,
        });

      if (!result.success) {
        Alert.alert(
          "Bağlantı",
          result.message
        );
        return;
      }

      resetLinkForm();
      await loadData();
    } finally {
      setSavingLink(false);
    }
  };

  const editLink = (
    link: ProfileLink
  ) => {
    setEditingLinkId(
      link.id
    );
    setLinkTitle(
      link.title
    );
    setLinkUrl(
      link.url
    );
  };

  const removeLink = (
    link: ProfileLink
  ) => {
    if (!userId) {
      return;
    }

    Alert.alert(
      "Bağlantıyı sil",
      `"${link.title}" bağlantısı silinsin mi?`,
      [
        {
          text: "Vazgeç",
          style: "cancel",
        },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const result =
              await deleteProfileLink(
                userId,
                link.id
              );

            if (!result.success) {
              Alert.alert(
                "Bağlantı",
                result.message
              );
              return;
            }

            if (
              editingLinkId ===
              link.id
            ) {
              resetLinkForm();
            }

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
      setOnlineVisible(value);

      if (!userId) {
        return;
      }

      const result =
        await setShowOnlineStatus(
          userId,
          value
        );

      if (!result.success) {
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

      if (
        newPassword.length <
        8
      ) {
        Alert.alert(
          "Şifre",
          "Yeni şifre en az 8 karakter olmalıdır."
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

        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordAgain("");

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

  if (!authContext) {
    return null;
  }

  return (
    <ScreenWarpper
      autoDismissKeyboard={false}
    >
      <View
        style={styles.container}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
        >
          <Header
            title="Profil ayarları"
            marginBottom={18}
          />

          <View
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Link-in-bio
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Profilinde göstermek istediğin
              bağlantıları ekle.
            </Text>

            {links.map(link => (
              <View
                key={link.id}
                style={styles.linkRow}
              >
                <View
                  style={
                    styles.linkInfo
                  }
                >
                  <Text
                    style={
                      styles.linkTitle
                    }
                    numberOfLines={1}
                  >
                    {link.title}
                  </Text>

                  <Text
                    style={
                      styles.linkUrl
                    }
                    numberOfLines={1}
                  >
                    {link.url}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    editLink(
                      link
                    )
                  }
                  style={
                    styles.smallButton
                  }
                >
                  <Icon
                    name="edit"
                    size={18}
                  />
                </Pressable>

                <Pressable
                  onPress={() =>
                    removeLink(
                      link
                    )
                  }
                  style={
                    styles.smallButton
                  }
                >
                  <Icon
                    name="delete"
                    size={18}
                  />
                </Pressable>
              </View>
            ))}

            <View
              style={
                styles.inputGroup
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Bağlantı adı
              </Text>

              <Input
                icon={
                  <Icon
                    name="backward"
                    size={20}
                  />
                }
                placeholder="Instagram, YouTube, Web sitem..."
                value={
                  linkTitle
                }
                onChangeText={
                  setLinkTitle
                }
              />
            </View>

            <View
              style={
                styles.inputGroup
              }
            >
              <Text
                style={
                  styles.label
                }
              >
                Bağlantı adresi
              </Text>

              <Input
                icon={
                  <Icon
                    name="backward"
                    size={20}
                  />
                }
                placeholder="https://example.com"
                value={
                  linkUrl
                }
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                keyboardType="url"
                onChangeText={
                  setLinkUrl
                }
              />
            </View>

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
                  resetLinkForm
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
            style={styles.section}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Çevrimiçi durumu
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Kapatırsan DM ekranında
              çevrimiçi/çevrimdışı bilgisi
              diğer kullanıcılara gösterilmez.
            </Text>

            <View
              style={styles.switchRow}
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
                  theme.colors.text
                }
              />
            </View>
          </View>

          <View
            style={styles.section}
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
              Önce mevcut şifreni doğruluyoruz,
              ardından yeni şifreyi kaydediyoruz.
            </Text>

            <View
              style={styles.inputGroup}
            >
              <Text
                style={
                  styles.label
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
                placeholder="Mevcut şifren"
                value={
                  currentPassword
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                onChangeText={
                  setCurrentPassword
                }
              />
            </View>

            <View
              style={styles.inputGroup}
            >
              <Text
                style={
                  styles.label
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
                placeholder="Yeni şifren"
                value={
                  newPassword
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                onChangeText={
                  setNewPassword
                }
              />
            </View>

            <View
              style={styles.inputGroup}
            >
              <Text
                style={
                  styles.label
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
                placeholder="Yeni şifreni tekrar gir"
                value={
                  newPasswordAgain
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={
                  false
                }
                onChangeText={
                  setNewPasswordAgain
                }
              />
            </View>

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

          <View
            style={
              styles.bottomSpace
            }
          />
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
      marginBottom: 16,
      padding: wp(4),
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
        hp(1.3),
      lineHeight:
        hp(1.9),
      color:
        "#94A3B8",
    },

    inputGroup: {
      gap: 6,
      marginTop: 2,
    },

    label: {
      fontSize:
        hp(1.35),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    linkRow: {
      minHeight: 62,
      flexDirection:
        "row",
      alignItems:
        "center",
      padding: 10,
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.background,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      gap: 8,
    },

    linkInfo: {
      flex: 1,
      minWidth: 0,
    },

    linkTitle: {
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    linkUrl: {
      marginTop: 3,
      fontSize:
        hp(1.15),
      color:
        "#94A3B8",
    },

    smallButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
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

    cancelEdit: {
      alignItems:
        "center",
      paddingVertical: 5,
    },

    cancelEditText: {
      color:
        "#94A3B8",
      fontSize:
        hp(1.25),
      fontWeight:
        theme.fonts.semibold,
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
        hp(1.45),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    rowDescription: {
      marginTop: 3,
      fontSize:
        hp(1.15),
      color:
        "#94A3B8",
    },

    bottomSpace: {
      height: 30,
    },
  });
