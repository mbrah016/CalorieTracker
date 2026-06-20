import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodImage } from '../utils/openai';
import { getTodayLog, saveTodayLog } from '../utils/storage';

const MEAL_TYPES = [
  { key: 'Breakfast', icon: '🌅' },
  { key: 'Lunch',     icon: '☀️' },
  { key: 'Dinner',    icon: '🌙' },
  { key: 'Snacks',    icon: '🍎' },
];

const NUTRIENTS = [
  { key: 'protein', label: 'Protein', unit: 'g',  color: '#22c55e', bg: '#052e16' },
  { key: 'carbs',   label: 'Carbs',   unit: 'g',  color: '#f59e0b', bg: '#1c1003' },
  { key: 'fat',     label: 'Fat',     unit: 'g',  color: '#f87171', bg: '#2d0a0a' },
  { key: 'fiber',   label: 'Fiber',   unit: 'g',  color: '#60a5fa', bg: '#0a1628' },
  { key: 'sugar',   label: 'Sugar',   unit: 'g',  color: '#f472b6', bg: '#2d0a1e' },
  { key: 'sodium',  label: 'Sodium',  unit: 'mg', color: '#a78bfa', bg: '#150a2d' },
];

export default function MealLogScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState('Breakfast');
  const [error, setError] = useState(null);

  const pickPhoto = async () => {
    const pic = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!pic.canceled) { setImage(pic.assets[0]); setResult(null); setError(null); }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError('Camera permission required.'); return; }
    const pic = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!pic.canceled) { setImage(pic.assets[0]); setResult(null); setError(null); }
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      let base64 = image.base64;
      if (!base64) {
        const res = await fetch(image.uri);
        const blob = await res.blob();
        base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      setResult(await analyzeFoodImage(base64));
    } catch (e) {
      setError(e.message || 'Analysis failed. Check your API key or quota.');
    } finally {
      setLoading(false);
    }
  };

  const logMeal = async () => {
    const log = await getTodayLog();
    log.meals.push({ ...result, mealType, time: new Date().toISOString() });
    await saveTodayLog(log);
    navigation.navigate('Home');
  };

  return (
    <View style={s.container}>
      <View style={Platform.OS === 'web' ? { height: Dimensions.get('window').height, overflow: 'hidden' } : { flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.sectionLabel}>Meal Type</Text>
        <View style={s.typeRow}>
          {MEAL_TYPES.map(({ key, icon }) => (
            <TouchableOpacity key={key} style={[s.typeChip, mealType === key && s.typeChipSel]}
              onPress={() => setMealType(key)}>
              <Text style={s.typeChipIcon}>{icon}</Text>
              <Text style={[s.typeChipText, mealType === key && s.typeChipTextSel]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
            <Text style={s.photoBtnIcon}>📷</Text>
            <Text style={s.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.photoBtn, s.photoBtnGhost]} onPress={pickPhoto}>
            <Text style={s.photoBtnIcon}>🖼</Text>
            <Text style={[s.photoBtnText, { color: '#94a3b8' }]}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <>
            <Image source={{ uri: image.uri }} style={s.preview} resizeMode="cover" />
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setImage(null); setResult(null); setError(null); }}>
              <Text style={s.cancelBtnText}>✕ Remove Photo</Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {image && !result && (
          <TouchableOpacity style={s.analyzeBtn} onPress={analyze} disabled={loading}>
            {loading
              ? <><ActivityIndicator color="#fff" /><Text style={s.analyzeBtnText}>  Analyzing...</Text></>
              : <Text style={s.analyzeBtnText}>✨ Analyze with AI</Text>}
          </TouchableOpacity>
        )}

        {result && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Text style={s.resultName}>{result.name}</Text>
              <View style={s.caloriePill}>
                <Text style={s.calorieVal}>{result.calories}</Text>
                <Text style={s.calorieUnit}> kcal</Text>
              </View>
            </View>

            <View style={s.nutrientGrid}>
              {NUTRIENTS.map(({ key, label, unit, color, bg }) => (
                <View key={key} style={[s.nutrientCard, { backgroundColor: bg, borderColor: color + '33' }]}>
                  <Text style={[s.nutrientVal, { color }]}>{result[key]}<Text style={s.nutrientUnit}>{unit}</Text></Text>
                  <Text style={[s.nutrientLabel, { color: color + 'bb' }]}>{label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.logBtn} onPress={logMeal}>
              <Text style={s.logBtnText}>✅ Add to {mealType}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f1a' },
  scroll: { padding: 20, paddingBottom: 60 },

  sectionLabel: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, backgroundColor: '#0f1f35', borderWidth: 1, borderColor: '#1e3a5f' },
  typeChipSel: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  typeChipIcon: { fontSize: 14 },
  typeChipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  typeChipTextSel: { color: '#22c55e' },

  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  photoBtnGhost: { backgroundColor: '#0f1f35', borderWidth: 1, borderColor: '#1e3a5f' },
  photoBtnIcon: { fontSize: 18 },
  photoBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  preview: { width: '100%', height: 220, borderRadius: 18, marginBottom: 10 },
  cancelBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 16 },
  cancelBtnText: { color: '#475569', fontSize: 13 },

  errorBox: { backgroundColor: '#ef444415', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#ef444440' },
  errorText: { color: '#f87171', fontSize: 13 },

  analyzeBtn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  resultCard: { backgroundColor: '#0f1f35', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  resultName: { fontSize: 20, fontWeight: '800', color: '#f1f5f9', flex: 1, marginRight: 12 },
  caloriePill: { backgroundColor: '#22c55e20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#22c55e40', flexDirection: 'row', alignItems: 'baseline' },
  calorieVal: { fontSize: 22, fontWeight: '900', color: '#22c55e' },
  calorieUnit: { fontSize: 12, color: '#22c55e99' },

  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  nutrientCard: { width: '30.5%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  nutrientVal: { fontSize: 18, fontWeight: '800' },
  nutrientUnit: { fontSize: 11, fontWeight: '400' },
  nutrientLabel: { fontSize: 11, marginTop: 3, fontWeight: '600' },

  logBtn: { backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
