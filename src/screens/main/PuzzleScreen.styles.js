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
    width: '100%',
    paddingTop: 16,
  },

  emptyText: {
    color: '#A9B8D3',
    fontSize: 16,
    marginTop: 16,
    lineHeight: 22,
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

  tabsWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  tabButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  tabButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
    ...webGlow,
  },

  tabButtonText: {
    color: '#AFC3E6',
    fontSize: 14,
    fontWeight: '700',
  },

  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  paywallCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.22)',
  },

  paywallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  paywallTitle: {
    color: '#F7FAFF',
    fontSize: 20,
    fontWeight: '800',
  },

  paywallText: {
    color: '#C7D6EE',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },

  paywallBullet: {
    color: '#C7D6EE',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },

  paywallStatusBox: {
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  paywallStatusLabel: {
    color: '#8EA4C8',
    fontSize: 12,
    marginBottom: 6,
  },

  paywallStatusValue: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
  },

  premiumCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.16)',
    marginBottom: 14,
  },

  premiumHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  premiumCardTitle: {
    color: '#F7FAFF',
    fontSize: 18,
    fontWeight: '800',
  },

  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.22)',
  },

  premiumBadgeText: {
    color: '#CFFFE0',
    fontSize: 12,
    fontWeight: '700',
  },

  premiumInfoText: {
    color: '#AFC3E6',
    fontSize: 13,
    marginBottom: 14,
  },

  label: {
    color: '#EAF2FF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  promptInput: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: '#0E1628',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#F4F8FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },

  premiumButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  secondaryActionButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  secondaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  primaryActionButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  selectedImageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
  },

  selectedImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#0E1628',
  },

  selectedImageMeta: {
    flex: 1,
  },

  selectedImageTitle: {
    color: '#F7FAFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },

  selectedImageText: {
    color: '#AFC3E6',
    fontSize: 13,
    lineHeight: 18,
  },

  selectedImagePlaceholder: {
    minHeight: 72,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  selectedImagePlaceholderText: {
    color: '#8EA4C8',
    fontSize: 13,
    fontWeight: '600',
  },

  cooldownBox: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  cooldownLabel: {
    color: '#8EA4C8',
    fontSize: 12,
    marginBottom: 6,
  },

  cooldownValue: {
    color: '#F7FAFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  cooldownMeta: {
    color: '#AFC3E6',
    fontSize: 12,
    marginTop: 6,
  },

  jobInfoWrap: {
    gap: 8,
  },

  jobInfoLine: {
    color: '#E5E7EB',
    fontSize: 14,
  },

  jobPrompt: {
    color: '#CFE0FF',
    fontSize: 13,
    lineHeight: 19,
  },

  jobErrorText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 19,
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