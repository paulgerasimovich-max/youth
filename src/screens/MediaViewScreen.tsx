// Просмотр фото или видео на весь экран.

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';
import { Button, IconButton } from '../components/ui';
import { useStore } from '../data/store';
import type { ScreenProps } from '../navigation/types';

export function MediaViewScreen({ route, navigation }: ScreenProps<'MediaView'>) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { kind, uri, path, from } = route.params;

  const sendToChat = () => {
    s.sendChat({ media: { id: `fwd-${Date.now()}`, kind, tint: ['#20152E', '#3B2560'], emoji: '', uri, path }, forwardedFrom: from });
    s.showToast('Sent to the chat.');
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, marginTop: insets.top + 56 }}>
        {kind === 'video' ? <Player uri={uri} /> : <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />}
      </View>
      <View style={[styles.close, { top: insets.top + 8 }]}>
        <IconButton icon="close" bg="rgba(255,255,255,0.18)" color={colors.white} onPress={() => navigation.goBack()} label="Close" />
      </View>
      <View style={{ paddingHorizontal: space.xl, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 14) }}>
        {from && path ? <Button title="Send to group chat" icon="arrow-redo" variant="glass" onPress={sendToChat} /> : null}
      </View>
    </View>
  );
}

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" fullscreenOptions={{ enable: true }} />;
}

const styles = StyleSheet.create({
  close: { position: 'absolute', left: space.xl },
});
