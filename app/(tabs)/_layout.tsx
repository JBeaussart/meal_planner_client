import { Tabs, useRouter } from 'expo-router'
import React from 'react'
import { FontAwesome } from '@expo/vector-icons'

export default function TabsLayout() {
  const router = useRouter()
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color, size }) => <FontAwesome name="calendar" size={size ?? 18} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recettes',
          tabBarIcon: ({ color, size }) => <FontAwesome name="cutlery" size={size ?? 18} color={color as string} />,
        }}
        listeners={{
          tabPress: () => {
            // Always go to the recipes index when pressing the tab
            router.replace('/(tabs)/recipes')
          },
        }}
      />
    </Tabs>
  )
}
