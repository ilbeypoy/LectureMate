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
  Platform,
  TouchableHighlight,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii, ClassColorsiOS } from '../../constants/theme';
import {
  getAllClasses,
  getAllScheduleEntries,
  insertClass,
  insertScheduleEntry,
  deleteScheduleEntry,
} from '../../db/database';
import { scheduleClassReminders } from '../../services/notifications';
import { LargeTitleScreen } from '../../components/ui/LargeTitleScreen';
import { ListSection } from '../../components/ui/ListSection';
import { ListRow } from '../../components/ui/ListRow';
import { Button } from '../../components/ui/Button';
import type { LMClass, LMScheduleEntry } from '../../types';
import { generateId, formatHourMinute } from '../../utils/format';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_TO_NUM: Record<string, number> = {
  monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6, saturday: 7, sunday: 1,
};

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const todayDayJs = new Date().getDay();
  const todayDayNum = todayDayJs === 0 ? 1 : todayDayJs + 1;
  const [selectedDay, setSelectedDay] = useState(todayDayNum);

  const [classes, setClasses] = useState<LMClass[]>([]);
  const [entries, setEntries] = useState<LMScheduleEntry[]>([]);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    const [c, e] = await Promise.all([getAllClasses(), getAllScheduleEntries()]);
    setClasses(c);
    setEntries(e);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const dayEntries = entries
    .filter((e) => e.dayOfWeek === selectedDay)
    .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));

  const handleDelete = (entry: LMScheduleEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t('schedule.deleteEntry'), t('schedule.deleteEntryMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteScheduleEntry(entry.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <>
      <LargeTitleScreen
        title={t('schedule.title')}
        rightAction={
          <TouchableOpacity onPress={() => setShowForm(true)} hitSlop={10}>
            <Ionicons name="add" size={28} color={colors.systemBlue} />
          </TouchableOpacity>
        }
        searchBar={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
          >
            {DAY_KEYS.map((dayKey) => {
              const num = DAY_TO_NUM[dayKey];
              const count = entries.filter((e) => e.dayOfWeek === num).length;
              const isSelected = selectedDay === num;
              return (
                <TouchableOpacity
                  key={dayKey}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedDay(num);
                  }}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected ? colors.systemBlue : colors.secondarySystemGroupedBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: isSelected ? '#FFFFFF' : colors.label },
                    ]}
                  >
                    {t(`schedule.daysShort.${dayKey}`)}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.dayChipBadge,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.25)'
                            : colors.systemBlue + '22',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayChipBadgeText,
                          { color: isSelected ? '#FFFFFF' : colors.systemBlue },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        }
      >
        {dayEntries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={colors.tertiaryLabel} />
            <Text style={[styles.emptyTitle, { color: colors.label }]}>
              {t('schedule.empty')}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.secondaryLabel }]}>
              {t('schedule.emptyHint')}
            </Text>
          </View>
        ) : (
          <ListSection>
            {dayEntries.map((entry) => {
              const cls = classes.find((c) => c.id === entry.classId);
              return (
                <TouchableHighlight
                  key={entry.id}
                  underlayColor={colors.systemFill}
                  onLongPress={() => handleDelete(entry)}
                >
                  <View style={[styles.scheduleRow, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
                    <View style={styles.timeCol}>
                      <Text style={[styles.timeStart, { color: colors.label }]}>
                        {formatHourMinute(entry.startHour, entry.startMinute)}
                      </Text>
                      <Text style={[styles.timeEnd, { color: colors.secondaryLabel }]}>
                        {formatHourMinute(entry.endHour, entry.endMinute)}
                      </Text>
                    </View>

                    <View style={[styles.timeline, { backgroundColor: cls?.colorHex ?? colors.systemGray }]} />

                    <View style={styles.contentCol}>
                      <Text style={[styles.classNameText, { color: colors.label }]}>
                        {cls?.name ?? '?'}
                      </Text>
                      {cls?.professorName && (
                        <Text style={[styles.professorText, { color: colors.secondaryLabel }]}>
                          {cls.professorName}
                        </Text>
                      )}
                      {entry.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={11} color={colors.tertiaryLabel} />
                          <Text style={[styles.locationText, { color: colors.tertiaryLabel }]}>
                            {entry.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableHighlight>
              );
            })}
          </ListSection>
        )}
      </LargeTitleScreen>

      <ScheduleForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await refresh();
          const [allEntries, allClasses] = await Promise.all([
            getAllScheduleEntries(),
            getAllClasses(),
          ]);
          scheduleClassReminders(allEntries, allClasses).catch(() => {});
        }}
        defaultDay={selectedDay}
        classes={classes}
      />
    </>
  );
}

function ScheduleForm({
  visible,
  onClose,
  onSaved,
  defaultDay,
  classes,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultDay: number;
  classes: LMClass[];
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [day, setDay] = useState(defaultDay);
  const [startTime, setStartTime] = useState(new Date(2024, 0, 1, 9, 0));
  const [endTime, setEndTime] = useState(new Date(2024, 0, 1, 10, 30));
  const [location, setLocation] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Yeni ders formu
  const [showNewClass, setShowNewClass] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('');
  const [newColor, setNewColor] = useState(ClassColorsiOS[0]);

  const handleAddClass = async () => {
    if (!newName.trim()) return;
    const c: LMClass = {
      id: generateId(),
      name: newName.trim(),
      professorName: newProf.trim() || null,
      colorHex: newColor,
      createdAt: Date.now(),
    };
    await insertClass(c);
    setSelectedClassId(c.id);
    setNewName('');
    setNewProf('');
    setShowNewClass(false);
    classes.push(c);
  };

  const handleSubmit = async () => {
    if (!selectedClassId) return;
    const e: LMScheduleEntry = {
      id: generateId(),
      classId: selectedClassId,
      dayOfWeek: day,
      startHour: startTime.getHours(),
      startMinute: startTime.getMinutes(),
      endHour: endTime.getHours(),
      endMinute: endTime.getMinutes(),
      location: location.trim() || null,
    };
    await insertScheduleEntry(e);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSaved();
    setSelectedClassId(null);
    setLocation('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.systemGroupedBackground }}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.systemBlue, ...Typography.body }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[Typography.headline, { color: colors.label }]}>
            {t('schedule.addClass')}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={!selectedClassId}>
            <Text
              style={{
                color: selectedClassId ? colors.systemBlue : colors.tertiaryLabel,
                ...Typography.body,
                fontWeight: '600',
              }}
            >
              {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingVertical: Spacing.base }}>
          {/* Ders secimi */}
          <ListSection header={t('schedule.selectClass')}>
            {classes.map((c) => (
              <ListRow
                key={c.id}
                title={c.name}
                onPress={() => setSelectedClassId(c.id)}
                rightElement={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.colorDot, { backgroundColor: c.colorHex }]} />
                    {selectedClassId === c.id && (
                      <Ionicons name="checkmark" size={20} color={colors.systemBlue} />
                    )}
                  </View>
                }
              />
            ))}
            <ListRow
              title={t('schedule.addNewClass')}
              icon="add-circle-outline"
              iconBackground={colors.systemBlue}
              titleStyle={{ color: colors.systemBlue }}
              onPress={() => setShowNewClass(!showNewClass)}
            />
          </ListSection>

          {/* Yeni ders formu */}
          {showNewClass && (
            <ListSection header={t('schedule.newClass')}>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
                <TextInput
                  placeholder={t('schedule.className')}
                  placeholderTextColor={colors.tertiaryLabel}
                  value={newName}
                  onChangeText={setNewName}
                  style={[styles.input, { color: colors.label }]}
                />
              </View>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
                <TextInput
                  placeholder={t('schedule.professor')}
                  placeholderTextColor={colors.tertiaryLabel}
                  value={newProf}
                  onChangeText={setNewProf}
                  style={[styles.input, { color: colors.label }]}
                />
              </View>
              <View style={[styles.colorPickerRow, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
                <Text style={[Typography.body, { color: colors.label }]}>{t('schedule.color')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 12 }}>
                    {ClassColorsiOS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setNewColor(c)}
                        style={[
                          styles.colorPick,
                          { backgroundColor: c, borderWidth: newColor === c ? 3 : 0, borderColor: colors.label },
                        ]}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={{ padding: Spacing.base }}>
                <Button
                  title={t('schedule.createClass')}
                  onPress={handleAddClass}
                  disabled={!newName.trim()}
                />
              </View>
            </ListSection>
          )}

          {/* Saat */}
          <ListSection header={t('schedule.time')}>
            <ListRow
              title={t('schedule.startTime')}
              detail={formatHourMinute(startTime.getHours(), startTime.getMinutes())}
              onPress={() => setShowStartPicker(true)}
            />
            <ListRow
              title={t('schedule.endTime')}
              detail={formatHourMinute(endTime.getHours(), endTime.getMinutes())}
              onPress={() => setShowEndPicker(true)}
            />
          </ListSection>

          {/* Konum */}
          <ListSection header={t('schedule.location')}>
            <View style={[styles.inputContainer, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <TextInput
                placeholder={t('schedule.locationPlaceholder')}
                placeholderTextColor={colors.tertiaryLabel}
                value={location}
                onChangeText={setLocation}
                style={[styles.input, { color: colors.label }]}
              />
            </View>
          </ListSection>

          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) setStartTime(date);
              }}
              themeVariant={isDark ? 'dark' : 'light'}
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
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  daysRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 56,
    justifyContent: 'center',
  },
  dayChipText: { ...Typography.subheadline, fontWeight: '600' },
  dayChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dayChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    minHeight: 64,
  },
  timeCol: {
    width: 56,
    alignItems: 'center',
  },
  timeStart: { ...Typography.headline, fontVariant: ['tabular-nums'] },
  timeEnd: { ...Typography.caption1, fontVariant: ['tabular-nums'], marginTop: 2 },
  timeline: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 1.5,
    marginHorizontal: Spacing.md,
  },
  contentCol: { flex: 1, gap: 2 },
  classNameText: { ...Typography.body, fontWeight: '600' },
  professorText: { ...Typography.footnote },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { ...Typography.caption1 },

  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.title3 },
  emptyHint: { ...Typography.subheadline, textAlign: 'center' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    ...Typography.body,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  colorPick: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
