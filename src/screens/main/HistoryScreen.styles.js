import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({

    
  gradient: {
    flex: 1,
  },

  screen: {
    flex: 1,
    position: 'relative',
  },

  loaderWrap: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  kicker: {
    color: '#7FA8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
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

  title: {
    color: '#F7FAFF',
    fontSize: 32,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  dayCard: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },

  dayNumber: {
    color: '#F7FAFF',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },

  dayLabel: {
    color: '#8EA4C8',
    fontSize: 14,
    textTransform: 'capitalize',
  },

  emptyDayText: {
    color: '#6F829F',
    fontSize: 14,
  },

  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },

  rowText: {
    color: '#F7FAFF',
    fontSize: 15,
  },

  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.14)',
  },

  pressed: {
    opacity: 0.7,
  },


  topRightStats: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

statBadge: {
  minWidth: 52,
  height: 38,
  paddingHorizontal: 12,
  borderRadius: 14,
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

statBadgeText: {
  color: '#F7FAFF',
  fontSize: 16,
  fontWeight: '700',
},
});

