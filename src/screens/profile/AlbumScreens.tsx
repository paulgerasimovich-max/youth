// Фото и видео: список альбомов, альбом, создание альбома (лидер).

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Button, Card, Empty, Field, Header, IconButton, Ionicons, MediaTile, Screen, Txt } from '../../components/ui';
import { useOverlay } from '../../components/overlay';
import { useStore } from '../../data/store';
import { formatDayShort } from '../../lib/dates';
import type { MediaItem } from '../../data/types';
import type { ScreenProps } from '../../navigation/types';

export function AlbumsScreen({ navigation }: ScreenProps<'Albums'>) {
  const s = useStore();
  return (
    <Screen padded={false}>
      <Header
        title="Photos and videos"
        right={s.isLeader ? <IconButton icon="add" bg={colors.accent} color={colors.white} onPress={() => navigation.navigate('AlbumForm')} label="New album" /> : undefined}
      />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {s.db.albums.length === 0 ? <Empty emoji="📷" title="No albums yet" /> : null}
        {s.db.albums.map((album) => (
          <Card key={album.id} onPress={() => navigation.navigate('Album', { albumId: album.id })} style={{ padding: 10, marginBottom: space.lg }}>
            <View style={{ flexDirection: 'row', gap: 6, height: 150 }}>
              {album.items[0] ? <MediaTile item={album.items[0]} style={{ flex: 1.4 }} big /> : null}
              <View style={{ flex: 1, gap: 6 }}>
                {album.items[1] ? <MediaTile item={album.items[1]} style={{ flex: 1 }} /> : null}
                {album.items[2] ? <MediaTile item={album.items[2]} style={{ flex: 1 }} /> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Txt v="title">{album.title}</Txt>
                <Txt v="small">{formatDayShort(album.date)} · {album.items.length} items · by {s.nameOf(album.createdBy).split(' ')[0]}</Txt>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export function AlbumScreen({ route, navigation }: ScreenProps<'Album'>) {
  const s = useStore();
  const { openSheet } = useOverlay();
  const album = s.db.albums.find((a) => a.id === route.params.albumId);
  if (!album) {
    return (
      <Screen padded={false}>
        <Header />
        <Empty emoji="🤷" title="This album is gone" />
      </Screen>
    );
  }
  const open = (item: MediaItem) => {
    if (item.uri) {
      navigation.navigate('MediaView', { kind: item.kind, uri: item.uri, path: item.path, from: album.title });
      return;
    }
    openSheet({
      header: <MediaTile item={item} style={{ height: 300, marginBottom: space.md }} round={radius.lg} big />,
      options: [
        {
          label: 'Send to group chat', icon: 'arrow-redo-outline',
          onPress: () => { s.sendChat({ media: item, forwardedFrom: album.title }); s.showToast('Sent to the chat.'); },
        },
        { label: 'Save to my phone', icon: 'download-outline', onPress: () => s.showToast('Saved to your photos.') },
      ],
      cancelLabel: 'Close',
    });
  };
  const photos = album.items.filter((i) => i.kind === 'photo').length;
  const videos = album.items.length - photos;
  return (
    <Screen padded={false}>
      <Header />
      <View style={{ paddingHorizontal: space.xl }}>
        <Txt v="display">{album.title}</Txt>
        <Txt v="small" style={{ marginTop: 4, marginBottom: space.lg }}>
          {formatDayShort(album.date)} · {photos} photos{videos ? ` · ${videos} videos` : ''} · by {s.nameOf(album.createdBy).split(' ')[0]}
        </Txt>
        <View style={styles.grid}>
          {album.items.map((item) => (
            <Pressable key={item.id} onPress={() => open(item)} style={styles.cell}>
              <MediaTile item={item} style={{ flex: 1 }} round={radius.sm + 4} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

export function AlbumFormScreen({ navigation }: ScreenProps<'AlbumForm'>) {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const add = async (kind: 'photo' | 'video') => {
    const picked = await s.pickMedia(kind, kind === 'photo');
    if (picked.length > 0) setItems((x) => [...x, ...picked]);
  };
  const publish = () => {
    s.addAlbum(title.trim(), items);
    if (s.isDemo) s.showToast('Album is up!');
    navigation.goBack();
  };
  return (
    <Screen padded={false}>
      <Header title="New album" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        <Field label="Album name" placeholder="Fall Retreat" value={title} onChangeText={setTitle} />
        <Txt v="label" style={{ marginBottom: 8 }}>Photos and videos</Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: space.md }}>
          <Button title="Add photos" icon="image" variant="soft" small style={{ flex: 1 }} onPress={() => add('photo')} />
          <Button title="Add a video" icon="videocam" variant="soft" small style={{ flex: 1 }} onPress={() => add('video')} />
        </View>
        {items.length === 0 ? (
          <View style={styles.drop}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.muted} />
            <Txt v="small" center>Nothing added yet</Txt>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {items.map((item) => (
                <Pressable key={item.id} onPress={() => setItems((x) => x.filter((i) => i.id !== item.id))} style={styles.cell}>
                  <MediaTile item={item} style={{ flex: 1 }} round={radius.sm + 4} />
                  <View style={styles.remove}>
                    <Ionicons name="close" size={12} color={colors.white} />
                  </View>
                </Pressable>
              ))}
            </View>
            <Txt v="small" style={{ marginTop: 8 }}>Tap one to remove it.</Txt>
          </>
        )}
        <Button title="Post album" onPress={publish} disabled={!title.trim() || items.length === 0} style={{ marginTop: space.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 3 },
  drop: {
    height: 140, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  remove: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
});
