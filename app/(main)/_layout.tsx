import {
  Tabs,
} from "expo-router";

import BottomNav from "@/components/BottomNav";

export default function MainLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
        animation: "none",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Ana Sayfa",
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Keşfet",
        }}
      />

      <Tabs.Screen
        name="newPosts"
        options={{
          title: "Yeni",
        }}
      />

      <Tabs.Screen
        name="dm"
        options={{
          title: "Mesajlar",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />

      <Tabs.Screen
        name="storyShare"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="editProfile"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profileSettings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="storyViewer"
        options={{
          href: null,
          presentation:
            "fullScreenModal",
          animation:
            "fade",
        }}
      />

      <Tabs.Screen
        name="followList"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="postDetails"
        options={{
          href: null,
          presentation:
            "modal",
        }}
      />
    </Tabs>
  );
}
