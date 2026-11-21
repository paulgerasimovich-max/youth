// Профиль: мои данные, настройки и (для лидеров) инструменты лидера.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radius, space } from '../theme';
import { Avatar, Card, CountDot, Ionicons, RoleBadge, Row, Screen, Segmented, Txt } from '../components/ui';
import { useOverlay } from '../components/overlay';
import { useStore } from '../data/store';
import type { Role } from '../data/types';

export function ProfileScreen() {
  const nav = useNavigation();
  const s = useStore();
  const { openSheet } = useOverlay();
  const me = s.me!;
  const openReports = s.db.reports.filter((r) => !r.resolved).length;

  const confirmDelete = () =>
    openSheet({
      title: 'Delete your account?',
      message: 'Your profile, messages and comments will be removed for good. This can\'t be undone.',
      options: [{ label: 'Yes, delete my account', icon: 'trash-outline', danger: true, onPress: s.deleteAccount }],
      cancelLabel: 'Never mind',
    });

  return (
    <Screen>
      <View style={styles.top}>
        <Avatar user={me} size={88} />
        <Txt v="h1" style={{ marginTop: space.md }}>{me.name}</Txt>
        <View style={{ marginTop: 6 }}>
          {me.role === 'member' ? <Txt v="small">Member</Txt> : <RoleBadge role={me.role} pastor={me.pastor} />}
        </View>
      </View>

      {s.isDemo ? (
        <View style={styles.demo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="flask" size={14} color="#8A6300" />
            <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 11, letterSpacing: 1, color: '#8A6300' }}>DEMO GROUP · SEE THE APP AS</Text>
          </View>
          <Segmented<Role>
            value={me.role}
            onChange={s.setDemoRole}
            options={[
              { value: 'member', label: 'Member' },
              { value: 'leader', label: 'Leader' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </View>
      ) : null}

      {s.isLeader ? (
        <>
          <Txt v="label" style={styles.groupLabel}>Leader tools</Txt>
          <Card style={styles.group}>
            <Row icon="book" iconBg={colors.sunSoft} iconColor="#8A6300" title="Sermons and daily posts" subtitle="Plan the word for each day" onPress={() => nav.navigate('Sermons')} />
            <Row icon="people" iconBg={colors.plumSoft} iconColor={colors.plum} title="Members" subtitle={s.db.users.length === 1 ? '1 person' : `${s.db.users.length} people`} onPress={() => nav.navigate('Members')} />
            <Row icon="gift" iconBg={colors.accentSoft} iconColor={colors.accent} title="Birthdays" subtitle="See who's next and send a note" onPress={() => nav.navigate('Birthdays')} />
            <Row
              icon="flag" iconBg={colors.dangerSoft} iconColor={colors.danger} title="Reports" subtitle="Things people flagged" last
              onPress={() => nav.navigate('Reports')}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CountDot count={openReports} />
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              }
            />
          </Card>
        </>
      ) : null}

      <Txt v="label" style={styles.groupLabel}>Me</Txt>
      <Card style={styles.group}>
        <Row icon="person" title="My details" onPress={() => nav.navigate('MyDetails')} />
        <Row icon="images" title="Photos and videos" subtitle={`${s.db.albums.length} albums`} onPress={() => nav.navigate('Albums')} />
        <Row icon="notifications" title="Notifications" onPress={() => nav.navigate('Notifications')} />
        <Row icon="shield-checkmark" title="Privacy" onPress={() => nav.navigate('Privacy')} />
        <Row icon="heart" title="Group rules" onPress={() => nav.navigate('Rules')} />
        <Row icon="hand-left" title="Blocked people" subtitle={s.blocked.length ? `${s.blocked.length} blocked` : undefined} last onPress={() => nav.navigate('Blocked')} />
      </Card>

      <Card style={[styles.group, { marginTop: space.lg }]}>
        <Row icon="log-out-outline" title="Sign out" onPress={s.signOut} right={<View />} />
        <Row icon="trash-outline" title="Delete account" danger last onPress={confirmDelete} right={<View />} />
      </Card>

      <Txt v="small" center style={{ marginTop: space.xl }}>{s.isDemo ? 'Woodmark Youth · demo mode' : 'Woodmark Youth'}</Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.xl },
  demo: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.sun, backgroundColor: colors.sunSoft, borderRadius: radius.lg, padding: 12,
  },
  groupLabel: { marginTop: space.xxl, marginBottom: space.sm, marginLeft: 4 },
  group: { paddingVertical: 4 },
});
