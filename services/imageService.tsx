import { getFilePath } from "@/helpers/common";
import { APIResponse } from "./userService";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import * as MediaLibrary from "expo-media-library";
import { Alert } from "react-native";

export const uploadFile = async (
  userId: string,
  folderName: string,
  fileUri: string,
  isImage: boolean = true
): Promise<APIResponse> => {
  try {
    if (!userId) {
      return {
        success: false,
        message: "User ID bulunamadı",
        data: null,
      };
    }

    if (fileUri.includes("profiles")) {
      return {
        success: true,
        message:
          "File data is already uploaded on cloud",
        data: fileUri,
      };
    }

    const fileName = getFilePath(
      userId,
      folderName,
      isImage
    );

    const fileBase64 =
      await FileSystem.readAsStringAsync(
        fileUri,
        {
          encoding:
            FileSystem.EncodingType.Base64,
        }
      );

    const imageData = decode(fileBase64);

    const { data, error } =
      await supabase.storage
        .from("uploads")
        .upload(
          fileName,
          imageData,
          {
            cacheControl: "3600",
            upsert: false,
            contentType: isImage
              ? "image/*"
              : "video/*",
          }
        );

    if (error) {
      console.warn(
        `Error while uploading ${fileUri} | ${error.message}`
      );

      return {
        success: false,
        message: `Error while uploading ${fileUri} | ${error.message}`,
        data: null,
      };
    }

    return {
      success: true,
      message:
        "File data uploading successfully",
      data: data?.path,
    };
  } catch (error) {
    console.warn(
      `Image Service - Error while uploading file | ${error}`
    );

    return {
      success: false,
      message: `Error while uploading ${fileUri} | ${error}`,
      data: null,
    };
  }
};

export const getLocalFilePath = (
  filePath: string
) => {
  const fileName =
    filePath.split("/").pop();

  return `${FileSystem.documentDirectory}${fileName}`;
};

export const downloadFile = async (
  url: string
) => {
  try {
    const { uri } =
      await FileSystem.downloadAsync(
        url,
        getLocalFilePath(url)
      );

    return uri;
  } catch {
    return null;
  }
};

export const downloadFileAsync = async (
  fileUrl: string
) => {
  try {
    console.log(
      "Url",
      fileUrl
    );

    const { granted } =
      await MediaLibrary.requestPermissionsAsync();

    if (!granted) {
      Alert.alert(
        "Permission Denied",
        "Please allow storage access."
      );

      return;
    }

    const { uri } =
      await FileSystem.downloadAsync(
        fileUrl,
        getLocalFilePath(fileUrl)
      );

    await MediaLibrary.saveToLibraryAsync(
      uri
    );

    Alert.alert(
      "Success",
      "File downloaded successfully!"
    );

    return uri;
  } catch (error) {
    console.error(
      "Download error:",
      error
    );

    Alert.alert(
      "Error",
      "Failed to download the file."
    );

    return null;
  }
};
