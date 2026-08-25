import { supabase } from "@/lib/supabase";

export interface ProfileLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  position: number;
  created_at: string;
  updated_at: string;
}

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export const getProfileLinks = async (
  userId: string
): Promise<ProfileLink[]> => {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("profile_links")
    .select(
      "id,user_id,title,url,position,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(
      "getProfileLinks:",
      error.message
    );

    return [];
  }

  return (data || []) as ProfileLink[];
};

export const upsertProfileLink = async ({
  userId,
  title,
  url,
  linkId,
  position = 0,
}: {
  userId: string;
  title: string;
  url: string;
  linkId?: string;
  position?: number;
}) => {
  const cleanTitle = title.trim();
  const cleanUrl = normalizeUrl(url);

  if (!userId || !cleanTitle || !cleanUrl) {
    return {
      success: false,
      message: "Başlık ve bağlantı zorunludur.",
    };
  }

  if (!/^https?:\/\//i.test(cleanUrl)) {
    return {
      success: false,
      message: "Geçerli bir bağlantı girin.",
    };
  }

  if (cleanTitle.length > 80) {
    return {
      success: false,
      message: "Bağlantı başlığı en fazla 80 karakter olabilir.",
    };
  }

  const payload = {
    user_id: userId,
    title: cleanTitle,
    url: cleanUrl,
    position,
    updated_at: new Date().toISOString(),
  };

  const query = linkId
    ? supabase
        .from("profile_links")
        .update(payload)
        .eq("id", linkId)
        .eq("user_id", userId)
        .select("*")
        .single()
    : supabase
        .from("profile_links")
        .insert(payload)
        .select("*")
        .single();

  const { data, error } = await query;

  if (error) {
    console.warn(
      "upsertProfileLink:",
      error.message
    );

    return {
      success: false,
      message: "Bağlantı kaydedilemedi.",
    };
  }

  return {
    success: true,
    message: "Bağlantı kaydedildi.",
    data: data as ProfileLink,
  };
};

export const deleteProfileLink = async (
  userId: string,
  linkId: string
) => {
  const { error } = await supabase
    .from("profile_links")
    .delete()
    .eq("id", linkId)
    .eq("user_id", userId);

  if (error) {
    console.warn(
      "deleteProfileLink:",
      error.message
    );

    return {
      success: false,
      message: "Bağlantı silinemedi.",
    };
  }

  return {
    success: true,
    message: "Bağlantı silindi.",
  };
};

export const getShowOnlineStatus = async (
  userId: string
) => {
  if (!userId) {
    return true;
  }

  const { data, error } = await supabase
    .from("users")
    .select("show_online_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "getShowOnlineStatus:",
      error.message
    );

    return true;
  }

  return data?.show_online_status !== false;
};

export const setShowOnlineStatus = async (
  userId: string,
  value: boolean
) => {
  const { error } = await supabase
    .from("users")
    .update({
      show_online_status: value,
    })
    .eq("id", userId);

  if (error) {
    console.warn(
      "setShowOnlineStatus:",
      error.message
    );

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

export const changeCurrentPassword = async ({
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

  if (newPassword.length < 8) {
    return {
      success: false,
      message:
        "Yeni şifre en az 8 karakter olmalıdır.",
    };
  }

  /*
   * Repo'nun mevcut Supabase JS sürümü eski olduğu
   * için updateUser({ password, currentPassword })
   * kullanmıyoruz.
   *
   * Önce mevcut şifreyle tekrar giriş yapıyoruz.
   * Başarılıysa yeni şifreyi kaydediyoruz.
   */

  const {
    error: verifyError,
  } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      success: false,
      message: "Mevcut şifre yanlış.",
    };
  }

  const {
    error: updateError,
  } = await supabase.auth.updateUser({
    password: newPassword,
  });

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
