import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Dimensions, Platform, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyzeFoodImage, analyzeFoodText } from '../utils/openai';
import { getTodayLog, saveTodayLog } from '../utils/storage';

const MEAL_TYPES = [
  { key: 'Breakfast', icon: '🌅' },
  { key: 'Lunch',     icon: '☀️' },
  { key: 'Dinner',    icon: '🌙' },
  { key: 'Snacks',    icon: '🍎' },
];

const NUTRIENTS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#22c55e', bg: '#052e16' },
  { key: 'protein', label: 'Protein', unit: 'g',  color: '#22c55e', bg: '#052e16' },
  { key: 'carbs',   label: 'Carbs',   unit: 'g',  color: '#f59e0b', bg: '#1c1003' },
  { key: 'fat',     label: 'Fat',     unit: 'g',  color: '#f87171', bg: '#2d0a0a' },
  { key: 'fiber',   label: 'Fiber',   unit: 'g',  color: '#60a5fa', bg: '#0a1628' },
  { key: 'sugar',   label: 'Sugar',   unit: 'g',  color: '#f472b6', bg: '#2d0a1e' },
  { key: 'sodium',  label: 'Sodium',  unit: 'mg', color: '#a78bfa', bg: '#150a2d' },
];

// Known foods database — deterministic, verified values per 100g or standard serving
const QUICK_FOODS = [
  { name: 'Boiled Egg', icon: '🥚', calories: 70, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.6, sodium: 62, serving: '1 large (50g)' },
  { name: 'Banana', icon: '🍌', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1, serving: '1 medium (118g)' },
  { name: 'Chicken Breast', icon: '🍗', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, serving: '100g cooked' },
  { name: 'White Rice', icon: '🍚', calories: 206, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0, sodium: 2, serving: '1 cup (158g)' },
  { name: 'Milk', icon: '🥛', calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, sodium: 105, serving: '1 cup (244ml)' },
  { name: 'Apple', icon: '🍎', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2, serving: '1 medium (182g)' },
  { name: 'Oats', icon: '🥣', calories: 154, protein: 5, carbs: 27, fat: 2.6, fiber: 4, sugar: 1, sodium: 1, serving: '½ cup dry (40g)' },
  { name: 'Almonds', icon: '🥜', calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, sodium: 0, serving: '1 oz (28g / ~23 nuts)' },
  { name: 'Whey Protein', icon: '🥤', calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sugar: 1, sodium: 130, serving: '1 scoop (33g)' },
  { name: 'Brown Rice', icon: '🍚', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, sodium: 10, serving: '1 cup (195g)' },
  { name: 'Bread', icon: '🍞', calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6, sugar: 1.4, sodium: 132, serving: '1 slice (30g)' },
  { name: 'Potato', icon: '🥔', calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8, sugar: 1.7, sodium: 17, serving: '1 medium (173g)' },
];

export default function MealLogScreen({ navigation }) {
  const [mode, setMode] = useState('photo'); // 'photo' | 'manual' | 'quick'

  // Photo mode state
  const [image, setImage] = useState(null);
  const [photoResult, setPhotoResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Manual mode state
  const [inputText, setInputText] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [manualError, setManualError] = useState(null);

  // Editable state
  const [editingField, setEditingField] = useState(null); // { id, field } or null
  const [editValue, setEditValue] = useState('');

  // Shared
  const [mealType, setMealType] = useState('Breakfast');
  const [error, setError] = useState(null);

  // Photo mode functions
  const pickPhoto = async () => {
    const pic = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!pic.canceled) { setImage(pic.assets[0]); setPhotoResult(null); setError(null); }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setError('Camera permission required.'); return; }
    const pic = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!pic.canceled) { setImage(pic.assets[0]); setPhotoResult(null); setError(null); }
  };

  const analyzePhoto = async () => {
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
      setPhotoResult(await analyzeFoodImage(base64));
    } catch (e) {
      setError(e.message || 'Analysis failed. Check your API key or quota.');
    } finally {
      setLoading(false);
    }
  };

  // Manual mode functions
  const addIngredient = async () => {
    if (!inputText.trim()) { setManualError('Please describe what you ate.'); return; }
    setAnalyzing(true);
    setManualError(null);
    try {
      const result = await analyzeFoodText(inputText.trim());
      setIngredients(prev => [...prev, { ...result, id: Date.now() }]);
      setInputText('');
    } catch (e) {
      setManualError(e.message || 'Analysis failed. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const removeIngredient = (id) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const totals = ingredients.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein:  acc.protein  + (item.protein  || 0),
    carbs:    acc.carbs    + (item.carbs    || 0),
    fat:      acc.fat      + (item.fat      || 0),
    fiber:    acc.fiber    + (item.fiber    || 0),
    sugar:    acc.sugar    + (item.sugar    || 0),
    sodium:   acc.sodium   + (item.sodium   || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

  // Quick add function
  const quickAdd = (food) => {
    setIngredients(prev => [...prev, { ...food, id: Date.now() }]);
  };

  // Edit function
  const startEdit = (id, field, currentValue) => {
    setEditingField({ id, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = () => {
    if (!editingField) return;
    const val = parseFloat(editValue);
    if (isNaN(val)) { setEditingField(null); return; }
    setPhotoResult(prev => ({ ...prev, [editingField.field]: val }));
    setIngredients(prev => prev.map(item =>
      item.id === editingField.id ? { ...item, [editingField.field]: val } : item
    ));
    setEditingField(null);
    setEditValue('');
  };

  // Log functions
  const logPhotoMeal = async () => {
    const log = await getTodayLog();
    log.meals.push({ ...photoResult, mealType, time: new Date().toISOString() });
    await saveTodayLog(log);
    navigation.navigate('Home');
  };

  const logManualMeal = async () => {
    if (ingredients.length === 0) return;
    const log = await getTodayLog();
    const name = ingredients.length === 1
      ? ingredients[0].name
      : `${ingredients.length} items`;
    log.meals.push({ ...totals, name, mealType, time: new Date().toISOString(), items: ingredients });
    await saveTodayLog(log);
    navigation.navigate('Home');
  };

  return (
    <View style={s.container}>
      <View style={Platform.OS === 'web' ? { height: Dimensions.get('window').height, overflow: 'hidden' } : { flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Meal Type */}
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

        {/* Mode Toggle */}
        <View style={s.modeRow}>
          <TouchableOpacity style={[s.modeBtn, mode === 'photo' && s.modeBtnActive]} onPress={() => setMode('photo')}>
            <Text style={[s.modeBtnText, mode === 'photo' && s.modeBtnTextActive]}>📷 Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modeBtn, mode === 'manual' && s.modeBtnActive]} onPress={() => setMode('manual')}>
            <Text style={[s.modeBtnText, mode === 'manual' && s.modeBtnTextActive]}>✏️ Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modeBtn, mode === 'quick' && s.modeBtnActive]} onPress={() => setMode('quick')}>
            <Text style={[s.modeBtnText, mode === 'quick' && s.modeBtnTextActive]}>⚡ Quick</Text>
          </TouchableOpacity>
        </View>

        {/* ===== PHOTO MODE ===== */}
        {mode === 'photo' && (
          <>
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
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setImage(null); setPhotoResult(null); setError(null); }}>
                  <Text style={s.cancelBtnText}>✕ Remove Photo</Text>
                </TouchableOpacity>
              </>
            )}

            {error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {image && !photoResult && (
              <TouchableOpacity style={s.analyzeBtn} onPress={analyzePhoto} disabled={loading}>
                {loading
                  ? <><ActivityIndicator color="#fff" /><Text style={s.analyzeBtnText}>  Analyzing...</Text></>
                  : <Text style={s.analyzeBtnText}>✨ Analyze with AI</Text>}
              </TouchableOpacity>
            )}

            {photoResult && (
              <>
                <AccuracyBadge />
                <NutrientResult
                  result={photoResult}
                  onLog={logPhotoMeal}
                  mealType={mealType}
                  editable
                  onEdit={(field, val) => startEdit('photo', field, val)}
                />
              </>
            )}
          </>
        )}

        {/* ===== MANUAL MODE ===== */}
        {mode === 'manual' && (
          <>
            <AccuracyBadge />
            <Text style={s.sectionLabel}>Describe what you ate</Text>
            <TextInput
              style={s.textInput}
              placeholder="e.g. 2 scoops whey protein, 1 banana, 200ml milk, 10 almonds"
              placeholderTextColor="#334155"
              multiline
              numberOfLines={2}
              value={inputText}
              onChangeText={v => { setInputText(v); setManualError(null); }}
            />

            {manualError && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️ {manualError}</Text>
              </View>
            )}

            <TouchableOpacity style={s.addBtn} onPress={addIngredient} disabled={analyzing}>
              {analyzing
                ? <><ActivityIndicator color="#fff" /><Text style={s.addBtnText}>  Analyzing...</Text></>
                : <Text style={s.addBtnText}>+ Add Ingredient</Text>}
            </TouchableOpacity>

            {/* Running totals bar */}
            {ingredients.length > 0 && (
              <View style={s.totalsBar}>
                <Text style={s.totalsLabel}>Total: </Text>
                <Text style={s.totalsCals}>{Math.round(totals.calories)} kcal</Text>
                <Text style={s.totalsMacros}>P: {Math.round(totals.protein)}g · C: {Math.round(totals.carbs)}g · F: {Math.round(totals.fat)}g</Text>
              </View>
            )}

            {/* Ingredients list */}
            {ingredients.map((item, index) => (
              <View key={item.id} style={s.ingredientItem}>
                <View style={s.ingredientInfo}>
                  <Text style={s.ingredientNum}>{index + 1}</Text>
                  <View style={s.ingredientDetails}>
                    <Text style={s.ingredientName}>{item.name}</Text>
                    <Text style={s.ingredientMacros}>{item.calories} kcal · P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.ingredientDelete} onPress={() => removeIngredient(item.id)}>
                  <Text style={s.ingredientDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Nutrient grid when ingredients exist */}
            {ingredients.length > 0 && (
              <NutrientResult
                result={totals}
                onLog={logManualMeal}
                mealType={mealType}
                editable
                isTotals
                onEdit={(field, val) => startEdit('totals', field, val)}
              />
            )}
          </>
        )}

        {/* ===== QUICK ADD MODE ===== */}
        {mode === 'quick' && (
          <>
            <AccuracyBadge verified />
            <Text style={s.sectionLabel}>Common Foods (verified values)</Text>
            <Text style={s.quickSubtitle}>Tap to add — exact nutrition data per serving</Text>

            <View style={s.quickGrid}>
              {QUICK_FOODS.map((food, i) => (
                <TouchableOpacity key={i} style={s.quickCard} onPress={() => quickAdd(food)}>
                  <Text style={s.quickIcon}>{food.icon}</Text>
                  <Text style={s.quickName}>{food.name}</Text>
                  <Text style={s.quickCals}>{food.calories} kcal</Text>
                  <Text style={s.quickServing}>{food.serving}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {ingredients.length > 0 && (
              <>
                <View style={s.totalsBar}>
                  <Text style={s.totalsLabel}>Meal Total: </Text>
                  <Text style={s.totalsCals}>{Math.round(totals.calories)} kcal</Text>
                  <Text style={s.totalsMacros}>P: {Math.round(totals.protein)}g · C: {Math.round(totals.carbs)}g · F: {Math.round(totals.fat)}g</Text>
                </View>

                {ingredients.map((item, index) => (
                  <View key={item.id} style={s.ingredientItem}>
                    <View style={s.ingredientInfo}>
                      <Text style={s.ingredientNum}>{index + 1}</Text>
                      <View style={s.ingredientDetails}>
                        <Text style={s.ingredientName}>{item.name}</Text>
                        <Text style={s.ingredientMacros}>{item.calories} kcal · P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={s.ingredientDelete} onPress={() => removeIngredient(item.id)}>
                      <Text style={s.ingredientDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <NutrientResult
                  result={totals}
                  onLog={logManualMeal}
                  mealType={mealType}
                  isTotals
                />
              </>
            )}
          </>
        )}

      </ScrollView>
      </View>
    </View>
  );
}

// Accuracy badge component
function AccuracyBadge({ verified }) {
  return (
    <View style={s.accuracyBadge}>
      <Text style={s.accuracyIcon}>{verified ? '✅' : '⚡'}</Text>
      <Text style={s.accuracyText}>
        {verified ? 'Verified nutrition data' : 'AI estimate — tap any value to adjust'}
      </Text>
    </View>
  );
}

// Editable nutrient card component
function NutrientResult({ result, onLog, mealType, editable, isTotals, onEdit }) {
  const [editingField, setEditingField] = useState(null);
  const [editVal, setEditVal] = useState('');

  const handleTap = (field, value) => {
    if (!editable) return;
    setEditingField(field);
    setEditVal(String(Math.round(value)));
  };

  const save = () => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && editingField) {
      onEdit(editingField, num);
    }
    setEditingField(null);
    setEditVal('');
  };

  return (
    <View style={s.resultCard}>
      <View style={s.resultHeader}>
        <Text style={s.resultName}>{result.name || (isTotals ? 'Meal Total' : '')}</Text>
        <View style={s.caloriePill}>
          <TouchableOpacity onPress={() => handleTap('calories', result.calories)}>
            <Text style={[s.calorieVal, editingField === 'calories' && s.editingText]}>{Math.round(result.calories)}</Text>
          </TouchableOpacity>
          <Text style={s.calorieUnit}> kcal</Text>
        </View>
      </View>

      <View style={s.nutrientGrid}>
        {NUTRIENTS.filter(n => n.key !== 'calories').map(({ key, label, unit, color, bg }) => {
          const value = Math.round(result[key] || 0);
          const isEditing = editingField === key;
          return (
            <TouchableOpacity key={key} style={[s.nutrientCard, { backgroundColor: bg, borderColor: color + '33' }]}
              activeOpacity={editable ? 0.6 : 1}
              onPress={() => handleTap(key, result[key])}>
              {isEditing ? (
                <TextInput
                  style={[s.nutrientInput, { color }]}
                  value={editVal}
                  onChangeText={setEditVal}
                  onBlur={save}
                  onSubmitEditing={save}
                  keyboardType="decimal-pad"
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Text style={[s.nutrientVal, { color }]}>{value}<Text style={s.nutrientUnit}>{unit}</Text></Text>
              )}
              <Text style={[s.nutrientLabel, { color: color + 'bb' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={s.logBtn} onPress={onLog}>
        <Text style={s.logBtnText}>✅ Add to {mealType}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080f1a' },
  scroll: { padding: 20, paddingBottom: 60 },

  sectionLabel: { color: '#475569', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, backgroundColor: '#0f1f35', borderWidth: 1, borderColor: '#1e3a5f' },
  typeChipSel: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  typeChipIcon: { fontSize: 14 },
  typeChipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  typeChipTextSel: { color: '#22c55e' },

  // Mode toggle
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#0f1f35', borderWidth: 1, borderColor: '#1e3a5f', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#6366f120', borderColor: '#6366f1' },
  modeBtnText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  modeBtnTextActive: { color: '#818cf8' },

  // Accuracy badge
  accuracyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#333355', gap: 8 },
  accuracyIcon: { fontSize: 16 },
  accuracyText: { color: '#94a3b8', fontSize: 12, fontWeight: '500', flex: 1 },

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

  // Manual mode
  textInput: { backgroundColor: '#0f1f35', color: '#f1f5f9', borderRadius: 14, padding: 16, fontSize: 15, borderWidth: 1, borderColor: '#1e3a5f', marginBottom: 12, minHeight: 56, textAlignVertical: 'top' },

  addBtn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Quick add
  quickSubtitle: { color: '#475569', fontSize: 13, marginBottom: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '30.5%', backgroundColor: '#0f1f35', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e3a5f', alignItems: 'center', gap: 4 },
  quickIcon: { fontSize: 28 },
  quickName: { color: '#e2e8f0', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  quickCals: { color: '#22c55e', fontSize: 14, fontWeight: '800' },
  quickServing: { color: '#475569', fontSize: 10, textAlign: 'center' },

  totalsBar: { backgroundColor: '#0f1f35', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1e3a5f', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  totalsLabel: { color: '#475569', fontSize: 13, fontWeight: '600' },
  totalsCals: { color: '#22c55e', fontSize: 14, fontWeight: '800' },
  totalsMacros: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

  ingredientItem: { backgroundColor: '#0f1f35', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1e3a5f', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ingredientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ingredientNum: { color: '#6366f1', fontSize: 14, fontWeight: '800', marginRight: 12, width: 20 },
  ingredientDetails: { flex: 1 },
  ingredientName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  ingredientMacros: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  ingredientDelete: { backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#ef444440' },
  ingredientDeleteText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  resultCard: { backgroundColor: '#0f1f35', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  resultName: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', flex: 1, marginRight: 12 },
  caloriePill: { backgroundColor: '#22c55e20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#22c55e40', flexDirection: 'row', alignItems: 'baseline' },
  calorieVal: { fontSize: 22, fontWeight: '900', color: '#22c55e' },
  calorieUnit: { fontSize: 12, color: '#22c55e99' },

  nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  nutrientCard: { width: '30.5%', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  nutrientVal: { fontSize: 18, fontWeight: '800' },
  nutrientUnit: { fontSize: 11, fontWeight: '400' },
  nutrientLabel: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  nutrientInput: { fontSize: 18, fontWeight: '800', width: 60, textAlign: 'center', padding: 0 },
  editingText: { color: '#fbbf24 !important' },

  logBtn: { backgroundColor: '#22c55e', borderRadius: 14, padding: 16, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
