import Icon from "@/assets/icons";
import Button from "@/components/Button";
import Header from "@/components/Header";
import Input from "@/components/Input";
import ScreenWarpper from "@/components/ScreenWrapper";
import { theme } from "@/constants/theme";
import {
  SupaUser,
  useAuth,
} from "@/contexts/AuthContext";
import {
  getImageSource,
  hp,
  wp,
} from "@/helpers/common";
import { updateUser } from "@/services/userService";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, {
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadFile } from "@/services/imageService";

const normalizeUsername = (
  value: string
) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
};

const EditProfile = () => {
  const authContext = useAuth();

  if (!authContext) {
    return null;
  }

  const {
    user: currentUserData,
    setUserData,
  } = authContext;

  const [user, setUser] =
    useState<SupaUser>({
      id: "",
      name: "",
      displayName: "",
      email: "",
      image: null,
      bio: "",
      address: null,
      phoneNumber: "",
      createdAt: "",
      expoPushToken: null,
      isPrivate: false,
    });

  const [loading, setLoading] =
    useState(false);

  const [image, setImage] =
    useState<
      ImagePicker.ImagePickerAsset | null
    >(null);

  const [isKeyboardShow, setIsKeyboardShow] =
    useState(false);

  const [isPrivate, setIsPrivate] =
    useState(false);

  const router = useRouter();

  useEffect(() => {
    const data =
      currentUserData?.userData;

    if (!data) {
      return;
    }

    setUser({
      ...data,
      name:
        data.name || "",
      displayName:
        data.displayName ||
        data.display_name ||
        "",
      email:
        currentUserData?.authInfo?.email ||
        data.email ||
        "",
      bio:
        data.bio || "",
    });

    setIsPrivate(
      !!data.isPrivate
    );
  }, [currentUserData]);

  useEffect(() => {
    const showSubscription =
      Keyboard.addListener(
        "keyboardDidShow",
        () => {
          setIsKeyboardShow(true);
        }
      );

    const hideSubscription =
      Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setIsKeyboardShow(false);
        }
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const onPickImage =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          }
        );

      if (result.canceled) {
        return;
      }

      const selected =
        result.assets[0];

      setImage(selected);

      setUser((previous) => ({
        ...previous,
        image:
          selected.uri,
      }));
    };

  const onSubmit =
    async () => {
      const userId =
        user.id;

      const username =
        normalizeUsername(
          user.name || ""
        );

      const email =
        user.email
          ?.trim() || "";

      if (!userId) {
        Alert.alert(
          "Profil",
          "Kullanıcı bilgisi bulunamadı."
        );
        return;
      }

      if (!username) {
        Alert.alert(
          "Profil",
          "Kullanıcı adı zorunludur."
        );
        return;
      }

      if (!email) {
        Alert.alert(
          "Profil",
          "E-posta adresi zorunludur."
        );
        return;
      }

      setLoading(true);

      try {
        let finalImage =
          user.image || null;

        if (image) {
          const imageResult =
            await uploadFile(
              userId,
              "profiles",
              image.uri,
              true
            );

          if (
            !imageResult.success
          ) {
            Alert.alert(
              "Profil",
              imageResult.message
            );
            return;
          }

          finalImage =
            imageResult.data;
        }

        /*
         * Email:
         * Supabase Auth'taki email'i de güncelle.
         */
        if (
          email !==
          currentUserData?.authInfo?.email
        ) {
          const {
            error:
              emailError,
          } =
            await supabase.auth.updateUser(
              {
                email,
              }
            );

          if (emailError) {
            Alert.alert(
              "E-posta",
              emailError.message
            );
            return;
          }
        }

        const userData:
          SupaUser = {
          ...user,
          id: userId,
          name: username,
          displayName:
            user.displayName?.trim() ||
            "",
          email:
          image:
            finalImage,
          bio:
            user.bio?.trim() ||
            "",
          phoneNumber: "",
          address: null,
          isPrivate,
        };

        const result =
          await updateUser(
            userData
          );

        if (!result.success) {
          Alert.alert(
            "Profil",
            result.message
          );
          return;
        }

        setUserData(
          result.data
        );

        setUser(
          result.data
        );

        Alert.alert(
          "Profil",
          "Profil bilgileriniz güncellendi.",
          [
            {
              text: "Tamam",
              onPress: () =>
                router.back(),
            },
          ]
        );
      } catch (error) {
        console.warn(
          "Edit Profile error:",
          error
        );

        Alert.alert(
          "Profil",
          "Profil güncellenirken bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    };

  const renderPrivacyOption =
    (
      privateValue: boolean,
      title: string,
      description: string
    ) => {
      const active =
        isPrivate ===
        privateValue;

      return (
        <Pressable
          onPress={() =>
            setIsPrivate(
              privateValue
            )
          }
          style={[
            styles.privacyOption,
            active &&
              styles.privacyOptionActive,
          ]}
        >
          <View
            style={
              styles.radioOuter
            }
          >
            {active && (
              <View
                style={
                  styles.radioInner
                }
              />
            )}
          </View>

          <View
            style={
              styles.privacyTextWrap
            }
          >
            <Text
              style={[
                styles.privacyOptionTitle,
                active &&
                  styles.privacyOptionTitleActive,
              ]}
            >
              {title}
            </Text>

            <Text
              style={
                styles.privacyOptionDescription
              }
            >
              {description}
            </Text>
          </View>
        </Pressable>
      );
    };

  return (
    <ScreenWarpper
      autoDismissKeyboard={
        isKeyboardShow
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
            styles.scrollContent
          }
        >
          <Header
            title="Profili düzenle"
            marginBottom={20}
          />

          <View
            style={
              styles.form
            }
          >
            <View
              style={
                styles.avatarContainer
              }
            >
              <Image
                source={
                  image
                    ? image.uri
                    : getImageSource(
                        user.image
                      )
                }
                style={
                  styles.avatar
                }
              />

              <Pressable
                style={
                  styles.cameraButton
                }
                onPress={
                  onPickImage
                }
              >
                <Icon
                  name="camera"
                  strokeWidth={2}
                  size={20}
                />
              </Pressable>
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                İsim
              </Text>

              <Input
                icon={
                  <Icon name="user" />
                }
                placeholder="Adın ve soyadın"
                value={
                  user.displayName ||
                  ""
                }
                onChangeText={(
                  value
                ) => {
                  setUser(
                    previous => ({
                      ...previous,
                      displayName:
                        value,
                    })
                  );
                }}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Profilinde kullanıcı adının
                üstünde bu isim gösterilir.
              </Text>
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Kullanıcı adı *
              </Text>

              <Input
                icon={
                  <Icon name="user" />
                }
                placeholder="kullanici_adi"
                value={
                  user.name
                }
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (previous) => ({
                      ...previous,
                      name:
                        normalizeUsername(
                          value
                        ),
                    })
                  );
                }}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Küçük harf ve
                boşluksuz. Sadece
                a-z, 0-9, nokta ve
                alt çizgi.
              </Text>
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                E-posta *
              </Text>

              <Input
                icon={
                  <Icon name="mail" />
                }
                placeholder="ornek@email.com"
                value={
                  user.email || ""
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (previous) => ({
                      ...previous,
                      email:
                        value.trim(),
                    })
                  );
                }}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Hesabınızın giriş
                e-posta adresidir.
              </Text>
            </View>

            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Biyografi
              </Text>

              <Input
                placeholder="Kendinden bahset..."
                value={
                  user.bio || ""
                }
                multiline
                textAlignVertical="top"
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (previous) => ({
                      ...previous,
                      bio:
                        value,
                    })
                  );
                }}
                containerStyle={
                  styles.bioInput
                }
              />
            </View>

            <View
              style={
                styles.privacySection
              }
            >
              <View
                style={
                  styles.privacyHeader
                }
              >
                <Text
                  style={
                    styles.privacyTitle
                  }
                >
                  Hesap gizliliği
                </Text>

                <Text
                  style={
                    styles.privacySubtitle
                  }
                >
                  Gizli hesaplarda yalnızca
                  onayladığınız takipçiler
                  paylaşımlarınızı görür.
                </Text>
              </View>

              {renderPrivacyOption(
                false,
                "Herkese açık",
                "Herkes profilinizi ve paylaşımlarınızı görebilir."
              )}

              {renderPrivacyOption(
                true,
                "Gizli hesap",
                "Paylaşımlarınızı yalnızca onayladığınız takipçiler görür."
              )}
            </View>

            <Button
              title="Değişiklikleri kaydet"
              loading={
                loading
              }
              onPress={
                onSubmit
              }
            />

            <Pressable
              onPress={() =>
                router.push(
                  "/profileSettings"
                )
              }
              style={
                styles.settingsButton
              }
            >
              <Text
                style={
                  styles.settingsButtonText
                }
              >
                Profil ayarları
              </Text>
            </Pressable>

            {isKeyboardShow && (
              <View
                style={{
                  height: hp(10),
                }}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenWarpper>
  );
};

export default EditProfile;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(4),
      backgroundColor:
        theme.colors.background,
    },

    scrollContent: {
      flexGrow: 1,
      paddingTop: hp(1),
      paddingBottom: hp(6),
    },

    form: {
      gap: 16,
      marginTop: hp(1),
      paddingBottom: hp(2),
    },

    section: {
      width: "100%",
      gap: 7,
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

    avatarContainer: {
      width: hp(15),
      height: hp(15),
      alignSelf:
        "center",
      marginBottom:
        hp(1),
    },

    avatar: {
      width: "100%",
      height: "100%",
      borderRadius:
        hp(7.5),
      borderWidth: 2,
      borderColor:
        theme.colors.primary,
      backgroundColor:
        theme.colors.card,
    },

    cameraButton: {
      position:
        "absolute",
      right: -4,
      bottom: 2,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor:
        theme.colors.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        theme.colors.background,
    },

    fieldLabel: {
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    helperText: {
      fontSize:
        hp(1.2),
      lineHeight:
        hp(1.7),
      color:
        "#94A3B8",
    },

    bioInput: {
      minHeight: 92,
      maxHeight: 128,
      width: "100%",
    },

    privacySection: {
      width: "100%",
      gap: 10,
      marginTop: 0,
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

    privacyHeader: {
      gap: 5,
      marginBottom: 2,
    },

    privacyTitle: {
      fontSize:
        hp(1.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    privacySubtitle: {
      fontSize:
        hp(1.25),
      lineHeight:
        hp(1.85),
      color:
        "#94A3B8",
    },

    privacyOption: {
      width: "100%",
      minHeight: 78,
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.lg,
      backgroundColor:
        theme.colors.background,
    },

    privacyOptionActive: {
      backgroundColor:
        "#252F4A",
      borderColor:
        theme.colors.primary,
    },

    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor:
        "#64748B",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 14,
      flexShrink: 0,
    },

    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor:
        theme.colors.primary,
    },

    privacyTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    privacyOptionTitle: {
      fontSize:
        hp(1.45),
      fontWeight:
        theme.fonts.bold,
      color:
        "#CBD5E1",
    },

    privacyOptionTitleActive: {
      color:
        theme.colors.text,
    },

    privacyOptionDescription: {
      marginTop: 4,
      fontSize:
        hp(1.15),
      lineHeight:
        hp(1.65),
      color:
        "#94A3B8",
    },

    settingsButton: {
      minHeight: 48,
      borderRadius:
        theme.radius.xl,
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
        20,
    },

    settingsButtonText: {
      color:
        theme.colors.text,
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts.semibold,
    },
  });

