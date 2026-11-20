// Вся навигация: экраны входа, пять вкладок и внутренние экраны.

import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useStore } from '../data/store';
import { onPushOpened } from '../lib/push';
import { TabBar } from './TabBar';
import { TabBarHeightProvider } from './tabBarHeight';
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
import { MediaViewScreen } from '../screens/MediaViewScreen';
import { NameScreen } from '../screens/auth/NameScreen';
import { AgreeScreen } from '../screens/auth/AgreeScreen';
import { RulesScreen } from '../screens/RulesScreen';
import { BlockedScreen, NotificationsScreen, PrivacyScreen } from '../screens/profile/SettingsScreens';
import { PostFormScreen, SermonFormScreen, SermonScreen, SermonsScreen } from '../screens/leader/SermonScreens';
import { BirthdaysScreen, GreetingFormScreen, MembersScreen } from '../screens/leader/PeopleScreens';
import { ReportsScreen } from '../screens/leader/ReportsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<TabParamList>();

function Tabs() {
  return (
    // Разделы перелистываются свайпом влево-вправо (меню при этом остаётся внизу).
    // В чате перелистывание выключено: там свайп по сообщению означает «ответить».
    <TabBarHeightProvider>
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ swipeEnabled: true, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ swipeEnabled: false }} />
        <Tab.Screen name="Events" component={EventsScreen} />
        <Tab.Screen name="Questions" component={QuestionsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </TabBarHeightProvider>
  );
}

export function RootNavigator() {
  const { me, needsName, needsAgreement } = useStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const signedIn = !!me && !needsName && !needsAgreement;

  // Нажали на уведомление — открываем то, о чём оно: чат, пост дня или событие
  useEffect(() => {
    if (!signedIn) return;
    return onPushOpened((data) => {
      setTimeout(() => {
        if (data.type === 'chat') navigation.navigate('Tabs', { screen: 'Chat' });
        else if (data.type === 'post' && data.id) navigation.navigate('Post', { postId: data.id });
        else if (data.type === 'event' && data.id) navigation.navigate('EventDetail', { eventId: data.id });
        else if (data.type === 'report') navigation.navigate('Reports');
        else navigation.navigate('Tabs', { screen: 'Home' });
      }, 300); // даём экранам появиться, если приложение только что открылось
    });
  }, [signedIn, navigation]);

  if (me && needsName) return <NameScreen />;
  if (me && needsAgreement) return <AgreeScreen />;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!me ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="Rules" component={RulesScreen} />
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
          <Stack.Screen name="MediaView" component={MediaViewScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="AlbumForm" component={AlbumFormScreen} />
          <Stack.Screen name="Rules" component={RulesScreen} />
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
