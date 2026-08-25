import {
  Tabs,
} from "expo-router";

export default function TabsLayout() {
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
      />

      <Tabs.Screen
        name="search"
      />

      <Tabs.Screen
        name="newPosts"
      />

      <Tabs.Screen
        name="dm"
      />

      <Tabs.Screen
        name="profile"
      />
    </Tabs>
  );
}
