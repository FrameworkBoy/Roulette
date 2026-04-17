import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';
import { Colors } from '../constants/colors';
import { PRIZES } from '../config/prizes';
import { PrizeService } from '../services/PrizeService';
import { SessionService } from '../services/SessionService';
import type { Session } from '../types/session';
import type { ScreenProps } from '../types/navigation';

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportToExcel(
  sessions: Session[],
  stockMap: Map<string, number | 'unlimited'>,
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const sessionRows = sessions.map((s) => ({
    ID: s.id,
    Início: s.startedAt,
    Fim: s.endedAt ?? '',
    Motivo_Fim: s.endReason ?? '',
    Quiz_Nota: s.quiz ? `${s.quiz.score}/${s.quiz.total}` : '',
    Quiz_Elegível: s.quiz ? (s.quiz.eligible ? 'Sim' : 'Não') : '',
    Prêmio_ID: s.spin?.prizeId ?? '',
    Prêmio: s.spin?.prizeLabel ?? '',
    Prêmio_Em: s.spin?.spunAt ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessionRows), 'Sessões');

  const answerRows: Record<string, unknown>[] = [];
  for (const s of sessions) {
    for (const a of s.quiz?.answers ?? []) {
      answerRows.push({
        Sessão_ID: s.id,
        Questão_ID: a.questionId,
        Questão: a.question,
        Resposta: a.selectedLabel,
        Correta: a.correctLabel,
        Acertou: a.isCorrect ? 'Sim' : 'Não',
        Em: a.answeredAt,
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(answerRows), 'Respostas Quiz');

  const eventRows: Record<string, unknown>[] = [];
  for (const s of sessions) {
    for (const e of s.events) {
      eventRows.push({
        Sessão_ID: s.id,
        Tipo: e.type,
        Timestamp: e.timestamp,
        Metadados: e.metadata ? JSON.stringify(e.metadata) : '',
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eventRows), 'Eventos');

  // Sheet 4: Prize summary with stock
  const totalSpins = sessions.filter((s) => s.spin).length;
  const prizeCountMap = new Map<string, { label: string; count: number }>();
  for (const s of sessions) {
    if (!s.spin) continue;
    const { prizeId, prizeLabel } = s.spin;
    const entry = prizeCountMap.get(prizeId) ?? { label: prizeLabel, count: 0 };
    prizeCountMap.set(prizeId, { ...entry, count: entry.count + 1 });
  }
  for (const p of PRIZES) {
    if (!prizeCountMap.has(p.id)) prizeCountMap.set(p.id, { label: p.label, count: 0 });
  }
  const prizeRows = [...prizeCountMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, v]) => {
      const remaining = stockMap.get(id);
      return {
        Prêmio: v.label,
        Distribuídos: v.count,
        Percentual: totalSpins > 0 ? `${Math.round((v.count / totalSpins) * 100)}%` : '0%',
        Estoque_Restante:
          remaining === undefined ? '' : remaining === 'unlimited' ? 'Ilimitado' : remaining,
      };
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prizeRows), 'Prêmios');

  const filename = `sessoes_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, filename);
    return;
  }

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar sessões',
    });
  } else {
    Alert.alert('Arquivo salvo', uri);
  }
}

// ─── Stats computation ────────────────────────────────────────────────────────

function computeStats(sessions: Session[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.startedAt.startsWith(todayStr));

  // Funnel
  const startedQuiz = sessions.filter((s) => s.quiz).length;
  const completedQuiz = sessions.filter((s) => s.quiz?.completedAt).length;
  const eligible = sessions.filter((s) => s.quiz?.eligible).length;
  const spun = sessions.filter((s) => s.spin).length;

  // Prizes
  const prizeMap = new Map<string, { label: string; count: number }>();
  for (const s of sessions) {
    if (!s.spin) continue;
    const { prizeId, prizeLabel } = s.spin;
    const entry = prizeMap.get(prizeId) ?? { label: prizeLabel, count: 0 };
    prizeMap.set(prizeId, { ...entry, count: entry.count + 1 });
  }
  // Ensure every prize appears (even 0)
  for (const p of PRIZES) {
    if (!prizeMap.has(p.id)) prizeMap.set(p.id, { label: p.label, count: 0 });
  }
  const prizeStats = [...prizeMap.entries()]
    .map(([id, v]) => ({ id, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);
  const totalPrizes = prizeStats.reduce((sum, p) => sum + p.count, 0);
  const realPrizes = prizeStats
    .filter((p) => p.id !== 'no-prize')
    .reduce((sum, p) => sum + p.count, 0);

  // Unit clicks
  const unitMap = new Map<string, { name: string; count: number }>();
  for (const s of sessions) {
    for (const e of s.events) {
      if (e.type === 'unit_opened' && e.metadata) {
        const id = e.metadata.unitId as string;
        const name = (e.metadata.unitName ?? e.metadata.unitId) as string;
        const entry = unitMap.get(id) ?? { name, count: 0 };
        unitMap.set(id, { ...entry, count: entry.count + 1 });
      }
    }
  }
  const unitStats = [...unitMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);

  // Avg session duration — only sessions that collected a prize
  const completedMs: number[] = [];
  for (const s of sessions) {
    if (s.spin && s.endedAt) {
      const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
      if (ms > 0) completedMs.push(ms);
    }
  }
  const avgDurationMs =
    completedMs.length > 0
      ? completedMs.reduce((a, b) => a + b, 0) / completedMs.length
      : null;

  // Quiz performance
  const quizScores = sessions
    .filter((s) => s.quiz?.completedAt)
    .map((s) => (s.quiz!.score / s.quiz!.total) * 100);
  const avgQuizScore =
    quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : null;

  // Peak hour
  const hourCounts: Record<number, number> = {};
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const peakHour =
    sessions.length > 0
      ? Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
      : null;

  // Inactivity rate
  const inactivityEnded = sessions.filter((s) => s.endReason === 'inactivity').length;

  return {
    total: sessions.length,
    today: todaySessions.length,
    startedQuiz,
    completedQuiz,
    eligible,
    spun,
    prizeStats,
    totalPrizes,
    realPrizes,
    unitStats,
    avgDurationMs,
    completedCount: completedMs.length,
    avgQuizScore,
    peakHour,
    inactivityEnded,
  };
}

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

// ─── UI building blocks ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function FunnelRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const width = total > 0 ? `${(count / total) * 100}%` : '0%';
  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelLabelRow}>
        <Text style={styles.funnelLabel}>{label}</Text>
        <Text style={styles.funnelCount}>
          {count} <Text style={styles.funnelPct}>({pct(count, total)})</Text>
        </Text>
      </View>
      <View style={styles.funnelBarBg}>
        <View style={[styles.funnelBar, { width: width as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function PrizeRow({
  label,
  count,
  total,
  remaining,
  isNoPrize,
}: {
  label: string;
  count: number;
  total: number;
  remaining: number | 'unlimited' | undefined;
  isNoPrize: boolean;
}) {
  const stockLabel =
    remaining === undefined
      ? '—'
      : remaining === 'unlimited'
      ? '∞'
      : String(remaining);
  const stockColor =
    remaining === 'unlimited' || remaining === undefined
      ? Colors.textSecondary
      : remaining === 0
      ? Colors.error
      : remaining <= 5
      ? '#F59E0B'
      : Colors.success;

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, isNoPrize && { color: Colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.tableCellNum, isNoPrize && { color: Colors.textSecondary }]}>
        {count}
      </Text>
      <Text style={styles.tableCellPct}>{pct(count, total)}</Text>
      <Text style={[styles.tableCellNum, { color: stockColor }]}>{stockLabel}</Text>
    </View>
  );
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(session.startedAt);
  const dateStr = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.sessionRow, pressed && { opacity: 0.85 }]}
      onPress={() => setExpanded((v) => !v)}
    >
      <View style={styles.sessionRowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionRowDate}>{dateStr}</Text>
          <Text style={styles.sessionRowId}>{session.id}</Text>
        </View>
        <View style={styles.sessionRowBadges}>
          {session.quiz && (
            <View
              style={[
                styles.badge,
                session.quiz.eligible ? styles.badgeGreen : styles.badgeRed,
              ]}
            >
              <Text style={styles.badgeText}>
                {session.quiz.score}/{session.quiz.total}
              </Text>
            </View>
          )}
          {session.spin && (
            <View style={styles.badgePurple}>
              <Text style={styles.badgeText}>🎰</Text>
            </View>
          )}
          {session.endReason === 'inactivity' && (
            <View style={styles.badgeOrange}>
              <Text style={styles.badgeText}>⏱</Text>
            </View>
          )}
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {expanded && (
        <View style={styles.sessionDetail}>
          {session.spin && (
            <Text style={styles.detailLine}>🎁 Prêmio: {session.spin.prizeLabel}</Text>
          )}
          {session.quiz && (
            <>
              <Text style={styles.detailLine}>
                📝 Quiz: {session.quiz.score}/{session.quiz.total} —{' '}
                {session.quiz.eligible ? 'Elegível' : 'Não elegível'}
              </Text>
              {session.quiz.answers.map((a, i) => (
                <Text key={i} style={styles.detailAnswer}>
                  {a.isCorrect ? '✅' : '❌'} Q{a.questionId}: {a.selectedLabel}
                </Text>
              ))}
            </>
          )}
          <Text style={styles.detailLine}>
            📋 {session.events.length} evento{session.events.length !== 1 ? 's' : ''}
          </Text>
          {session.endedAt && (
            <Text style={styles.detailLine}>🔚 Fim: {session.endReason ?? 'completed'}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminPanelScreen({ navigation }: ScreenProps<'AdminPanel'>) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, number | 'unlimited'>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, withStock] = await Promise.all([
      SessionService.getAllSessions(),
      PrizeService.getPrizesWithStock(),
    ]);
    setSessions(all.slice().reverse());
    setStockMap(new Map(withStock.map((p) => [p.id, p.remaining])));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    if (sessions.length === 0) {
      Alert.alert('Sem dados', 'Nenhuma sessão registrada ainda.');
      return;
    }
    setExporting(true);
    try {
      await exportToExcel(sessions, stockMap);
    } catch (e) {
      Alert.alert('Erro', String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Limpar dados', 'Apagar todas as sessões? Isso não pode ser desfeito.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await SessionService.clearAllSessions();
          setSessions([]);
        },
      },
    ]);
  };

  const s = computeStats(sessions);

  const header = (
    <View style={styles.headerContent}>
      {/* ── Overview ───────────────────────────────── */}
      <SectionTitle>Visão Geral</SectionTitle>
      <View style={styles.cardRow}>
        <StatCard label="Total" value={s.total} />
        <StatCard label="Hoje" value={s.today} />
        <StatCard label="Giraram" value={s.spun} />
        <StatCard
          label="Inatividade"
          value={s.inactivityEnded}
          sub={pct(s.inactivityEnded, s.total)}
        />
      </View>

      {/* ── Funnel ─────────────────────────────────── */}
      <SectionTitle>Funil de conversão</SectionTitle>
      <View style={styles.card}>
        <FunnelRow label="Iniciaram sessão" count={s.total} total={s.total} color={Colors.primary} />
        <FunnelRow label="Iniciaram quiz" count={s.startedQuiz} total={s.total} color="#7C3AED" />
        <FunnelRow label="Completaram quiz" count={s.completedQuiz} total={s.total} color="#2563EB" />
        <FunnelRow label="Elegíveis (≥3 acertos)" count={s.eligible} total={s.total} color={Colors.success} />
        <FunnelRow label="Giraram a roleta" count={s.spun} total={s.total} color="#F59E0B" />
      </View>

      {/* ── Quiz performance ───────────────────────── */}
      <SectionTitle>Performance do Quiz</SectionTitle>
      <View style={styles.cardRow}>
        <StatCard
          label="Taxa de aprovação"
          value={s.completedQuiz > 0 ? pct(s.eligible, s.completedQuiz) : '—'}
          sub={`${s.eligible} de ${s.completedQuiz}`}
          accent
        />
        <StatCard
          label="Nota média"
          value={s.avgQuizScore !== null ? `${s.avgQuizScore.toFixed(1)}%` : '—'}
          sub={`${s.completedQuiz} provas`}
        />
      </View>

      {/* ── Prizes ─────────────────────────────────── */}
      <SectionTitle>Prêmios distribuídos</SectionTitle>
      <View style={styles.card}>
        <View style={styles.prizeHeader}>
          <Text style={styles.prizeTotalLabel}>Total de prêmios reais</Text>
          <Text style={styles.prizeTotalValue}>{s.realPrizes}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Prêmio</Text>
          <Text style={[styles.tableCellNum, styles.tableHeaderText]}>Dist.</Text>
          <Text style={[styles.tableCellPct, styles.tableHeaderText]}>%</Text>
          <Text style={[styles.tableCellNum, styles.tableHeaderText]}>Estoque</Text>
        </View>
        {s.prizeStats.map((p) => (
          <PrizeRow
            key={p.id}
            label={p.label}
            count={p.count}
            total={s.totalPrizes}
            remaining={stockMap.get(p.id)}
            isNoPrize={p.id === 'no-prize'}
          />
        ))}
      </View>

      {/* ── Units ──────────────────────────────────── */}
      <SectionTitle>Cliques por unidade</SectionTitle>
      <View style={styles.card}>
        {s.unitStats.length === 0 ? (
          <Text style={styles.emptyCard}>Nenhum clique registrado.</Text>
        ) : (
          s.unitStats.map((u) => (
            <View key={u.id} style={styles.tableRow}>
              <Text style={styles.tableCell} numberOfLines={1}>
                📍 {u.name}
              </Text>
              <Text style={styles.tableCellNum}>{u.count}</Text>
              <Text style={styles.tableCellPct}>
                {pct(u.count, s.unitStats.reduce((acc, x) => acc + x.count, 0))}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* ── Timing ─────────────────────────────────── */}
      <SectionTitle>Tempo médio de sessão</SectionTitle>
      <View style={styles.card}>
        <View style={styles.durationRow}>
          <Text style={styles.durationValue}>
            {s.avgDurationMs !== null ? fmtDuration(s.avgDurationMs) : '—'}
          </Text>
          {s.avgDurationMs !== null && (
            <Text style={styles.durationSub}>
              com base em {s.completedCount} sessão{s.completedCount !== 1 ? 'ões' : ''}
            </Text>
          )}
        </View>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Apenas sessões que chegaram até o sorteio e coletaram um prêmio são consideradas neste cálculo.
          </Text>
        </View>
        {s.peakHour && (
          <View style={[styles.tableRow, { marginTop: 8 }]}>
            <Text style={styles.tableCell}>🕐 Horário de pico</Text>
            <Text style={styles.tableCellNum}>
              {String(s.peakHour[0]).padStart(2, '0')}h
            </Text>
            <Text style={styles.tableCellPct}>{s.peakHour[1]} sessões</Text>
          </View>
        )}
      </View>

      {/* ── Export + Sessions list header ──────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.exportBtn,
          pressed && { opacity: 0.8 },
          exporting && { opacity: 0.6 },
        ]}
        onPress={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <ActivityIndicator color={Colors.text} />
        ) : (
          <Text style={styles.exportBtnText}>⬇ Exportar Excel</Text>
        )}
      </Pressable>

      <SectionTitle>Sessões individuais</SectionTitle>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Painel Admin</Text>
        <Pressable onPress={handleClear} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Limpar</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma sessão registrada.</Text>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backBtnText: { color: Colors.textSecondary, fontSize: 15 },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  clearBtnText: { color: Colors.error, fontSize: 15 },

  headerContent: { paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },

  // Stat cards
  cardRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  statCardAccent: { borderColor: Colors.primary },
  statValue: { fontSize: 22, fontWeight: 'bold', color: Colors.primary },
  statValueAccent: { color: Colors.primary },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  statSub: { fontSize: 10, color: Colors.textSecondary },

  // Generic card wrapper
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },

  // Funnel
  funnelRow: { gap: 4 },
  funnelLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  funnelLabel: { fontSize: 13, color: Colors.text },
  funnelCount: { fontSize: 13, fontWeight: '600', color: Colors.text },
  funnelPct: { fontSize: 12, fontWeight: 'normal', color: Colors.textSecondary },
  funnelBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  funnelBar: { height: 6, borderRadius: 3 },

  // Table rows (prizes, units)
  tableHeaderRow: { flexDirection: 'row', paddingBottom: 4 },
  tableHeaderText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tableCell: { flex: 1, fontSize: 13, color: Colors.text },
  tableCellNum: { width: 44, textAlign: 'right', fontSize: 13, fontWeight: '600', color: Colors.text },
  tableCellPct: { width: 40, textAlign: 'right', fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Prizes section
  prizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  prizeTotalLabel: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  prizeTotalValue: { fontSize: 28, fontWeight: 'bold', color: Colors.primary },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  durationValue: { fontSize: 36, fontWeight: 'bold', color: Colors.primary },
  durationSub: { fontSize: 13, color: Colors.textSecondary },
  warningBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    padding: 10,
  },
  warningText: { fontSize: 12, color: '#F59E0B', lineHeight: 17 },

  // Export
  exportBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  exportBtnText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },

  // Session list
  sessionRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  sessionRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionRowDate: { fontSize: 14, fontWeight: '600', color: Colors.text },
  sessionRowId: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  sessionRowBadges: { flexDirection: 'row', gap: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreen: { backgroundColor: Colors.success },
  badgeRed: { backgroundColor: Colors.error },
  badgePurple: { backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeOrange: { backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: Colors.text, fontSize: 11, fontWeight: 'bold' },
  chevron: { color: Colors.textSecondary, fontSize: 12 },
  sessionDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  detailLine: { fontSize: 13, color: Colors.textSecondary },
  detailAnswer: { fontSize: 12, color: Colors.textSecondary, paddingLeft: 16 },
  emptyCard: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 32,
    fontSize: 16,
  },
});
