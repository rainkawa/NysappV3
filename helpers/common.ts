import { supabaseUrl } from "@/constants";
import moment from "moment";
import "moment/locale/tr";
import { Dimensions } from "react-native";

export const {
  width: deviceWidth,
  height: deviceHeight,
} = Dimensions.get("window");

export const hp = (percentage: number) => {
  return (percentage * deviceHeight) / 100;
};

export const wp = (percentage: number) => {
  return (percentage * deviceWidth) / 100;
};

export const getImageSource = (
  uri: string | undefined | null
) => {
  if (uri === undefined || uri === null) {
    const defaultUserImage = require("../assets/images/defaultUser.png");
    return defaultUserImage;
  }

  return getSupabaseFileUrl(uri)?.uri;
};

export const getSupabaseFileUrl = (
  filePath: string
) => {
  if (!filePath) {
    return null;
  }

  return {
    uri: `${supabaseUrl}/storage/v1/object/public/uploads/${filePath}`,
  };
};

export const getFilePath = (
  userId: string,
  folderName: string,
  isImage: boolean
) => {
  const extension = isImage ? ".png" : ".mp4";

  return `${userId}/${folderName}/${Date.now()}${extension}`;
};

export const stripHtmlTags = (
  html: string
): string => {
  return html.replace(/<[^>]*>/gm, "");
};

export const getFormattedDate = (
  date: string
): string => {
  moment.locale("tr");
  return moment(date).format("D MMMM");
};

export const maskGmail = (
  email: string
): string => {
  if (!email.includes("@gmail.com")) {
    return "";
  }

  const username = email.replace(
    "@gmail.com",
    ""
  );

  if (username.length < 6) {
    return "";
  }

  if (
    username.length <= 8 &&
    username.length >= 6
  ) {
    const firstPart = username.slice(0, 2);
    const lastPart = username.slice(-2);
    const middleMask = "*".repeat(
      username.length - 4
    );

    return `${firstPart}${middleMask}${lastPart}@gmail.com`;
  }

  const firstPart = username.slice(0, 4);
  const lastPart = username.slice(-4);
  const middleMask = "*".repeat(
    username.length - 8
  );

  return `${firstPart}${middleMask}${lastPart}@gmail.com`;
};

export const maskPhoneNumber = (
  phoneNumber: string
): string => {
  if (phoneNumber.length < 6) {
    return "";
  }

  const firstPart = phoneNumber.slice(0, 2);
  const lastPart = phoneNumber.slice(-4);
  const middleMask = "*".repeat(
    phoneNumber.length - 6
  );

  return `${firstPart}${middleMask}${lastPart}`;
};
