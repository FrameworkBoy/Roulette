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
import { PRIZES, PRIZE_SYSTEM_CONFIG } from '../config/prizes';
import { REGISTRATION_FIELDS } from '../config/registration';
import type { Prize, DailyStock } from '../config/prizes';
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
    ...Object.fromEntries(
      REGISTRATION_FIELDS.map((f) => [f.label, s.registration?.fields[f.id] ?? '']),
    ),
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

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const bytes = new Uint8Array(
    XLSX.write(wb, {
      type: 'array',
      bookType: 'xlsx',
    }) as number[],
  );
  const file = new File(Paths.cache, filename);
  file.write(bytes);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Exportar sessões',
    });
  } else {
    Alert.alert('Arquivo salvo', file.uri);
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
    completedMs.length > 0 ? completedMs.reduce((a, b) => a + b, 0) / completedMs.length : null;

  // Quiz performance
  const quizScores = sessions
    .filter((s) => s.quiz?.completedAt)
    .map((s) => (s.quiz!.score / s.quiz!.total) * 100);
  const avgQuizScore =
    quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : null;

  // Peak hour
  const hourCounts: Record<number, number> = {};
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const peakHour =
    sessions.length > 0 ? Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0] : null;

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
        <View
          style={[styles.funnelBar, { width: width as `${number}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// ─── Prize rule helpers ───────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
  sun: 'Dom',
};

function formatStock(stock: DailyStock): string {
  if (stock === null) return 'Ilimitado';
  if (typeof stock === 'number') return `${stock} por dia`;
  const entries = Object.entries(stock);
  if (entries.length === 0) return '0 por dia';
  return entries.map(([d, v]) => `${DAY_LABELS[d] ?? d}: ${v}`).join('  ·  ');
}

function formatWindow(w: { from: string; to: string } | null | undefined): string {
  if (!w) return 'Disponível o dia todo';
  return `${w.from} – ${w.to}`;
}

const TOTAL_WEIGHT = PRIZES.reduce((sum, p) => sum + p.weight, 0);

function RuleItem({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <View style={styles.ruleItem}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
      <Text style={styles.ruleDesc}>{description}</Text>
    </View>
  );
}

function PrizeRow({
  label,
  count,
  total,
  remaining,
  isNoPrize,
  extraTopMargin,
  prize,
}: {
  label: string;
  count: number;
  total: number;
  remaining: number | 'unlimited' | undefined;
  isNoPrize: boolean;
  extraTopMargin?: boolean;
  prize: Prize;
}) {
  const [expanded, setExpanded] = useState(false);

  const stockLabel =
    remaining === undefined ? '—' : remaining === 'unlimited' ? '∞' : String(remaining);
  const stockColor =
    remaining === 'unlimited' || remaining === undefined
      ? Colors.textSecondary
      : remaining === 0
        ? Colors.error
        : remaining <= 5
          ? Colors.warning
          : Colors.success;

  const effectivePct =
    TOTAL_WEIGHT > 0 ? `~${((prize.weight / TOTAL_WEIGHT) * 100).toFixed(1)}%` : '—';

  return (
    <View style={[isNoPrize && styles.prizeRowNoPrize, extraTopMargin && { marginTop: 8 }]}>
      {/* ── Summary row ── */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.prizeRow, pressed && { opacity: 0.7 }]}
      >
        <Text
          style={[styles.prizeRowLabel, isNoPrize && { color: Colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text style={[styles.prizeRowNum, isNoPrize && { color: Colors.textSecondary }]}>
          {count}
        </Text>
        <Text style={styles.prizeRowPct}>{pct(count, total)}</Text>
        <Text style={[styles.prizeRowNum, { color: stockColor }]}>{stockLabel}</Text>
        <Text style={styles.prizeRowChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {/* ── Detail panel ── */}
      {expanded && (
        <View style={styles.prizeDetail}>
          <Text style={styles.prizeDetailTitle}>Regras de distribuição</Text>
          <RuleItem
            label="Peso"
            value={`${prize.weight}  (${effectivePct})`}
            description="Probabilidade relativa de ser sorteado. Quanto maior em relação aos outros, mais frequente. Peso 0 = nunca sorteado."
          />
          <RuleItem
            label="Estoque diário"
            value={formatStock(prize.stock)}
            description="Quantidade máxima distribuída por dia. Quando esgotado, o prêmio sai do sorteio. Pode variar por dia da semana."
          />
          <RuleItem
            label="Carry-over"
            value={
              prize.carryOver === undefined
                ? 'Padrão do sistema'
                : prize.carryOver
                  ? 'Ativo'
                  : 'Inativo'
            }
            description="Quando ativo, estoque não utilizado do dia anterior é somado ao do dia atual. Indefinido = usa a regra geral do sistema."
          />
          <RuleItem
            label="Janela de horário"
            value={formatWindow(prize.timeWindow)}
            description="Intervalo em que este prêmio pode ser sorteado. Só é aplicado quando o controle de horário global estiver ativo."
          />
        </View>
      )}
    </View>
  );
}

// ─── General rules card ───────────────────────────────────────────────────────

function GeneralRulesCard() {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIZE_SYSTEM_CONFIG;

  return (
    <View style={styles.card}>
      <Pressable style={styles.generalRulesHeader} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.generalRulesTitle}>Regras gerais do sistema</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.generalRulesBody}>
          <View style={styles.divider} />
          <RuleItem
            label="Controle de horário"
            value={cfg.timeWindowEnabled ? 'Ativo' : 'Inativo'}
            description="Interruptor geral para as janelas de horário. Quando inativo, todos os prêmios ficam disponíveis o dia todo, ignorando quaisquer janelas configuradas."
          />
          <RuleItem
            label="Janela global"
            value={formatWindow(cfg.globalTimeWindow)}
            description="Janela de horário aplicada a todos os prêmios. Funciona em adição às janelas individuais de cada prêmio. Requer 'Controle de horário' ativo."
          />
          <RuleItem
            label="Carry-over global"
            value={cfg.carryOver ? 'Ativo' : 'Inativo'}
            description="Padrão do sistema para carry-over de estoque. Cada prêmio pode sobrescrever esta configuração individualmente via seu próprio campo carry-over."
          />
          <RuleItem
            label="Prêmio sem sorte"
            value={cfg.noPrizeId}
            description="ID do prêmio usado como fallback quando nenhum prêmio real está disponível — por estoque esgotado ou fora da janela de horário."
          />
        </View>
      )}
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
              style={[styles.badge, session.quiz.eligible ? styles.badgeGreen : styles.badgeRed]}
            >
              <Text style={styles.badgeText}>
                {session.quiz.score}/{session.quiz.total}
              </Text>
            </View>
          )}
          {/* {session.spin && (
            <View style={styles.badgePurple}>
              <Text style={styles.badgeText}>🎰</Text>
            </View>
          )} */}
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
          {session.registration && REGISTRATION_FIELDS.map((f) => (
            <Text key={f.id} style={styles.detailLine}>
              {f.label}: {session.registration!.fields[f.id] ?? '—'}
            </Text>
          ))}
          {/* {session.spin && (
            <Text style={styles.detailLine}>
              🎁 Prêmio: {session.spin.prizeLabel}
            </Text>
          )} */}
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
            📋 {session.events.length} evento
            {session.events.length !== 1 ? 's' : ''}
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
    if (Platform.OS === 'web') {
      if (!window.confirm('Apagar todas as sessões? Isso não pode ser desfeito.')) return;
      SessionService.clearAllSessions().then(() => setSessions([]));
      return;
    }
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
        {/* <StatCard label="Giraram" value={s.spun} /> */}
        <StatCard
          label="Inatividade"
          value={s.inactivityEnded}
          sub={pct(s.inactivityEnded, s.total)}
        />
      </View>

      {/* ── Funnel ─────────────────────────────────── */}
      <SectionTitle>Funil de conversão</SectionTitle>
      <View style={styles.card}>
        <FunnelRow
          label="Iniciaram sessão"
          count={s.total}
          total={s.total}
          color={Colors.primary}
        />
        <FunnelRow
          label="Iniciaram quiz"
          count={s.startedQuiz}
          total={s.total}
          color={Colors.quiz}
        />
        <FunnelRow
          label="Completaram quiz"
          count={s.completedQuiz}
          total={s.total}
          color={Colors.info}
        />
        <FunnelRow
          label="Elegíveis (≥3 acertos)"
          count={s.eligible}
          total={s.total}
          color={Colors.success}
        />
        {/* <FunnelRow
          label="Giraram a roleta"
          count={s.spun}
          total={s.total}
          color={Colors.warning}
        /> */}
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

      {/* ── Prizes (hidden while roulette flow is disabled) ──────────────
      <SectionTitle>Prêmios distribuídos</SectionTitle>
      <View style={styles.card}>
        <View style={styles.prizeHeader}>
          <Text style={styles.prizeTotalLabel}>Total de prêmios reais</Text>
          <Text style={styles.prizeTotalValue}>{s.realPrizes}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.prizeTableHeader}>
          <Text style={[styles.prizeRowLabel, styles.prizeHeaderText]}>Prêmio</Text>
          <Text style={[styles.prizeRowNum, styles.prizeHeaderText]}>Dist.</Text>
          <Text style={[styles.prizeRowPct, styles.prizeHeaderText]}>%</Text>
          <Text style={[styles.prizeRowNum, styles.prizeHeaderText]}>Estoque</Text>
        </View>
        {s.prizeStats.map((p, i) => {
          const prizeCfg = PRIZES.find((pr) => pr.id === p.id)!;
          return (
            <PrizeRow
              key={p.id}
              label={p.label}
              count={p.count}
              total={s.totalPrizes}
              remaining={stockMap.get(p.id)}
              isNoPrize={p.id === "no-prize"}
              extraTopMargin={p.id === "no-prize" && i > 0}
              prize={prizeCfg}
            />
          );
        })}
      </View>

      <SectionTitle>Regras gerais</SectionTitle>
      <GeneralRulesCard />
      ── */}

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
                {pct(
                  u.count,
                  s.unitStats.reduce((acc, x) => acc + x.count, 0),
                )}
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
              com base em {s.completedCount}
              {s.completedCount !== 1 ? ' Sessões' : ' sessão'}
            </Text>
          )}
        </View>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Apenas sessões finalizadas são consideradas neste cálculo.
          </Text>
        </View>
        {s.peakHour && (
          <View style={[styles.tableRow, { marginTop: 8 }]}>
            <Text style={styles.tableCell}>🕐 Horário de pico</Text>
            <Text style={styles.tableCellNum}>{String(s.peakHour[0]).padStart(2, '0')}h</Text>
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
        <View style={{ width: 52 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <SessionRow session={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma sessão registrada.</Text>}
          ListFooterComponent={
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Zona de Perigo</Text>
              <Text style={styles.dangerZoneDesc}>
                Esta ação apaga permanentemente todas as sessões registradas e não pode ser
                desfeita.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.8 }]}
                onPress={handleClear}
              >
                <Text style={styles.dangerBtnText}>🗑 Apagar todos os dados</Text>
              </Pressable>
            </View>
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
  dangerZone: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(201,44,63,0.05)',
  },
  dangerZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dangerZoneDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dangerBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: Colors.error, fontSize: 15, fontWeight: '600' },

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
  funnelPct: {
    fontSize: 12,
    fontWeight: 'normal',
    color: Colors.textSecondary,
  },
  funnelBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  funnelBar: { height: 6, borderRadius: 3 },

  // Generic table (units, timing)
  tableHeaderRow: { flexDirection: 'row', paddingBottom: 4 },
  tableHeaderText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tableCell: { flex: 1, fontSize: 13, color: Colors.text },
  tableCellNum: {
    width: 48,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  tableCellPct: {
    width: 80,
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Prize table (dedicated styles for better spacing)
  prizeTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  prizeHeaderText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  prizeRowNoPrize: {
    opacity: 0.6,
  },
  prizeRowLabel: { flex: 1, fontSize: 13, color: Colors.text },
  prizeRowNum: {
    width: 64,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  prizeRowPct: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  prizeRowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
    marginHorizontal: 10,
  },

  // Rule items (inside prize detail + general rules)
  ruleItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 3,
  },
  ruleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ruleValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  ruleDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },

  // Prize row expanded detail
  prizeRowChevron: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  prizeDetail: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  prizeDetailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },

  // General rules card
  generalRulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generalRulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  generalRulesBody: {
    marginTop: 8,
    marginHorizontal: -14,
    marginBottom: -14,
  },

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
  warningText: { fontSize: 12, color: Colors.warning, lineHeight: 17 },

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
  badgePurple: {
    backgroundColor: Colors.quiz,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeOrange: {
    backgroundColor: Colors.warning,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
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
  emptyCard: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 32,
    fontSize: 16,
  },
});
