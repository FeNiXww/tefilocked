import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type MainTabParamList = {
  Home: undefined;
  Insights: undefined;
  LockList: undefined;
  Settings: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  EditGender: undefined;
  EditRegion: undefined;
  About: undefined;
  Terms: undefined;
  Privacy: undefined;
};

export type SettingsScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList, 'Settings'>
>;