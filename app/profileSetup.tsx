import React, {
  useState,
} from "react";

import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

import ScreenWarpper from "@/components/ScreenWrapper";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Icon from "@/assets/icons";

import { theme } from "@/constants/theme";
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

const ProfileSetup = () => {
  const router =
    useRouter();

  const authContext =
    useAuth();

  const user =
    authContext?.user
      ?.userData;

  const [
    step,
    setStep,
  ] =
    useState<1 | 2>(1);

  const [
    image,
    setImage,
  ] =
    useState<string | null>(
      user?.image || null
    );

  const [
    bio,
    setBio,
  ] =
    useState(
      user?.bio || ""
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const pickImage =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            "Profil resmi",
            "Galeri erişim izni gerekiyor."
          );
          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                ["images"],
              allowsEditing:
                true,
              aspect: [1, 1],
              quality: 0.85,
              base64: true,
            }
          );

        if (
          result.canceled ||
          !result.assets?.length
        ) {
          return;
        }

        const asset =
          result.assets[0];

        if (
          !asset.base64
        ) {
          Alert.alert(
            "Profil resmi",
            "Fotoğraf verisi alınamadı."
          );
          return;
        }

        if (
          !user?.id
        ) {
          Alert.alert(
            "Profil",
            "Kullanıcı bilgileri hazır değil."
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
          error:
            uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              path,
              decode(
                asset.base64
              ),
              {
                contentType,
                cacheControl:
                  "31536000",
                upsert: true,
              }
            );

        if (
          uploadError
        ) {
          throw uploadError;
        }

        const {
          data:
            publicUrlData,
        } =
          supabase.storage
            .from(
              "avatars"
            )
            .getPublicUrl(
              path
            );

        setImage(
          publicUrlData.publicUrl
        );
      } catch (
        error: any
      ) {
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
      if (
        !user?.id
      ) {
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

        if (
          error
        ) {
          throw error;
        }

        if (
          !data
        ) {
          throw new Error(
            "Profil güncelleme sonucu alınamadı."
          );
        }

        authContext?.setUserData(
          {
            ...user,
            image:
              data.image,
            bio:
              data.bio,
            profile_completed:
              data.profile_completed,
          }
        );

        router.replace(
          "/home"
        );
      } catch (
        error: any
      ) {
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
      autoDismissKeyboard={
        false
      }
    >
      <View
        style={
          styles.container
        }
      >
        {step === 1 ? (
          <>
            <Text
              style={
                styles.title
              }
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
              Profilini oluşturalım.
            </Text>

            <View
              style={
                styles.imageSection
              }
            >
              <Pressable
                onPress={
                  pickImage
                }
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
                  />
                ) : (
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
                )}
              </Pressable>

              <Button
                title="Profil resmi yükle"
                loading={
                  loading
                }
                onPress={
                  pickImage
                }
              />
            </View>

            <View
              style={
                styles.spacer
              }
            />

            <Button
              title="Sonraki"
              onPress={() =>
                setStep(2)
              }
            />
          </>
        ) : (
          <>
            <Text
              style={
                styles.title
              }
            >
              Biyografi ekle
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Kendinden biraz bahset.
            </Text>

            <Input
              icon={
                <Icon
                  name="edit"
                  size={24}
                  strokeWidth={
                    1.6
                  }
                />
              }
              placeholder="Biyografin..."
              value={bio}
              onChangeText={
                setBio
              }
              multiline
              containerStyle={
                styles.bioInput
              }
            />

            <View
              style={
                styles.spacer
              }
            />

            <Button
              title="Bitir"
              loading={
                loading
              }
              onPress={
                finishSetup
              }
            />
          </>
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
      paddingVertical:
        hp(3),
    },

    title: {
      fontSize:
        hp(3.1),
      fontWeight:
        theme.fonts.bold,
      color:
        theme.colors.text,
    },

    subtitle: {
      marginTop: 8,
      fontSize:
        hp(1.6),
      color:
        theme.colors
          .textLight,
    },

    imageSection: {
      alignItems:
        "center",
      marginTop:
        hp(7),
      gap: hp(2),
    },

    avatarButton: {
      width:
        hp(15),
      height:
        hp(15),
      borderRadius:
        hp(7.5),
      backgroundColor:
        theme.colors
          .lightGray,
      alignItems:
        "center",
      justifyContent:
        "center",
      overflow:
        "hidden",
    },

    avatar: {
      width: "100%",
      height: "100%",
    },

    spacer: {
      flex: 1,
    },

    bioInput: {
      marginTop:
        hp(5),
      minHeight:
        hp(16),
      alignItems:
        "flex-start",
    },
  });
