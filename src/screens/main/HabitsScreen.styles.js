import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  screen: {
    flex: 1,
    position: 'relative',
  },

  scrollContent: {
    paddingBottom: 120,
  },

  loaderWrap: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  kicker: {
    color: '#7FA8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },

  title: {
    color: '#F7FAFF',
    fontSize: 34,
    fontWeight: '800',
  },

  monthTitle: {
    color: '#8EA4C8',
    fontSize: 14,
    marginTop: 6,
    textTransform: 'capitalize',
  },

  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.22)',
  },

  headerBadgeText: {
    color: '#DCEBFF',
    fontWeight: '700',
  },

  addCard: {
    gap: 10,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },

  input: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0E1628',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.15)',
    color: '#F4F8FF',
    paddingHorizontal: 14,
    fontSize: 15,
  },

  addButton: {
    minWidth: 86,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 4,
  },

  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },

  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorDotActive: {
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ scale: 1.08 }],
  },

  horizontalContent: {
    paddingBottom: 10,
    paddingRight: 24,
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  leftSpacer: {
    width: 320,
    minWidth: 320,
  },

  monthDaysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },

  monthDayText: {
    width: 18,
    textAlign: 'center',
    color: '#7E8CA8',
    fontSize: 11,
    fontWeight: '600',
  },

  monthDayTextToday: {
    color: '#DCEBFF',
    fontWeight: '800',
  },

  emptyCard: {
    marginTop: 20,
    borderRadius: 22,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    width: 420,
  },

  emptyTitle: {
    color: '#EAF2FF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
  },

  emptyText: {
    color: '#96A5BF',
    marginTop: 6,
    fontSize: 14,
  },

  habitCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  habitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  habitLeftColumn: {
    width: 320,
    minWidth: 320,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingRight: 12,
  },

  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  habitInfo: {
    flex: 1,
  },

  habitTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
  },

  habitDescription: {
    color: '#A9B8D3',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  habitHint: {
    color: '#7E8CA8',
    fontSize: 12,
    marginTop: 4,
  },

  streakText: {
    color: '#F5B041',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },

  dayCell: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  dayCellDisabled: {
    opacity: 0.35,
  },

  futureDayDisabled: {
    opacity: 0.8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.18)',
  },

  modalTitle: {
    color: '#F7FAFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },

  modalInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#F4F8FF',
    paddingHorizontal: 14,
  },

  modalTextarea: {
    minHeight: 90,
    height: 90,
    paddingTop: 12,
    marginTop: 12,
  },

  modalColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },

  modalColorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },

  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },

  modalCancel: {
    backgroundColor: '#182235',
  },

  modalSave: {
    backgroundColor: '#2563EB',
  },

  modalCancelText: {
    color: '#D9E6FF',
    fontWeight: '600',
  },

  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default styles;