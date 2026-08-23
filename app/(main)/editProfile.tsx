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
import {
  updateUser,
} from "@/services/userService";
import {
  Image,
} from "expo-image";
import {
  useRouter,
} from "expo-router";
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
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  uploadFile,
} from "@/services/imageService";
import {
  getProvinces,
  Province,
} from "@/services/provinceService";
import {
  Picker,
} from "@react-native-picker/picker";

const EditProfile =
  () => {
    const AuthContext =
      useAuth();

    if (!AuthContext) {
      console.warn(
        "AuthContext is not found"
      );

      return null;
    }

    const {
      user: currentUserData,
      setUserData,
    } = AuthContext;

    const [
      user,
      setUser,
    ] =
      useState<SupaUser>({
        id: "",
        name: "",
        email: "",
        image: null,
        bio: null,
        address: null,
        phoneNumber: "",
        createdAt: "",
        isPrivate: false,
      });

    const [
      loading,
      setLoading,
    ] =
      useState(false);

    const [
      image,
      setImage,
    ] =
      useState<
        ImagePicker.ImagePickerAsset | null
      >(null);

    const [
      isKeyboardShow,
      setIsKeyboardShow,
    ] =
      useState(false);

    const [
      provinces,
      setProvinces,
    ] =
      useState<
        Province[]
      >([]);

    const [
      selectedProvince,
      setSelectedProvince,
    ] =
      useState<
        string | null
      >(null);

    const [
      selectedDistrict,
      setSelectedDistrict,
    ] =
      useState<
        string | null
      >(null);

    const [
      isOpenListProvince,
      setIsOpenListProvince,
    ] =
      useState(false);

    const [
      isOpenListDistrict,
      setIsOpenListDistrict,
    ] =
      useState(false);

    const [
      isPrivate,
      setIsPrivate,
    ] =
      useState(false);

    const router =
      useRouter();

    /*
     * Provinces
     */

    const gettingCity =
      async () => {
        const res =
          await getProvinces();

        if (res.success) {
          setProvinces(
            res.data || []
          );
        } else {
          Alert.alert(
            "Profil",
            res.message
          );
        }
      };

    /*
     * Existing user data
     */

    useEffect(() => {
      const data =
        currentUserData?.userData;

      if (!data) {
        return;
      }

      setUser(
        data
      );

      setIsPrivate(
        !!data.isPrivate
      );

      if (data.address) {
        const parts =
          data.address
            .toString()
            .split(" - ");

        setSelectedProvince(
          parts[0] ||
            null
        );

        setSelectedDistrict(
          parts[1] ||
            null
        );
      }
    }, [
      currentUserData,
    ]);

    /*
     * Keyboard + province
     */

    useEffect(() => {
      gettingCity();

      const showSubscription =
        Keyboard.addListener(
          "keyboardDidShow",
          () => {
            setIsKeyboardShow(
              true
            );
          }
        );

      const hideSubscription =
        Keyboard.addListener(
          "keyboardDidHide",
          () => {
            setIsKeyboardShow(
              false
            );
          }
        );

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }, []);

    /*
     * Submit
     */

    const onSubmit =
      async () => {
        const userId =
          user.id;

        if (!userId) {
          Alert.alert(
            "Profil",
            "Kullanıcı bilgisi bulunamadı."
          );

          return;
        }

        if (
          !selectedProvince ||
          !selectedDistrict
        ) {
          Alert.alert(
            "Profil",
            "Lütfen adres bilgilerinizi seçin."
          );

          return;
        }

        if (
          !user.name?.trim()
        ) {
          Alert.alert(
            "Profil",
            "Lütfen kullanıcı adınızı girin."
          );

          return;
        }

        if (
          !user.phoneNumber?.trim()
        ) {
          Alert.alert(
            "Profil",
            "Lütfen telefon numaranızı girin."
          );

          return;
        }

        if (
          !user.bio?.trim()
        ) {
          Alert.alert(
            "Profil",
            "Lütfen biyografinizi girin."
          );

          return;
        }

        if (
          !user.image &&
          !image
        ) {
          Alert.alert(
            "Profil",
            "Lütfen profil fotoğrafınızı seçin."
          );

          return;
        }

        setLoading(
          true
        );

        try {
          const userData: SupaUser =
            {
              ...user,

              id: userId,

              address:
                `${selectedProvince} - ${selectedDistrict}`,

              isPrivate,
            };

          /*
           * Only upload a new image when
           * the user selected one.
           */

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

            userData.image =
              imageResult.data;
          }

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

          /*
           * Update local auth state immediately.
           */

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
                onPress:
                  () => {
                    router.back();
                  },
              },
            ]
          );
        } catch (
          error
        ) {
          console.warn(
            "Edit Profile error:",
            error
          );

          Alert.alert(
            "Profil",
            "Profil güncellenirken bir hata oluştu."
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    /*
     * Pick profile image
     */

    const onPickImage =
      async () => {
        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],
              allowsEditing:
                true,
              aspect: [
                4,
                4,
              ],
              quality:
                0.7,
            }
          );

        if (
          result.canceled
        ) {
          return;
        }

        const selectedImage =
          result.assets[0];

        setImage(
          selectedImage
        );

        setUser(
          (prev) => ({
            ...prev,
            image:
              selectedImage.uri,
          })
        );
      };

    /*
     * Privacy selector
     */

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
                styles.privacyRadio
              }
            >
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
            showsVerticalScrollIndicator={
              false
            }
            style={{
              flex: 1,
            }}
            contentContainerStyle={
              styles.scrollContent
            }
          >
            <Header
              title="Profili düzenle"
              marginBottom={
                10
              }
            />

            <View
              style={
                styles.form
              }
            >
              {/* PROFILE IMAGE */}

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
                    strokeWidth={
                      2
                    }
                    size={20}
                  />
                </Pressable>
              </View>

              <Text
                style={
                  styles.sectionHint
                }
              >
                Profil bilgilerini
                düzenle
              </Text>

              {/* USERNAME */}

              <Input
                icon={
                  <Icon
                    name="user"
                  />
                }
                placeholder="Kullanıcı adı"
                value={
                  user.name
                }
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (
                      prev
                    ) => ({
                      ...prev,
                      name:
                        value,
                    })
                  );
                }}
              />

              {/* PHONE */}

              <Input
                icon={
                  <Icon
                    name="call"
                  />
                }
                placeholder="Telefon numarası"
                value={
                  user.phoneNumber
                }
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (
                      prev
                    ) => ({
                      ...prev,
                      phoneNumber:
                        value,
                    })
                  );
                }}
              />

              {/* LOCATION */}

              <View>
                <Text
                  style={
                    styles.label
                  }
                >
                  İl / şehir
                </Text>

                <TouchableWithoutFeedback
                  onPress={() =>
                    setIsOpenListProvince(
                      true
                    )
                  }
                >
                  <View
                    style={
                      styles.pickerContainer
                    }
                  >
                    <Picker
                      selectedValue={
                        selectedProvince
                      }
                      onValueChange={(
                        value
                      ) => {
                        setSelectedProvince(
                          value
                        );

                        setSelectedDistrict(
                          null
                        );

                        setIsOpenListProvince(
                          false
                        );
                      }}
                      style={
                        styles.picker
                      }
                    >
                      <Picker.Item
                        label="İl / şehir seç"
                        value={
                          null
                        }
                      />

                      {provinces.map(
                        (
                          province
                        ) => (
                          <Picker.Item
                            key={
                              province.code
                            }
                            label={
                              province.name
                            }
                            value={
                              province.name
                            }
                            color={
                              theme
                                .colors
                                .text
                            }
                          />
                        )
                      )}
                    </Picker>
                  </View>
                </TouchableWithoutFeedback>

                {selectedProvince && (
                  <>
                    <Text
                      style={
                        styles.label
                      }
                    >
                      İlçe
                    </Text>

                    <TouchableWithoutFeedback
                      onPress={() =>
                        setIsOpenListDistrict(
                          true
                        )
                      }
                    >
                      <View
                        style={
                          styles.pickerContainer
                        }
                      >
                        <Picker
                          selectedValue={
                            selectedDistrict
                          }
                          onValueChange={(
                            value
                          ) => {
                            setSelectedDistrict(
                              value
                            );

                            setUser(
                              (
                                prev
                              ) => ({
                                ...prev,
                                address:
                                  `${selectedProvince} - ${value}`,
                              })
                            );

                            setIsOpenListDistrict(
                              false
                            );
                          }}
                          style={
                            styles.picker
                          }
                        >
                          <Picker.Item
                            label="İlçe seç"
                            value={
                              null
                            }
                          />

                          {provinces
                            .find(
                              (
                                province
                              ) =>
                                province.name ===
                                selectedProvince
                            )
                            ?.districts.map(
                              (
                                district
                              ) => (
                                <Picker.Item
                                  key={
                                    district.code
                                  }
                                  label={
                                    district.name
                                  }
                                  value={
                                    district.name
                                  }
                                  color={
                                    theme
                                      .colors
                                      .text
                                  }
                                />
                              )
                            )}
                        </Picker>
                      </View>
                    </TouchableWithoutFeedback>
                  </>
                )}
              </View>

              {/* BIO */}

              <Input
                placeholder="Biyografi"
                value={
                  user.bio ||
                  ""
                }
                multiline
                onChangeText={(
                  value
                ) => {
                  setUser(
                    (
                      prev
                    ) => ({
                      ...prev,
                      bio:
                        value,
                    })
                  );
                }}
                containerStyle={
                  styles.bio
                }
              />

              {/* PRIVACY */}

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
                  paylaşımlarınızı görebilir.
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

              {/* UPDATE */}

              <Button
                title="Değişiklikleri kaydet"
                loading={
                  loading
                }
                onPress={
                  onSubmit
                }
              />

              {isKeyboardShow && (
                <View
                  style={{
                    height:
                      hp(
                        25
                      ),
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
    },

    scrollContent: {
      paddingBottom:
        30,
    },

    form: {
      gap: 18,
      marginTop: 15,
    },

    avatarContainer: {
      height: hp(14),
      width: hp(14),
      alignSelf:
        "center",
    },

    avatar: {
      width: "100%",
      height: "100%",
      borderRadius:
        theme.radius
          .xxl *
        1.8,
      borderCurve:
        "continuous",
      borderWidth: 1,
      borderColor:
        theme.colors
          .darkLight,
    },

    cameraButton: {
      position:
        "absolute",
      bottom: 0,
      right: -10,
      padding: 8,
      borderRadius: 50,
      backgroundColor:
        "white",
      shadowColor:
        theme.colors
          .textLight,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.35,
      shadowRadius: 5,
      elevation: 7,
    },

    sectionHint: {
      fontSize:
        hp(1.5),
      color:
        theme.colors
          .textLight,
      fontWeight:
        theme.fonts.medium,
    },

    label: {
      marginTop:
        4,
      marginBottom:
        8,
      fontSize:
        hp(1.5),
      color:
        theme.colors
          .text,
      fontWeight:
        theme.fonts.semibold,
    },

    pickerContainer: {
      borderWidth:
        0.5,
      borderColor:
        theme.colors
          .textLight,
      borderRadius:
        theme.radius.xxl,
      overflow:
        "hidden",
      backgroundColor:
        "white",
      minHeight: 58,
      justifyContent:
        "center",
    },

    picker: {
      width: "100%",
      color:
        theme.colors
          .text,
    },

    bio: {
      minHeight: 110,
      textAlignVertical:
        "top",
    },

    privacySection: {
      marginTop: 4,
      gap: 10,
    },

    privacyTitle: {
      fontSize:
        hp(2),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .text,
    },

    privacySubtitle: {
      fontSize:
        hp(1.45),
      lineHeight:
        hp(2.1),
      color:
        theme.colors
          .textLight,
    },

    privacyOption: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        14,
      paddingVertical:
        14,
      borderWidth:
        1,
      borderColor:
        theme.colors
          .gray,
      borderRadius:
        theme.radius.md,
      backgroundColor:
        "white",
    },

    privacyOptionActive: {
      borderColor:
        theme.colors
          .primary,
      backgroundColor:
        "#F4FFF9",
    },

    privacyRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        theme.colors
          .gray,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    privacyRadioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor:
        theme.colors
          .primary,
    },

    privacyOptionContent: {
      flex: 1,
    },

    privacyOptionTitle: {
      fontSize:
        hp(1.7),
      fontWeight:
        theme.fonts
          .semibold,
      color:
        theme.colors
          .text,
    },

    privacyOptionTitleActive: {
      color:
        theme.colors
          .primary,
    },

    privacyOptionDescription: {
      marginTop: 4,
      fontSize:
        hp(1.35),
      lineHeight:
        hp(1.9),
      color:
        theme.colors
          .textLight,
    },
  });
