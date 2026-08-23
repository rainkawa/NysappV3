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

const normalizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");

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
      email: "",
      image: null,
      bio: null,
      address: null,
      phoneNumber: "",
      createdAt: "",
      expoPushToken: null,
      isPrivate: false,
    });

  const [loading, setLoading] =
    useState(false);

  const [image, setImage] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [isKeyboardShow, setIsKeyboardShow] =
    useState(false);

  const [isPrivate, setIsPrivate] =
    useState(false);

  const router = useRouter();

  useEffect(() => {
    const data =
      currentUserData?.userData;

    if (!data) return;

    setUser(data);
    setIsPrivate(!!data.isPrivate);
  }, [currentUserData]);

  useEffect(() => {
    const showSubscription =
      Keyboard.addListener(
        "keyboardDidShow",
        () => setIsKeyboardShow(true)
      );

    const hideSubscription =
      Keyboard.addListener(
        "keyboardDidHide",
        () => setIsKeyboardShow(false)
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const onPickImage = async () => {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (result.canceled) return;

    const selected = result.assets[0];

    setImage(selected);

    setUser((previous) => ({
      ...previous,
      image: selected.uri,
    }));
  };

  const onSubmit = async () => {
    const userId = user.id;
    const email = user.email?.trim() || "";
    const username = normalizeUsername(
      user.name || ""
    );

    if (!userId) {
      Alert.alert(
        "Profil",
        "Kullanıcı bilgisi bulunamadı."
      );
      return;
    }

    if (!email) {
      Alert.alert(
        "Profil",
        "E-posta adresi bulunamadı."
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

    setLoading(true);

    try {
      let finalImage = user.image || null;

      if (image) {
        const imageResult =
          await uploadFile(
            userId,
            "profiles",
            image.uri,
            true
          );

        if (!imageResult.success) {
          Alert.alert(
            "Profil",
            imageResult.message
          );
          return;
        }

        finalImage = imageResult.data;
      }

      const userData: SupaUser = {
        ...user,
        id: userId,
        name: username,
        email,
        image: finalImage,
        bio: user.bio || "",
        phoneNumber: "",
        address: null,
        isPrivate,
      };

      const result =
        await updateUser(userData);

      if (!result.success) {
        Alert.alert(
          "Profil",
          result.message
        );
        return;
      }

      setUserData(result.data);
      setUser(result.data);

      Alert.alert(
        "Profil",
        "Profil güncellendi.",
        [
          {
            text: "Tamam",
            onPress: () => router.back(),
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

  const renderPrivacyOption = (
    privateValue: boolean,
    title: string,
    description: string
  ) => {
    const active =
      isPrivate === privateValue;

    return (
      <Pressable
        onPress={() =>
          setIsPrivate(privateValue)
        }
        style={[
          styles.privacyOption,
          active &&
            styles.privacyOptionActive,
        ]}
      >
        <View style={styles.privacyRadio}>
          {active && (
            <View
              style={
                styles.privacyRadioInner
              }
            />
          )}
        </View>

        <View
          style={
            styles.privacyOptionContent
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
      bg="white"
      autoDismissKeyboard={isKeyboardShow}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <Header
            title="Profili düzenle"
            marginBottom={10}
          />

          <View style={styles.form}>
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
                style={styles.avatar}
              />

              <Pressable
                style={
                  styles.cameraButton
                }
                onPress={onPickImage}
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
                styles.fieldSection
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
                value={user.name}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
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
                Küçük harf, boşluksuz.
                Sadece a-z, 0-9, nokta
                ve alt çizgi.
              </Text>
            </View>

            <View
              style={
                styles.fieldSection
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
                value={user.email || ""}
                editable={false}
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Hesap e-posta adresi.
              </Text>
            </View>

            <View
              style={
                styles.fieldSection
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
                value={user.bio || ""}
                multiline
                onChangeText={(value) => {
                  setUser(
                    (previous) => ({
                      ...previous,
                      bio: value,
                    })
                  );
                }}
                containerStyle={styles.bio}
              />
            </View>

            <View
              style={
                styles.privacySection
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
              loading={loading}
              onPress={onSubmit}
            />

            {isKeyboardShow && (
              <View
                style={{
                  height: hp(20),
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
      paddingHorizontal: wp(4),
    },

    scrollContent: {
      paddingBottom: 35,
    },

    form: {
      gap: 20,
      marginTop: 15,
    },

    avatarContainer: {
      width: hp(14),
      height: hp(14),
      alignSelf: "center",
    },

    avatar: {
      width: "100%",
      height: "100%",
      borderRadius: hp(7),
      borderWidth: 1,
      borderColor:
        theme.colors.darkLight,
    },

    cameraButton: {
      position: "absolute",
      right: -6,
      bottom: 0,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "white",
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },

    fieldSection: {
      gap: 7,
    },

    fieldLabel: {
      fontSize: hp(1.7),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.textDark,
    },

    helperText: {
      fontSize: hp(1.3),
      color:
        theme.colors.textLight,
      lineHeight: hp(1.9),
    },

    bio: {
      minHeight: 105,
    },

    privacySection: {
      gap: 10,
    },

    privacyTitle: {
      fontSize: hp(1.9),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.textDark,
    },

    privacySubtitle: {
      fontSize: hp(1.35),
      lineHeight: hp(2),
      color:
        theme.colors.textLight,
    },

    privacyOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor:
        theme.colors.gray,
      borderRadius:
        theme.radius.md,
      backgroundColor: "white",
    },

    privacyOptionActive: {
      backgroundColor:
        theme.colors.primary,
      borderColor:
        theme.colors.primary,
    },

    privacyRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        theme.colors.gray,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    privacyRadioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor:
        theme.colors.primary,
    },

    privacyOptionContent: {
      flex: 1,
    },

    privacyOptionTitle: {
      fontSize: hp(1.7),
      fontWeight:
        theme.fonts.semibold,
      color:
        theme.colors.text,
    },

    privacyOptionTitleActive: {
      color:
        theme.colors.primary,
    },

    privacyOptionDescription: {
      marginTop: 4,
      fontSize: hp(1.35),
      lineHeight: hp(1.9),
      color:
        theme.colors.textLight,
    },
  });
