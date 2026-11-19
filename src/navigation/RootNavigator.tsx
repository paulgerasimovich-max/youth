// Вся навигация: экраны входа, пять вкладок и внутренние экраны.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useStore } from '../data/store';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { VerifyCodeScreen } from '../screens/auth/VerifyCodeScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PostScreen } from '../screens/PostScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { EventFormScreen } from '../screens/EventFormScreen';
import { IdeaFormScreen } from '../screens/IdeaFormScreen';
import { QuestionsScreen } from '../screens/QuestionsScreen';
import { AskQuestionScreen } from '../screens/AskQuestionScreen';
import { ThreadScreen } from '../screens/ThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyDetailsScreen } from '../screens/profile/MyDetailsScreen';
import { AlbumFormScreen, AlbumScreen, AlbumsScreen } from '../screens/profile/AlbumScreens';
import { BlockedScreen, NotificationsScreen, PrivacyScreen } from '../screens/profile/SettingsScreens';
import { PostFormScreen, SermonFormScreen, SermonScreen, SermonsScreen } from '../screens/leader/SermonScreens';
import { BirthdaysScreen, GreetingFormScreen, MembersScreen } from '../screens/leader/PeopleScreens';
import { ReportsScreen } from '../screens/leader/ReportsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Questions" component={QuestionsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { me } = useStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!me ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Post" component={PostScreen} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} />
          <Stack.Screen name="EventForm" component={EventFormScreen} />
          <Stack.Screen name="IdeaForm" component={IdeaFormScreen} />
          <Stack.Screen name="AskQuestion" component={AskQuestionScreen} />
          <Stack.Screen name="Thread" component={ThreadScreen} />
          <Stack.Screen name="MyDetails" component={MyDetailsScreen} />
          <Stack.Screen name="Albums" component={AlbumsScreen} />
          <Stack.Screen name="Album" component={AlbumScreen} />
          <Stack.Screen name="AlbumForm" component={AlbumFormScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Blocked" component={BlockedScreen} />
          <Stack.Screen name="Sermons" component={SermonsScreen} />
          <Stack.Screen name="SermonForm" component={SermonFormScreen} />
          <Stack.Screen name="Sermon" component={SermonScreen} />
          <Stack.Screen name="PostForm" component={PostFormScreen} />
          <Stack.Screen name="Members" component={MembersScreen} />
          <Stack.Screen name="Birthdays" component={BirthdaysScreen} />
          <Stack.Screen name="GreetingForm" component={GreetingFormScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
