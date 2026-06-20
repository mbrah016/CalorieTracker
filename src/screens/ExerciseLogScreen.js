import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calcExerciseCals, EXERCISE_METS } from '../utils/calories';
import { getTodayLog, saveTodayLog, getProfile } from '../utils/storage';

const EXERCISE_META = {
  walking:          { icon: '🚶', color: '#60a5fa' },
  running:          { icon: '🏃', color: '#f87171' },
  cycling:          { icon: '🚴', color: '#fb923c' },
  swimming:         { icon: '🏊', color: '#38bdf8' },
  'weight training':{ icon: '🏋️', color: '#a78bfa' },
  yoga:             { icon: '🧘', color: '#34d399' },
  hiit:             { icon: '⚡', color: '#fbbf24' },
  other:            { icon: '🤸', color: '#94a3b8' },
};

const EXERCISES = Object.keys(EXERCISE_META);

export default function ExerciseLogScreen({ navigation }) {
  const [selected, setSelected] = useState('walking');
  const [duration, setDuration] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const calcPreview = () => {
    if (!duration) { setError('Please enter a duration.'); return; }
    setError('');
    getProfile().then(profile => {
      setPreview(calcExerciseCals(selected, parseInt(duration), profile?.weight || 70));
    });
  };

  const logExercise = async () => {
    if (!preview) { calcPreview(); return; }
    const profile = await getProfile();
    const cals = calcExerciseCals(selected, parseInt(duration), profile?.weight || 70);
    const log = await getTodayLog();
    log.exercises.push({ type: selected, duration: parseInt(duration), caloriesBurned: cals, time: new Date().toISOString() });
    await saveTodayLog(log);
    navigation.navigate('Home');
  };

  const meta = EXERCISE_META[selected] || EXERCISE_META.other;

  return (
    <SafeAreaView style={s.container}>
      <View style={Platform.OS === 'web' ? { height: Dimensions.get('window').height, overflow: 'hidden' } : { flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.sectionLabel}>Choose Activity</Text>
        <View style={s.grid}>
          {EXERCISES.map(ex => {
            const m = EXERCISE_META[ex] || EXERCISE_META.other;
            const isSel = selected === ex;
            return (
              <TouchableOpacity key={ex} style={[s.exCard, isSel && { borderColor: m.color, backgroundColor: m.color + '18' }]}
                onPress={() => { setSelected(ex); setPreview(null); }}>
                <Text style={s.exIcon}>{m.icon}</Text>
                <Text style={[s.exLabel, isSel && { color: m.color }]}>{ex}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Duration (minutes)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. 30"
          placeholderTextColor="#334155"
          keyboardType="numeric"
          value={duration}
          onChangeText={v => { setDuration(v); setPreview(null); setError(''); }}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={[s.calcBtn, { backgroundColor: meta.color + '22', borderColor: meta.color + '44' }]} onPress={calcPreview}>
          <Text style={[s.calcBtnText, { color: meta.color }]}>⚡ Calculate Burn</Text>
        </TouchableOpacity>

        {preview !== null && (
          <>
            <View style={[s.previewCard, { borderColor: meta.color + '40' }]}>
              <Text style={s.previewIcon}>{meta.icon}</Text>
              <Text style={[s.previewCals, { color: meta.color }]}>{preview}</Text>
              <Text style={s.previewKcal}>kcal burned</Text>
              <Text style={s.previewSub}>{selected} · {duration} min</Text>
            </View>

            <TouchableOpacity style={[s.logBtn, { backgroundColor: meta.color }]} onPress={logExercise}>
              <Text style={s.logBtnText}>+ Log Exercise</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f1a' },
  scroll: { padding: 20, paddingBottom: 60 },

  sectionLabel: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exCard: { width: '22%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#0f1f35', borderWidth: 1.5, borderColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center', gap: 4 },
  exIcon: { fontSize: 22 },
  exLabel: { color: '#475569', fontSize: 9, textTransform: 'capitalize', textAlign: 'center', fontWeight: '600' },

  input: { backgroundColor: '#0f1f35', color: '#f1f5f9', borderRadius: 14, padding: 16, fontSize: 18, fontWeight: '700', borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 8 },
  error: { color: '#f87171', fontSize: 13, marginBottom: 8 },

  calcBtn: { borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 20, borderWidth: 1.5 },
  calcBtnText: { fontWeight: '800', fontSize: 15 },

  previewCard: { backgroundColor: '#0f1f35', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 14, borderWidth: 1.5 },
  previewIcon: { fontSize: 40, marginBottom: 8 },
  previewCals: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  previewKcal: { color: '#475569', fontSize: 14, marginTop: -4, marginBottom: 8 },
  previewSub: { color: '#334155', fontSize: 13, textTransform: 'capitalize' },

  logBtn: { borderRadius: 16, padding: 16, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
