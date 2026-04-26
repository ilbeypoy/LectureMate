import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, ClassColors, DAYS_OF_WEEK } from '../../constants/colors';
import {
  getAllClasses,
  getAllScheduleEntries,
  insertClass,
  insertScheduleEntry,
  deleteClass,
  deleteScheduleEntry,
} from '../../db/database';
import { scheduleClassReminders } from '../../services/notifications';
import type { LMClass, LMScheduleEntry } from '../../types';
import { generateId, formatHourMinute } from '../../utils/format';

export default function ScheduleScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 1 : new Date().getDay() + 1);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [entries, setEntries] = useState<LMScheduleEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showNewClassForm, setShowNewClassForm] = useState(false);

  // Form state
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [endTime, setEndTime] = useState(new Date(2024, 0, 1, 10, 30));
  const [location, setLocation] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [newClassName, setNewClassName] = useState('');
  const [newProfessor, setNewProfessor] = useState('');
  const [newColor, setNewColor] = useState(ClassColors[0]);

  const refresh = useCallback(async () => {
    const [c, e] = await Promise.all([getAllClasses(), getAllScheduleEntries()]);
    setClasses(c);
    setEntries(e);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const dayEntries = entries
    .filter((e) => e.dayOfWeek === selectedDay)
    .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    const c: LMClass = {
      id: generateId(),
      name: newClassName.trim(),
      professorName: newProfessor.trim() || null,
      colorHex: newColor,
      createdAt: Date.now(),
    };
    await insertClass(c);
    setSelectedClassId(c.id);
    setNewClassName('');
    setNewProfessor('');
    setShowNewClassForm(false);
    await refresh();
  };

  const handleAddEntry = async () => {
    if (!selectedClassId) return;
    const e: LMScheduleEntry = {
      id: generateId(),
      classId: selectedClassId,
      dayOfWeek: selectedDay,
      startHour: startTime.getHours(),
      startMinute: startTime.getMinutes(),
      endHour: endTime.getHours(),
      endMinute: endTime.getMinutes(),
      location: location.trim() || null,
    };
    await insertScheduleEntry(e);
    setShowForm(false);
    setSelectedClassId(null);
    setLocation('');
    await refresh();

    // Bildirimleri yenile
    const allEntries = await getAllScheduleEntries();
    const allClasses = await getAllClasses();
    scheduleClassReminders(allEntries, allClasses).catch(() => {});
  };

  const handleDeleteEntry = (entry: LMScheduleEntry) => {
    Alert.alert('Sil?', 'Bu ders programi silinecek.', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteScheduleEntry(entry.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ders Programi</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Gun secici */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysRow}
      >
        {DAYS_OF_WEEK.map((day) => (
          <TouchableOpacity
            key={day.id}
            style={[
              styles.dayChip,
              selectedDay === day.id && styles.dayChipActive,
            ]}
            onPress={() => setSelectedDay(day.id)}
          >
            <Text
              style={[
                styles.dayChipText,
                selectedDay === day.id && styles.dayChipTextActive,
              ]}
            >
              {day.short}
            </Text>
            <Text
              style={[
                styles.dayChipCount,
                selectedDay === day.id && styles.dayChipTextActive,
              ]}
            >
              {entries.filter((e) => e.dayOfWeek === day.id).length}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Program listesi */}
      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Bu gun ders yok</Text>
            <Text style={styles.emptyHint}>+ butonuna basarak ders ekle</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cls = classes.find((c) => c.id === item.classId);
          return (
            <TouchableOpacity
              style={styles.entryCard}
              onLongPress={() => handleDeleteEntry(item)}
            >
              <View style={styles.entryTime}>
                <Text style={styles.entryTimeStart}>
                  {formatHourMinute(item.startHour, item.startMinute)}
                </Text>
                <Text style={styles.entryTimeEnd}>
                  {formatHourMinute(item.endHour, item.endMinute)}
                </Text>
              </View>
              {cls && (
                <View style={[styles.entryColorBar, { backgroundColor: cls.colorHex }]} />
              )}
              <View style={styles.entryContent}>
                <Text style={styles.entryClassName}>{cls?.name ?? 'Ders'}</Text>
                {cls?.professorName && (
                  <Text style={styles.entryProfessor}>{cls.professorName}</Text>
                )}
                {item.location && (
                  <View style={styles.entryLocation}>
                    <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.entryLocationText}>{item.location}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={{ color: Colors.primary, fontSize: 16 }}>Iptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ders Ekle</Text>
            <TouchableOpacity
              onPress={handleAddEntry}
              disabled={!selectedClassId}
            >
              <Text
                style={{
                  color: selectedClassId ? Colors.primary : Colors.textSecondary,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Kaydet
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Ders secici */}
            <View>
              <Text style={styles.formLabel}>Ders</Text>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.classOption,
                    selectedClassId === c.id && styles.classOptionActive,
                  ]}
                  onPress={() => setSelectedClassId(c.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: c.colorHex }]} />
                  <Text style={styles.classOptionText}>{c.name}</Text>
                  {selectedClassId === c.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addClassButton}
                onPress={() => setShowNewClassForm(!showNewClassForm)}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={{ color: Colors.primary }}>Yeni Ders Ekle</Text>
              </TouchableOpacity>

              {showNewClassForm && (
                <View style={styles.newClassForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ders Adi"
                    value={newClassName}
                    onChangeText={setNewClassName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Hoca Adi (istege bagli)"
                    value={newProfessor}
                    onChangeText={setNewProfessor}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
                      {ClassColors.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorPicker,
                            { backgroundColor: color },
                            newColor === color && styles.colorPickerActive,
                          ]}
                          onPress={() => setNewColor(color)}
                        />
                      ))}
                    </View>
                  </ScrollView>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !newClassName.trim() && { opacity: 0.5 },
                    ]}
                    onPress={handleAddClass}
                    disabled={!newClassName.trim()}
                  >
                    <Text style={styles.primaryButtonText}>Dersi Olustur</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Saat */}
            <View>
              <Text style={styles.formLabel}>Saat</Text>
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.timeLabel}>Baslangic</Text>
                <Text style={styles.timeValue}>
                  {formatHourMinute(startTime.getHours(), startTime.getMinutes())}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.timeLabel}>Bitis</Text>
                <Text style={styles.timeValue}>
                  {formatHourMinute(endTime.getHours(), endTime.getMinutes())}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Konum */}
            <View>
              <Text style={styles.formLabel}>Konum (istege bagli)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ornek: A Blok 204"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (date) setStartTime(date);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (date) setEndTime(date);
                }}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  dayChip: {
    width: 50, height: 60, borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  dayChipTextActive: { color: 'white' },
  dayChipCount: { fontSize: 11, color: Colors.textSecondary },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyHint: { fontSize: 13, color: Colors.textSecondary },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  entryTime: { padding: 12, alignItems: 'center', justifyContent: 'center', width: 70 },
  entryTimeStart: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  entryTimeEnd: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  entryColorBar: { width: 4 },
  entryContent: { flex: 1, padding: 12, gap: 4 },
  entryClassName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  entryProfessor: { fontSize: 12, color: Colors.textSecondary },
  entryLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryLocationText: { fontSize: 11, color: Colors.textSecondary },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  formLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  classOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  classOptionActive: { backgroundColor: `${Colors.primary}15`, borderWidth: 1, borderColor: Colors.primary },
  classOptionText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  addClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    justifyContent: 'center',
  },
  newClassForm: {
    backgroundColor: Colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  input: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  colorPicker: {
    width: 32, height: 32, borderRadius: 16,
  },
  colorPickerActive: { borderWidth: 3, borderColor: Colors.textPrimary },
  primaryButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  timeLabel: { fontSize: 15, color: Colors.textPrimary },
  timeValue: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
});
