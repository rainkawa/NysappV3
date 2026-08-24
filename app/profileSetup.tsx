import React, { useState } from "react";

import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

import ScreenWarpper from "@/components/ScreenWrapper";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Icon from "@/assets/icons";

import { theme } from "@/constants/theme";
import { hp, wp } from "@/helpers/common";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const ProfileSetup = () => {
  const router = useRouter();
  const authContext = useAuth();
  const user = authContext?.user?.userData;

  const [step, setStep] =
    useState<1 | 2>(1);

  const [image, setImage] =
    useState<string | null>(
      user?.image || null
    );

  const [bio, setBio] =
    useState(
      user?.bio || ""
    );

  const [loading, setLoading] =
    useState(false);

  const pickImage =
    async () => {
      try {
        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Profil resmi",
            "Profil resmin için galeri erişim izni gerekiyor."
          );
          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
            base64: true,
          });

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const asset =
          result.assets[0];

        if (
          !asset.base64 ||
          !user?.id
        ) {
          Alert.alert(
            "Profil resmi",
            "Fotoğraf verisi alınamadı."
          );
          return;
        }

        setLoading(true);

        const extension =
          (
            asset.fileName ||
            "avatar.jpg"
          )
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const contentType =
          asset.mimeType ||
          "image/jpeg";

        const path =
          `${user.id}/avatar.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              path,
              decode(asset.base64),
              {
                contentType,
                cacheControl:
                  "31536000",
                upsert: true,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const { data } =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              path
            );

        /*
         * CDN/cache yüzünden eski beyaz avatarın
         * gösterilmesini engellemek için cache-buster.
         */
        const separator =
          data.publicUrl.includes("?")
            ? "&"
            : "?";

        const cacheBustedUrl =
          `${data.publicUrl}${separator}v=${Date.now()}`;

        setImage(
          cacheBustedUrl
        );

        /*
         * Kullanıcı kurulumu tamamlamadan bile
         * seçilen gerçek Storage URL'sini AuthContext'e
         * yansıtıyoruz.
         */
        authContext?.setUserData({
          ...user,
          image:
            cacheBustedUrl,
        });
      } catch (error: any) {
        console.warn(
          "Profile setup image upload:",
          error
        );

        Alert.alert(
          "Profil resmi",
          error?.message ||
            "Profil resmi yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    };

  const finishSetup =
    async () => {
      if (!user?.id) {
        Alert.alert(
          "Profil",
          "Kullanıcı bilgileri hazır değil."
        );
        return;
      }

      setLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "finish_profile_setup",
            {
              p_image:
                image || null,
              p_bio:
                bio.trim(),
            }
          );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Profil güncelleme sonucu alınamadı."
          );
        }

        /*
         * Gerçek DB sonucu doğrudan
         * AuthContext'e yansıtılıyor.
         */
        authContext?.setUserData({
          ...user,
          image:
            data.image,
          bio:
            data.bio,
          profile_completed:
            data.profile_completed,
        });

        router.replace(
          "/home"
        );
      } catch (error: any) {
        console.warn(
          "Profile setup finish:",
          error
        );

        Alert.alert(
          "Profil",
          error?.message ||
            "Profil tamamlanamadı."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <ScreenWarpper
      bg="white"
      autoDismissKeyboard={false}
    >
      <View
        style={styles.container}
      >
        <View
          style={styles.progressRow}
        >
          <View
            style={[
              styles.progressBar,
              step === 1 &&
                styles.progressBarActive,
            ]}
          />

          <View
            style={[
              styles.progressBar,
              step === 2 &&
                styles.progressBarActive,
            ]}
          />
        </View>

        {step === 1 ? (
          <View
            style={styles.content}
          >
            <View
              style={styles.topBlock}
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                PROFİL KURULUMU
              </Text>

              <Text
                style={styles.title}
              >
                Merhaba,{" "}
                {user?.name ||
                  "kullanıcı"}
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Profil fotoğrafını
                ekleyerek başlayalım.
              </Text>
            </View>

            <View
              style={
                styles.centerBlock
              }
            >
              <Pressable
                onPress={
                  pickImage
                }
                disabled={loading}
                style={
                  styles.avatarButton
                }
              >
                {image ? (
                  <Image
                    source={{
                      uri: image,
                    }}
                    style={
                      styles.avatar
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={
                      styles.avatarPlaceholder
                    }
                  >
                    <Icon
                      name="user"
                      size={
                        hp(7)
                      }
                      color={
                        theme.colors
                          .textLight
                      }
                    />
                  </View>
                )}
              </Pressable>

              <Text
                style={
                  styles.photoTitle
                }
              >
                {image
                  ? "Profil fotoğrafın hazır"
                  : "Profil resmi yükle"}
              </Text>

              <Text
                style={
                  styles.photoHint
                }
              >
                {image
                  ? "Fotoğrafı değiştirmek için üzerine dokun."
                  : "Kare bir fotoğraf daha iyi görünür."}
              </Text>

              <Button
                title={
                  image
                    ? "Fotoğrafı değiştir"
                    : "Fotoğraf seç"
                }
                loading={loading}
                onPress={
                  pickImage
                }
              />
            </View>

            <View
              style={
                styles.bottomBlock
              }
            >
              <Button
                title="Sonraki"
                onPress={() =>
                  setStep(2)
                }
              />
            </View>
          </View>
        ) : (
          <View
            style={styles.content}
          >
            <View
              style={styles.topBlock}
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                PROFİL KURULUMU
              </Text>

              <Text
                style={styles.title}
              >
                Biyografi ekle
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Seni birkaç kelimeyle
                tanıtalım.
              </Text>
            </View>

            <View
              style={
                styles.centerBlockBio
              }
            >
              <View
                style={
                  styles.bioIconCircle
                }
              >
                <Icon
                  name="edit"
                  size={
                    hp(3.2)
                  }
                  color={
                    theme.colors
                      .primary
                  }
                  strokeWidth={
                    1.7
                  }
                />
              </View>

              <Text
                style={
                  styles.photoTitle
                }
              >
                Kendinden bahset
              </Text>

              <Text
                style={
                  styles.photoHint
                }
              >
                Kısa ve sade bir
                biyografi yazabilirsin.
              </Text>

              <Input
                icon={
                  <Icon
                    name="edit"
                    size={22}
                    color={
                      theme.colors
                        .textLight
                    }
                    strokeWidth={
                      1.6
                    }
                  />
                }
                placeholder="Örn. Müzik, teknoloji ve kahve..."
                value={bio}
                onChangeText={
                  setBio
                }
                multiline
                containerStyle={
                  styles.bioInput
                }
              />
            </View>

            <View
              style={
                styles.bottomBlock
              }
            >
              <Button
                title="Bitir"
                loading={loading}
                onPress={
                  finishSetup
                }
              />

              <Pressable
                onPress={() =>
                  setStep(1)
                }
                style={
                  styles.backStepButton
                }
              >
                <Text
                  style={
                    styles.backStepText
                  }
                >
                  Geri
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ScreenWarpper>
  );
};

export default ProfileSetup;

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal:
        wp(5),
      paddingTop:
        hp(2.2),
      paddingBottom:
        hp(2.5),
    },

    content: {
      flex: 1,
    },

    progressRow: {
      flexDirection:
        "row",
      gap: wp(2),
      marginBottom:
        hp(4),
    },

    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        theme.colors.gray,
    },

    progressBarActive: {
      backgroundColor:
        theme.colors.primary,
    },

    topBlock: {
      alignItems:
        "center",
      paddingHorizontal:
        wp(3),
    },

    eyebrow: {
      fontSize:
        hp(1.3),
      fontWeight:
        theme.fonts
          .semibold,
      letterSpacing: 1,
      color:
        theme.colors.primary,
      marginBottom:
        hp(1),
    },

    title: {
      fontSize:
        hp(3.1),
      lineHeight:
        hp(3.8),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
      textAlign:
        "center",
    },

    subtitle: {
      marginTop:
        hp(1),
      fontSize:
        hp(1.65),
      lineHeight:
        hp(2.25),
      color:
        theme.colors
          .textLight,
      textAlign:
        "center",
      maxWidth:
        wp(82),
    },

    centerBlock: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(4),
    },

    centerBlockBio: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        wp(2),
    },

    avatarButton: {
      width:
        hp(18),
      height:
        hp(18),
      borderRadius:
        hp(9),
      overflow:
        "hidden",
      backgroundColor:
        theme.colors
          .lightGray,
      borderWidth: 2,
      borderColor:
        theme.colors.gray,
    },

    avatar: {
      width: "100%",
      height: "100%",
    },

    avatarPlaceholder: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    photoTitle: {
      marginTop:
        hp(2),
      fontSize:
        hp(2),
      lineHeight:
        hp(2.5),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors.text,
      textAlign:
        "center",
    },

    photoHint: {
      marginTop:
        hp(0.7),
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2),
      color:
        theme.colors
          .textLight,
      textAlign:
        "center",
      marginBottom:
        hp(2),
      maxWidth:
        wp(78),
    },

    bioIconCircle: {
      width:
        hp(7),
      height:
        hp(7),
      borderRadius:
        hp(3.5),
      backgroundColor:
        theme.colors
          .primaryLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom:
        hp(1.5),
    },

    bioInput: {
      width: "100%",
      minHeight:
        hp(17),
      marginTop:
        hp(1.5),
      alignItems:
        "flex-start",
    },

    bottomBlock: {
      paddingTop:
        hp(1.5),
    },

    backStepButton: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical:
        hp(1.5),
    },

    backStepText: {
      fontSize:
        hp(1.5),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .textLight,
    },
  });
