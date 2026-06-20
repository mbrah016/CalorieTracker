import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { calcTDEE, calcMacroGoals, CALS_PER_STEP } from '../utils/calories';
import { getProfile, getLogForDate, saveLogForDate } from '../utils/storage';

const MEAL_TYPES = [
  { key: 'Breakfast', icon: '🌅' },
  { key: 'Lunch',     icon: '☀️' },
  { key: 'Dinner',    icon: '🌙' },
  { key: 'Snacks',    icon: '🍎' },
];

const MACRO_CONFIG = [
  { key: 'protein', label: 'Protein', color: '#22c55e', bg: '#052e16' },
  { key: 'carbs',   label: 'Carbs',   color: '#f59e0b', bg: '#1c1003' },
  { key: 'fat',     label: 'Fat',     color: '#f87171', bg: '#2d0a0a' },
  { key: 'fiber',   label: 'Fiber',   color: '#60a5fa', bg: '#0a1628' },
];

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function HomeScreen({ navigation }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [profile, setProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [log, setLog] = useState({ meals: [], exercises: [], steps: 0 });
  const [weekLogs, setWeekLogs] = useState({});
  const [steps, setSteps] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const weekStart = getWeekStart();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = useCallback(async (date) => {
    const [p, l] = await Promise.all([getProfile(), getLogForDate(date)]);
    setProfile(p);
    setLog(l);
    const entries = await Promise.all(
      weekDays.map(d => getLogForDate(d))
    );
    const summary = {};
    weekDays.forEach((d, i) => {
      summary[d.toDateString()] = entries[i].meals.length > 0 || entries[i].exercises.length > 0;
    });
    setWeekLogs(summary);
  }, []);

  useFocusEffect(useCallback(() => {
    loadData(selectedDate);
  }, [selectedDate]));

  const selectDay = (date) => {
    setSelectedDate(date);
    setConfirmReset(false);
  };

  const resetDay = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    const empty = { meals: [], exercises: [], steps: 0 };
    await saveLogForDate(selectedDate, empty);
    setLog(empty);
    setSteps(0);
    setConfirmReset(false);
    const summary = { ...weekLogs, [selectedDate.toDateString()]: false };
    setWeekLogs(summary);
  };

  const deleteMeal = async (globalIndex) => {
    const updated = { ...log, meals: log.meals.filter((_, i) => i !== globalIndex) };
    await saveLogForDate(selectedDate, updated);
    setLog(updated);
  };

  const deleteExercise = async (index) => {
    const updated = { ...log, exercises: log.exercises.filter((_, i) => i !== index) };
    await saveLogForDate(selectedDate, updated);
    setLog(updated);
  };

  const isToday = isSameDay(selectedDate, today);
  const isPast  = selectedDate < today;

  if (!profile) return null;

  const tdee = calcTDEE(profile);
  const macroGoals = calcMacroGoals(tdee);
  const totalEaten = log.meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalBurnedExercise = log.exercises.reduce((s, e) => s + (e.caloriesBurned || 0), 0);
  const stepCals = Math.round((log.steps || steps) * CALS_PER_STEP);
  const totalBurned = totalBurnedExercise + stepCals;
  const remaining = tdee - totalEaten + totalBurned;
  const eatPct = Math.min(totalEaten / tdee, 1);
  const isOver = remaining < 0;

  const macros = log.meals.reduce((acc, m) => ({
    protein: acc.protein + (m.protein || 0),
    carbs:   acc.carbs   + (m.carbs   || 0),
    fat:     acc.fat     + (m.fat     || 0),
    fiber:   acc.fiber   + (m.fiber   || 0),
  }), { protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr   = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={s.container}>
      <View style={Platform.OS === 'web' ? { height: Dimensions.get('window').height, overflow: 'hidden' } : { flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hey, {profile.name} 👋</Text>
            <Text style={s.date}>{isToday ? 'Today' : dayOfWeek}, {dateStr}</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakText}>🔥 Daily</Text>
          </View>
        </View>

        <View style={s.weekRow}>
          {weekDays.map((d, i) => {
            const isSel  = isSameDay(d, selectedDate);
            const isT    = isSameDay(d, today);
            const hasLog = weekLogs[d.toDateString()];
            const isFut  = d > today;
            return (
              <TouchableOpacity key={i} style={[s.dayBtn, isSel && s.dayBtnSel, isT && !isSel && s.dayBtnToday]}
                onPress={() => selectDay(d)} disabled={isFut}>
                <Text style={[s.dayInitial, isSel && s.dayInitialSel, isFut && s.dayInitialFut]}>
                  {DAY_INITIALS[i]}
                </Text>
                <View style={[s.dayDot, hasLog && s.dayDotActive, isSel && s.dayDotSel]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.heroCard}>
          <View style={s.ringWrap}>
            <View style={s.ringOuter}>
              <View style={[s.ringFill, {
                borderColor: isOver ? '#ef4444' : '#22c55e',
                opacity: 0.15 + eatPct * 0.85,
              }]} />
              <View style={s.ringInner}>
                <Text style={[s.ringNum, isOver && { color: '#ef4444' }]}>{Math.abs(remaining)}</Text>
                <Text style={[s.ringLabel, isOver && { color: '#ef4444' }]}>{isOver ? 'over' : 'remaining'}</Text>
                <Text style={s.ringUnit}>kcal</Text>
              </View>
            </View>
          </View>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatIcon}>🎯</Text>
              <Text style={s.heroStatVal}>{tdee}</Text>
              <Text style={s.heroStatLabel}>Goal</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatIcon}>🍽</Text>
              <Text style={s.heroStatVal}>{totalEaten}</Text>
              <Text style={s.heroStatLabel}>Eaten</Text>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatIcon}>🔥</Text>
              <Text style={s.heroStatVal}>{totalBurned}</Text>
              <Text style={s.heroStatLabel}>Burned</Text>
            </View>
          </View>

          <View style={s.progressBg}>
            <View style={{ flexDirection: 'row', flex: 1 }}>
              <View style={{ flex: eatPct, backgroundColor: isOver ? '#ef4444' : '#22c55e', height: 6, borderRadius: 3 }} />
              <View style={{ flex: 1 - eatPct }} />
            </View>
          </View>
          <View style={s.progressLabels}>
            <Text style={s.progressLabel}>0</Text>
            <Text style={s.progressLabel}>{tdee} kcal goal</Text>
          </View>
        </View>

        <View style={s.macroGrid}>
          {MACRO_CONFIG.map(({ key, label, color, bg }) => {
            const val = Math.round(macros[key]);
            const goal = macroGoals[key];
            const pct = Math.min(val / goal, 1);
            return (
              <View key={key} style={[s.macroCard, { backgroundColor: bg, borderColor: color + '33' }]}>
                <Text style={[s.macroVal, { color }]}>{val}<Text style={s.macroUnit}>g</Text></Text>
                <Text style={[s.macroLabel, { color: color + 'cc' }]}>{label}</Text>
                <View style={[s.macroPBg, { backgroundColor: color + '22' }]}>
                  <View style={{ flexDirection: 'row', flex: 1 }}>
                    <View style={{ flex: pct, backgroundColor: color, height: 4, borderRadius: 2 }} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                </View>
                <Text style={[s.macroGoal, { color: color + '88' }]}>{val}/{goal}g</Text>
              </View>
            );
          })}
        </View>

        <View style={s.statsRow}>
          <View style={[s.statCard, { borderColor: '#3b82f633' }]}>
            <Text style={s.statEmoji}>👟</Text>
            <Text style={s.statBig}>{(log.steps || steps).toLocaleString()}</Text>
            <Text style={s.statSub}>steps · {stepCals} kcal</Text>
          </View>
          <View style={[s.statCard, { borderColor: '#f9731633' }]}>
            <Text style={s.statEmoji}>💪</Text>
            <Text style={s.statBig}>{log.exercises.length}</Text>
            <Text style={s.statSub}>workout{log.exercises.length !== 1 ? 's' : ''} · {totalBurnedExercise} kcal</Text>
          </View>
        </View>

        {MEAL_TYPES.map(({ key, icon }) => {
          const meals = log.meals
            .map((m, i) => ({ ...m, _idx: i }))
            .filter(m => m.mealType === key);
          const cals = meals.reduce((s, m) => s + (m.calories || 0), 0);
          return (
            <View key={key} style={s.mealSection}>
              <View style={s.mealSectionHeader}>
                <Text style={s.mealSectionIcon}>{icon}</Text>
                <Text style={s.mealSectionTitle}>{key}</Text>
                {cals > 0 && <View style={s.calsBadge}><Text style={s.calsBadgeText}>{cals} kcal</Text></View>}
              </View>
              {meals.length === 0
                ? <Text style={s.emptyMeal}>Nothing logged yet</Text>
                : meals.map((m) => (
                  <View key={m._idx} style={s.mealItem}>
                    <Text style={s.mealItemName}>{m.name}</Text>
                    <Text style={s.mealItemCals}>{m.calories} kcal</Text>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => deleteMeal(m._idx)}>
                      <Text style={s.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          );
        })}

        {log.exercises.length > 0 && (
          <View style={s.mealSection}>
            <View style={s.mealSectionHeader}>
              <Text style={s.mealSectionIcon}>🏋️</Text>
              <Text style={s.mealSectionTitle}>Exercises</Text>
              <View style={[s.calsBadge, { backgroundColor: '#f9731620', borderColor: '#f9731640' }]}>
                <Text style={[s.calsBadgeText, { color: '#f97316' }]}>-{totalBurnedExercise} kcal</Text>
              </View>
            </View>
            {log.exercises.map((e, i) => (
              <View key={i} style={s.mealItem}>
                <Text style={[s.mealItemName, { textTransform: 'capitalize' }]}>{e.type} · {e.duration} min</Text>
                <Text style={[s.mealItemCals, { color: '#f97316' }]}>-{e.caloriesBurned} kcal</Text>
                <TouchableOpacity style={s.deleteBtn} onPress={() => deleteExercise(i)}>
                  <Text style={s.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {isToday && (
          <View style={s.ctaRow}>
            <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.navigate('MealLog')}>
              <Text style={s.ctaBtnEmoji}>🍽</Text>
              <Text style={s.ctaBtnText}>Log Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ctaBtn, s.ctaBtnOrange]} onPress={() => navigation.navigate('ExerciseLog')}>
              <Text style={s.ctaBtnEmoji}>🏋️</Text>
              <Text style={s.ctaBtnText}>Log Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        {isToday && (
          <TouchableOpacity style={[s.resetBtn, confirmReset && s.resetBtnActive]} onPress={resetDay}>
            <Text style={[s.resetBtnText, confirmReset && { color: '#ef4444' }]}>
              {confirmReset ? '⚠️ Tap again to confirm reset' : '🔄 Reset Today'}
            </Text>
          </TouchableOpacity>
        )}

        {!isToday && (
          <View style={s.pastNote}>
            <Text style={s.pastNoteText}>{isPast ? '📅 Viewing past day — read only' : '🔒 Future day'}</Text>
          </View>
        )}

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f1a' },
  scroll: { padding: 16, paddingBottom: 60 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
  date: { fontSize: 13, color: '#475569', marginTop: 2 },
  streakBadge: { backgroundColor: '#f9731620', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#f9731640' },
  streakText: { color: '#f97316', fontWeight: '700', fontSize: 12 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f1f35', borderRadius: 20, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1e3a5f' },
  dayBtn: { alignItems: 'center', flex: 1, paddingVertical: 6, borderRadius: 14 },
  dayBtnSel: { backgroundColor: '#22c55e20' },
  dayBtnToday: { backgroundColor: '#1e3a5f' },
  dayInitial: { fontSize: 13, fontWeight: '700', color: '#475569' },
  dayInitialSel: { color: '#22c55e' },
  dayInitialFut: { color: '#1e3a5f' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent', marginTop: 4 },
  dayDotActive: { backgroundColor: '#475569' },
  dayDotSel: { backgroundColor: '#22c55e' },

  pastNote: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1e3a5f', marginTop: 8 },
  pastNoteText: { color: '#475569', fontSize: 13 },

  heroCard: { backgroundColor: '#0f1f35', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#1e3a5f' },
  ringWrap: { alignItems: 'center', marginBottom: 20 },
  ringOuter: { width: 160, height: 160, borderRadius: 80, borderWidth: 12, borderColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  ringFill: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 12 },
  ringInner: { alignItems: 'center' },
  ringNum: { fontSize: 40, fontWeight: '900', color: '#22c55e', letterSpacing: -1 },
  ringLabel: { fontSize: 13, color: '#22c55e', fontWeight: '600', marginTop: -2 },
  ringUnit: { fontSize: 11, color: '#475569', marginTop: 2 },

  heroStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatIcon: { fontSize: 18, marginBottom: 4 },
  heroStatVal: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  heroStatLabel: { fontSize: 11, color: '#475569', marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: '#1e3a5f', marginVertical: 4 },

  progressBg: { height: 6, backgroundColor: '#1e3a5f', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 10, color: '#334155' },

  macroGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  macroCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
  macroVal: { fontSize: 20, fontWeight: '800' },
  macroUnit: { fontSize: 12, fontWeight: '400' },
  macroLabel: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  macroPBg: { width: '100%', height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  macroPFill: { height: 4, borderRadius: 2 },
  macroGoal: { fontSize: 9, marginTop: 4, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#0f1f35', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statBig: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  statSub: { fontSize: 11, color: '#475569', marginTop: 2, textAlign: 'center' },

  mealSection: { backgroundColor: '#0f1f35', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1e3a5f' },
  mealSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mealSectionIcon: { fontSize: 18, marginRight: 8 },
  mealSectionTitle: { color: '#94a3b8', fontWeight: '700', fontSize: 14, flex: 1, textTransform: 'uppercase', letterSpacing: 0.8 },
  calsBadge: { backgroundColor: '#22c55e20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#22c55e40' },
  calsBadgeText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  emptyMeal: { color: '#334155', fontSize: 13, fontStyle: 'italic', paddingVertical: 2 },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#1e3a5f' },
  mealItemName: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  mealItemCals: { color: '#22c55e', fontSize: 14, fontWeight: '700', marginRight: 10 },
  deleteBtn: { backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ef444440' },
  deleteBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  ctaRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 10 },
  ctaBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: 16, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  ctaBtnOrange: { backgroundColor: '#f97316' },
  ctaBtnEmoji: { fontSize: 18 },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  resetBtn: { borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1e3a5f' },
  resetBtnActive: { borderColor: '#ef444460', backgroundColor: '#ef444410' },
  resetBtnText: { color: '#334155', fontWeight: '600', fontSize: 14 },
});
