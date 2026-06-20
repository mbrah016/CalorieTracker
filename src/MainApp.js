import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './screens/HomeScreen';
import MealLogScreen from './screens/MealLogScreen';
import ExerciseLogScreen from './screens/ExerciseLogScreen';

const Stack = createStackNavigator();

export default function MainApp() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#080f1a' },
            headerTintColor: '#f1f5f9',
            cardStyle: { backgroundColor: '#080f1a' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '🥗 CalorieTracker' }} />
          <Stack.Screen name="MealLog" component={MealLogScreen} options={{ title: 'Log Meal' }} />
          <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} options={{ title: 'Log Exercise' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
