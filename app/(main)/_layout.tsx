import {
  Stack,
  Tabs,
} from "expo-router";

function MainTabs() {
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
    </Tabs>
  );
}

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="storyShare"
      />

      <Stack.Screen
        name="editProfile"
      />

      <Stack.Screen
        name="profileSettings"
      />

      <Stack.Screen
        name="notifications"
      />

      <Stack.Screen
        name="storyViewer"
        options={{
          presentation:
            "fullScreenModal",
          animation:
            "fade",
        }}
      />

      <Stack.Screen
        name="followList"
      />

      <Stack.Screen
        name="postDetails"
        options={{
          presentation:
            "modal",
        }}
      />

      <Stack.Screen
        name="yonetim"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
