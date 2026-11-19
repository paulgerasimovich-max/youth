// Анонимные вопросы. Участник видит свои диалоги, лидер — все вопросы группы.

import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, gradients, radius, space } from '../theme';
import { Avatar, Button, Card, CountDot, Empty, Ionicons, Screen, Segmented, Txt, shadow } from '../components/ui';
import { useStore } from '../data/store';
import { deletesInLabel, timeAgo } from '../lib/dates';
import type { AnonThread } from '../data/types';

export function QuestionsScreen() {
  const { isLeader } = useStore();
  return isLeader ? <LeaderInbox /> : <MemberQuestions />;
}

// ---------- Участник ----------
function MemberQuestions() {
  const nav = useNavigation();
  const s = useStore();
  return (
    <Screen>
      <View style={styles.top}>
        <Txt v="display">Ask anything</Txt>
      </View>

      <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow]}>
        <View style={styles.heroIcon}>
          <Ionicons name="eye-off" size={22} color={colors.ink} />
        </View>
        <Text style={styles.heroTitle}>No one will know{'\n'}it's you.</Text>
        <Txt v="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>
          Not the leaders. Not even the people who built this app. Ask about anything: a struggle, a doubt, a hard day.
        </Txt>
        <View style={{ marginTop: space.lg, gap: 10 }}>
          {[
            'No name and no account attached',
            'All leaders see it, so you get a real answer',
            'Gone 7 days after the last message',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.sun} />
              <Txt v="bodyBold" color={colors.white} style={{ flex: 1, fontSize: 14 }}>{line}</Txt>
            </View>
          ))}
        </View>
        <Button title="Ask a question" icon="create" variant="white" onPress={() => nav.navigate('AskQuestion')} style={{ marginTop: space.xl }} />
      </LinearGradient>

      <Txt v="h2" style={{ marginTop: space.xxl, marginBottom: space.md }}>Your questions</Txt>
      {s.myThreads.length === 0 ? (
        <Card>
          <Empty emoji="🤫" title="Nothing here yet" text="When you ask something, it shows up here. Only on this phone." />
        </Card>
      ) : (
        <>
          {s.myThreads.map((t) => <MyThreadCard key={t.id} thread={t} />)}
          <Txt v="small" style={{ marginTop: 2 }}>
            These live only on this phone. If you switch phones or delete the app, they're gone.
          </Txt>
        </>
      )}

      <Card bg={colors.dangerSoft} style={{ marginTop: space.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="heart" size={20} color={colors.danger} />
          <Txt v="title">Need help right now?</Txt>
        </View>
        <Txt v="body" style={{ marginTop: 6 }}>
          If you're in danger or thinking about hurting yourself, please don't wait for a reply here.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
          <Button title="Call or text 988" icon="call" variant="dark" small style={{ flex: 1.7, paddingHorizontal: 10 }} onPress={() => Linking.openURL('tel:988')} />
          <Button title="Call 911" variant="white" small style={{ flex: 1, paddingHorizontal: 10 }} onPress={() => Linking.openURL('tel:911')} />
        </View>
      </Card>
    </Screen>
  );
}

function MyThreadCard({ thread }: { thread: AnonThread }) {
  const nav = useNavigation();
  const s = useStore();
  const unseen = s.unseenReplies(thread);
  const last = thread.messages[thread.messages.length - 1];
  const lastLeader = [...thread.messages].reverse().find((m) => m.from !== 'asker');
  const status =
    thread.status === 'closed' ? { text: 'Closed', bg: colors.line, fg: colors.inkSoft }
    : last.from === 'asker' ? { text: 'Waiting for a reply', bg: colors.sunSoft, fg: '#8A6300' }
    : { text: `${s.nameOf(last.from).split(' ')[0]} replied`, bg: colors.greenSoft, fg: colors.green };
  return (
    <Card onPress={() => nav.navigate('Thread', { threadId: thread.id })} style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: status.fg }}>{status.text}</Text>
        </View>
        {unseen > 0 ? <CountDot count={unseen} /> : null}
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      <Txt v="bodyBold" numberOfLines={2} style={{ marginTop: 10 }}>{thread.messages[0].body}</Txt>
      {lastLeader ? (
        <Txt v="small" numberOfLines={1} style={{ marginTop: 4 }}>
          {s.nameOf(lastLeader.from).split(' ')[0]}: {lastLeader.body}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <Ionicons name="timer-outline" size={14} color={colors.muted} />
        <Txt v="small">{deletesInLabel(thread.lastMessageAt)}</Txt>
      </View>
    </Card>
  );
}

// ---------- Лидер ----------
function LeaderInbox() {
  const nav = useNavigation();
  const s = useStore();
  const [tab, setTab] = useState<'open' | 'all'>('open');
  const needsReply = (t: AnonThread) => t.status === 'open' && t.messages[t.messages.length - 1].from === 'asker';
  const all = [...s.db.threads].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  const list = tab === 'open' ? all.filter(needsReply) : all;

  return (
    <Screen>
      <View style={styles.top}>
        <Txt v="display">Questions</Txt>
        <Txt v="body" style={{ marginTop: 4 }}>Anonymous. Every leader sees these, and any of you can answer.</Txt>
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'open', label: 'Need a reply', badge: s.unansweredCount },
          { value: 'all', label: 'All' },
        ]}
      />
      <View style={{ height: space.lg }} />
      {list.length === 0 ? (
        <Empty emoji="🙌" title="All caught up" text="No one is waiting for a reply." />
      ) : (
        list.map((t) => {
          const waiting = needsReply(t);
          const last = t.messages[t.messages.length - 1];
          return (
            <Card key={t.id} onPress={() => nav.navigate('Thread', { threadId: t.id, asLeader: true })} style={{ marginBottom: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Avatar size={40} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt v="smallBold" style={{ flex: 1 }}>Anonymous</Txt>
                    <Txt v="small">{timeAgo(t.lastMessageAt)}</Txt>
                  </View>
                  <Txt v="body" numberOfLines={3} style={{ marginTop: 2 }}>{t.messages[0].body}</Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md }}>
                {t.status === 'closed' ? (
                  <Tag text="Closed" bg={colors.line} fg={colors.inkSoft} />
                ) : waiting ? (
                  <Tag text="Needs a reply" bg={colors.accentSoft} fg={colors.accent} />
                ) : (
                  <Tag text={`${last.from === s.me!.id ? 'You' : s.nameOf(last.from).split(' ')[0]} replied`} bg={colors.greenSoft} fg={colors.green} />
                )}
                {t.preferredLeaderId ? (
                  <Tag
                    text={t.preferredLeaderId === s.me!.id ? 'Asked for you' : `Asked for ${s.nameOf(t.preferredLeaderId).split(' ')[0]}`}
                    bg={colors.plumSoft}
                    fg={colors.plum}
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function Tag({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={[styles.status, { backgroundColor: bg }]}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: fg }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: space.lg, paddingBottom: space.lg },
  hero: { borderRadius: radius.xl, padding: space.xl },
  heroIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.white, marginTop: space.md, letterSpacing: -0.3 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
