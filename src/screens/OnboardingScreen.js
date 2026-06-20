import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveProfile } from '../utils/storage';

const BODY_TYPES = [
  { key: 'skinny',      icon: '🪶' },
  { key: 'skinny fat',  icon: '🍩' },
  { key: 'average',     icon: '👤' },
  { key: 'athletic',    icon: '🏃' },
  { key: 'bulky',       icon: '💪' },
  { key: 'overweight',  icon: '⚖️' },
];
const GENDERS = [{ key: 'male', icon: '♂️' }, { key: 'female', icon: '♀️' }];

export default function OnboardingScreen({ onComplete }) {
  const [form, setForm] = useState({ gender: 'male', age: '', weight: '', height: '', bodyType: 'average', name: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const name = form.name.trim();
    const age = form.age.trim();
    const weight = form.weight.trim();
    const height = form.height.trim();
    if (!name || !age || !weight || !height) {
      setError('Please fill in all fields: Name, Age, Weight and Height.');
      return;
    }
    try {
      const profile = {
        name,
        gender: form.gender,
        age: parseInt(age),
        weight: parseFloat(weight),
        height: parseFloat(height),
        bodyType: form.bodyType,
      };
      await saveProfile(profile);
      onComplete(profile);
    } catch (e) {
      setError('Error saving profile: ' + (e?.message || String(e)));
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={Platform.OS === 'web' ? { height: Dimensions.get('window').height, overflow: 'hidden' } : { flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.title}>Let's get you{'\n'}set up 🥗</Text>
        <Text style={s.subtitle}>We'll calculate your daily calorie goal based on your profile.</Text>

        <Field label="Your Name">
          <TextInput style={s.input} placeholder="e.g. Alex" placeholderTextColor="#334155"
            value={form.name} onChangeText={v => set('name', v)} />
        </Field>

        <Field label="Gender">
          <View style={s.chipRow}>
            {GENDERS.map(({ key, icon }) => (
              <TouchableOpacity key={key} style={[s.chip, form.gender === key && s.chipSel]} onPress={() => set('gender', key)}>
                <Text style={s.chipIcon}>{icon}</Text>
                <Text style={[s.chipText, form.gender === key && s.chipTextSel]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field label="Age">
              <TextInput style={s.input} placeholder="28" placeholderTextColor="#334155"
                keyboardType="numeric" value={form.age} onChangeText={v => set('age', v)} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Weight (kg)">
              <TextInput style={s.input} placeholder="75" placeholderTextColor="#334155"
                keyboardType="decimal-pad" value={form.weight} onChangeText={v => set('weight', v)} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Height (cm)">
              <TextInput style={s.input} placeholder="175" placeholderTextColor="#334155"
                keyboardType="decimal-pad" value={form.height} onChangeText={v => set('height', v)} />
            </Field>
          </View>
        </View>

        <Field label="Body Type">
          <View style={s.chipRow}>
            {BODY_TYPES.map(({ key, icon }) => (
              <TouchableOpacity key={key} style={[s.chip, form.bodyType === key && s.chipSel]} onPress={() => set('bodyType', key)}>
                <Text style={s.chipIcon}>{icon}</Text>
                <Text style={[s.chipText, form.bodyType === key && s.chipTextSel]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.error}>⚠️ {error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={s.btn} onPress={handleSave}>
          <Text style={s.btnText}>Start Tracking →</Text>
        </TouchableOpacity>

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const Field = ({ label, children }) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</Text>
    {children}
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f1a' },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 36, fontWeight: '900', color: '#f1f5f9', marginBottom: 8, marginTop: 12, letterSpacing: -1, lineHeight: 44 },
  subtitle: { fontSize: 15, color: '#475569', marginBottom: 32, lineHeight: 22 },
  row: { flexDirection: 'row' },
  input: { backgroundColor: '#0f1f35', color: '#f1f5f9', borderRadius: 14, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#1e3a5f' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: '#0f1f35', borderWidth: 1.5, borderColor: '#1e3a5f' },
  chipSel: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  chipIcon: { fontSize: 14 },
  chipText: { color: '#475569', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  chipTextSel: { color: '#22c55e', fontWeight: '700' },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12 },
  errorBox: { backgroundColor: '#ef444420', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ef444440' },
  btn: { backgroundColor: '#22c55e', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
