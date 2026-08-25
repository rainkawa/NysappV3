import { supabase } from "@/lib/supabase";

export type ProfileLinkKind =
  | "instagram"
  | "whatsapp"
  | "x"
  | "tiktok"
  | "reddit"
  | "external";

export interface ProfileLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  position: number;
  created_at: string;
  updated_at: string;
  kind: ProfileLinkKind;
  username: string | null;
}

export const SOCIAL_OPTIONS: Array<{
  kind: ProfileLinkKind;
  label: string;
  placeholder: string;
}> = [
  {
    kind: "instagram",
    label: "Instagram",
    placeholder: "kullaniciadi",
  },
  {
    kind: "whatsapp",
    label: "WhatsApp",
    placeholder: "+905xxxxxxxxx",
  },
  {
    kind: "x",
    label: "X",
    placeholder: "kullaniciadi",
  },
  {
    kind: "tiktok",
    label: "TikTok",
    placeholder: "kullaniciadi",
  },
  {
    kind: "reddit",
    label: "Reddit",
    placeholder: "kullaniciadi",
  },
  {
    kind: "external",
    label: "Harici bağlantı",
    placeholder: "",
  },
];

const normalizeUrl = (
  value: string
) => {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const cleanUsername = (
  value: string
) => {
  return value
    .trim()
    .replace(/^@/, "");
};

const createSocialUrl = (
  kind: ProfileLinkKind,
  username: string
) => {
  const clean =
    cleanUsername(
      username
    );

  if (!clean) {
    return "";
  }

  switch (kind) {
    case "instagram":
      return `https://instagram.com/${clean}`;

    case "x":
      return `https://x.com/${clean}`;

    case "tiktok":
      return `https://tiktok.com/@${clean}`;

    case "reddit":
      return `https://reddit.com/user/${clean.replace(
        /^u\//,
        ""
      )}`;

    case "whatsapp": {
      const phone =
        clean.replace(
          /[^0-9]/g,
          ""
        );

      return phone
        ? `https://wa.me/${phone}`
        : "";
    }

    default:
      return "";
  }
};

export const getProfileLinks =
  async (
    userId: string
  ): Promise<
    ProfileLink[]
  > => {
    if (!userId) {
      return [];
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "profile_links"
      )
      .select(
        "id,user_id,title,url,position,created_at,updated_at,kind,username"
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "position",
        {
          ascending: true,
        }
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      console.warn(
        "getProfileLinks:",
        error.message
      );

      return [];
    }

    return (
      data || []
    ) as ProfileLink[];
  };

export const upsertProfileLink =
  async ({
    userId,
    kind,
    username,
    title,
    url,
    linkId,
    position = 0,
  }: {
    userId: string;
    kind: ProfileLinkKind;
    username?: string;
    title?: string;
    url?: string;
    linkId?: string;
    position?: number;
  }) => {
    if (!userId) {
      return {
        success: false,
        message:
          "Kullanıcı bulunamadı.",
      };
    }

    let finalTitle = "";
    let finalUrl = "";
    let finalUsername:
      | string
      | null = null;

    if (
      kind ===
      "external"
    ) {
      finalTitle =
        title?.trim() ||
        "";

      finalUrl =
        normalizeUrl(
          url || ""
        );

      if (
        !finalTitle ||
        !finalUrl
      ) {
        return {
          success: false,
          message:
            "Bağlantı adı ve URL zorunludur.",
        };
      }
    } else {
      finalUsername =
        cleanUsername(
          username || ""
        );

      if (!finalUsername) {
        return {
          success: false,
          message:
            "Kullanıcı adı zorunludur.",
        };
      }

      const option =
        SOCIAL_OPTIONS.find(
          item =>
            item.kind ===
            kind
        );

      finalTitle =
        option?.label ||
        "";

      finalUrl =
        createSocialUrl(
          kind,
          finalUsername
        );

      if (!finalUrl) {
        return {
          success: false,
          message:
            "Sosyal medya bağlantısı oluşturulamadı.",
        };
      }
    }

    if (
      !/^https?:\/\//i.test(
        finalUrl
      )
    ) {
      return {
        success: false,
        message:
          "Geçerli bir URL oluşturulamadı.",
      };
    }

    const payload = {
      user_id: userId,
      title: finalTitle,
      url: finalUrl,
      position,
      kind,
      username:
        finalUsername,
      updated_at:
        new Date().toISOString(),
    };

    const query =
      linkId
        ? supabase
            .from(
              "profile_links"
            )
            .update(
              payload
            )
            .eq(
              "id",
              linkId
            )
            .eq(
              "user_id",
              userId
            )
            .select("*")
            .single()
        : supabase
            .from(
              "profile_links"
            )
            .insert(
              payload
            )
            .select("*")
            .single();

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.warn(
        "upsertProfileLink:",
        error.message
      );

      return {
        success: false,
        message:
          error.message ||
          "Bağlantı kaydedilemedi.",
      };
    }

    return {
      success: true,
      message:
        "Bağlantı kaydedildi.",
      data:
        data as ProfileLink,
    };
  };

export const deleteProfileLink =
  async (
    userId: string,
    linkId: string
  ) => {
    const {
      error,
    } = await supabase
      .from(
        "profile_links"
      )
      .delete()
      .eq(
        "id",
        linkId
      )
      .eq(
        "user_id",
        userId
      );

    if (error) {
      return {
        success: false,
        message:
          "Bağlantı silinemedi.",
      };
    }

    return {
      success: true,
      message:
        "Bağlantı silindi.",
    };
  };

export const getShowOnlineStatus =
  async (
    userId: string
  ) => {
    if (!userId) {
      return true;
    }

    const {
      data,
      error,
    } = await supabase
      .from("users")
      .select(
        "show_online_status"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (error) {
      console.warn(
        "getShowOnlineStatus:",
        error.message
      );

      return true;
    }

    return (
      data?.show_online_status !==
      false
    );
  };

export const setShowOnlineStatus =
  async (
    userId: string,
    value: boolean
  ) => {
    const {
      error,
    } = await supabase
      .from("users")
      .update({
        show_online_status:
          value,
      })
      .eq(
        "id",
        userId
      );

    if (error) {
      return {
        success: false,
        message:
          "Çevrimiçi görünürlük ayarı kaydedilemedi.",
      };
    }

    return {
      success: true,
      message:
        "Çevrimiçi görünürlük ayarı güncellendi.",
    };
  };

export const changeCurrentPassword =
  async ({
    email,
    currentPassword,
    newPassword,
  }: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }) => {
    if (
      !email ||
      !currentPassword ||
      !newPassword
    ) {
      return {
        success: false,
        message:
          "Tüm şifre alanlarını doldurun.",
      };
    }

    if (
      newPassword.length <
      8
    ) {
      return {
        success: false,
        message:
          "Yeni şifre en az 8 karakter olmalıdır.",
      };
    }

    const {
      error:
        verifyError,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password:
            currentPassword,
        }
      );

    if (verifyError) {
      return {
        success: false,
        message:
          "Mevcut şifre yanlış.",
      };
    }

    const {
      error:
        updateError,
    } =
      await supabase.auth.updateUser(
        {
          password:
            newPassword,
        }
      );

    if (updateError) {
      return {
        success: false,
        message:
          updateError.message ||
          "Şifre değiştirilemedi.",
      };
    }

    return {
      success: true,
      message:
        "Şifreniz başarıyla değiştirildi.",
    };
  };
