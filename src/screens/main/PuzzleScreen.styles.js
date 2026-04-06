import { StyleSheet, Platform } from 'react-native';

const webGlow = Platform.OS === 'web'
  ? { boxShadow: '0 0 18px rgba(103,168,255,0.22)' }
  : {};

const webPieceShadow = Platform.OS === 'web'
  ? { boxShadow: '0 8px 18px rgba(0,0,0,0.22)' }
  : {};

const styles = StyleSheet.create({
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

  emptyWrap: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 18,
  },

  emptyText: {
    color: '#A9B8D3',
    fontSize: 16,
    marginTop: 16,
  },

  container: {
    paddingTop: 56,
    paddingHorizontal: 14,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },

  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },

  title: {
    color: '#F7FAFF',
    fontSize: 34,
    fontWeight: '800',
  },

  subtitle: {
    color: '#8EA4C8',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },

  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.22)',
    ...webGlow,
  },

  flameBadgeText: {
    color: '#DCEBFF',
    fontWeight: '700',
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  navButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonDisabled: {
    opacity: 0.35,
  },

  navCenter: {
    flex: 1,
    alignItems: 'center',
  },

  navTitle: {
    color: '#F7FAFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  navMeta: {
    color: '#8EA4C8',
    fontSize: 12,
    marginTop: 4,
  },

  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },

  statItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  statLabel: {
    color: '#8EA4C8',
    fontSize: 12,
    marginBottom: 8,
  },

  statValue: {
    color: '#F7FAFF',
    fontSize: 20,
    fontWeight: '800',
  },

  unlocksLoader: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  boardOuter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  boardFrame: {
    borderRadius: 24,
    padding: 10,
    backgroundColor: 'rgba(12,18,36,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...webGlow,
  },

  boardGradient: {
    borderRadius: 18,
    overflow: 'hidden',
  },

  board: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#0E1628',
    borderRadius: 18,
    overflow: 'hidden',
  },

  piecePressable: {
    position: 'absolute',
    zIndex: 2,
    overflow: 'visible',
  },

  pieceSvg: {
    position: 'absolute',
    zIndex: 3,
    overflow: 'visible',
    ...webPieceShadow,
  },

  pieceShadowNative: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  lockBadge: {
    position: 'absolute',
    zIndex: 4,
    width: 46,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(8,14,28,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  pieceLockedText: {
    color: '#D2E2FF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  downloadButton: {
    marginTop: 18,
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  downloadButtonText: {
    color: '#F7FAFF',
    fontWeight: '700',
  },

  bottomVariantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  variantBtn: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  variantBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  variantBtnText: {
    color: '#F7FAFF',
    fontWeight: '700',
  },
});

export default styles;