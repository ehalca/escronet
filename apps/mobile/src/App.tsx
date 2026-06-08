import notifee, { AndroidImportance } from "@notifee/react-native";
import React from "react";
import { SafeAreaView, StatusBar, Text, View } from "react-native";
import {
  Button,
  ButtonText,
  GluestackProvider,
  Heading,
} from "@escronet/shared-ui";

async function testNotification(): Promise<void> {
  try {
    const channelId = await notifee.createChannel({
      id: "test",
      name: "Test",
      importance: AndroidImportance.HIGH,
    });
    await notifee.displayNotification({
      id: `test_${Date.now()}`,
      title: "Test notification",
      body: "Notifee is working",
      android: { channelId, importance: AndroidImportance.HIGH },
    });
  } catch (err) {
    console.error("[Test] Failed:", err);
  }
}

export function App(): React.JSX.Element {
  return (
    <GluestackProvider>
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
          <Text style={{ color: "white" }}>jora</Text>
          <Heading size="xl" className="text-white">
            Escronet 22
          </Heading>
          <Button
            onPress={testNotification}
            variant="solid"
            action="negative"
            className="border-2 border-white text-white"
          >
            <ButtonText>Test Notification 2</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    </GluestackProvider>
  );
}
