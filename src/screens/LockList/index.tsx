import { Platform } from 'react-native';
import { AndroidLockList } from './AndroidLockList';
import { IOSLockList } from './IOSLockList';

export function LockList() {
  return Platform.OS === 'ios' ? <IOSLockList /> : <AndroidLockList />;
}