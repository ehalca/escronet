import notifee, { AndroidImportance } from "@notifee/react-native";
import React from "react";
import {
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

async function testNotification(): Promise<void> {
  try {
    const channelId = await notifee.createChannel({
      id: "test",
      name: "Test",
      importance: AndroidImportance.HIGH,
    });
    const id = await notifee.displayNotification({
      id: `test_${Date.now()}`,
      title: "Test notification",
      body: "Notifee is working",
      android: { channelId, importance: AndroidImportance.HIGH },
    });
    console.log("[Test] Notification posted, id:", id);
  } catch (err) {
    console.error("[Test] Failed:", err);
  }
}

export function App(): React.JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 24,
        }}
      >
        <Text
          style={{ color: "#E0E1DD", fontSize: 28, fontWeight: "700" }}
        >
          Escronet
        </Text>
        <TouchableOpacity
          onPress={testNotification}
          style={{
            backgroundColor: "#1B4F72",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#E0E1DD", fontSize: 16 }}>
            Test Notification
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
