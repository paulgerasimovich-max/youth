// Список всех экранов приложения и того, что каждому нужно передать.

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // вход
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  VerifyCode: { email: string; name?: string };
  // основное
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Post: { postId: string };
  EventDetail: { eventId: string };
  EventForm: { eventId?: string } | undefined;
  IdeaForm: undefined;
  AskQuestion: undefined;
  Thread: { threadId: string; asLeader?: boolean };
  // профиль
  MyDetails: undefined;
  Albums: undefined;
  Album: { albumId: string };
  MediaView: { kind: 'photo' | 'video'; uri: string; path?: string; from?: string };
  AlbumForm: undefined;
  Notifications: undefined;
  Privacy: undefined;
  Blocked: undefined;
  // лидерам
  Sermons: undefined;
  SermonForm: undefined;
  Sermon: { sermonId: string };
  PostForm: { sermonId: string; quote: string; day?: string };
  Members: undefined;
  Birthdays: undefined;
  GreetingForm: { userId: string };
  Reports: undefined;
};

export type TabParamList = {
  Home: undefined;
  Chat: undefined;
  Events: undefined;
  Questions: undefined;
  Profile: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    // так React Navigation узнаёт список экранов во всём приложении
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
