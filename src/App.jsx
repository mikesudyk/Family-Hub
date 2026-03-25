import { useRef, useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import JoinScreen from './components/JoinScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import WelcomeScreen from './components/WelcomeScreen';
import OnboardingFlow from './components/OnboardingFlow';
import CalendarSetup from './components/CalendarSetup';
import FamilyHub from './components/FamilyHub';
import CalendarScreen from './components/CalendarScreen';
import ChildProfile from './components/ChildProfile';
import MyChoresChild from './components/MyChoresChild';
import ChoreDetail from './components/ChoreDetail';
import FamilyGoals from './components/FamilyGoals';
import AdminDashboard from './components/AdminDashboard';
import AdminProfiles from './components/AdminProfiles';
import AdminChoreBuilder from './components/AdminChoreBuilder';
import AdminAssignments from './components/AdminAssignments';
import AdminCountdown from './components/AdminCountdown';
import AdminChoreLists from './components/AdminChoreLists';
import AdminChoreListDetail from './components/AdminChoreListDetail';
import AdminListAssign from './components/AdminListAssign';
import AdminSchoolGoals from './components/AdminSchoolGoals';
import ParentProfile from './components/ParentProfile';
import PrintView from './components/PrintView';
import MealLibrary from './components/MealLibrary';
import MealForm from './components/MealForm';
import ShoppingLists from './components/ShoppingLists';
import ShoppingListDetail from './components/ShoppingListDetail';
import { BottomNav } from './components/ui';
import DailyOverview from './components/DailyOverview';
import FeedbackScreen from './components/FeedbackScreen';
import DesignSystem from './components/DesignSystem';

function Router() {
  const { screen, screenData, getMember, getTier } = useApp();

  switch (screen) {
    case 'hub':
      return <FamilyHub />;

    case 'calendar':
      return <CalendarScreen />;

    case 'child-profile': {
      const member = getMember(screenData);
      if (!member) return <FamilyHub />;
      const tier = getTier(member);
      if (tier === 'child') return <MyChoresChild memberId={member.id} />;
      if (tier === 'admin') return <ParentProfile memberId={member.id} />;
      return <ChildProfile memberId={member.id} />;
    }

    case 'chore-detail':
      return <ChoreDetail choreId={screenData.choreId} memberId={screenData.memberId} />;

    case 'family-goals':
      return <FamilyGoals />;

    case 'admin-dashboard':
      return <AdminDashboard />;

    case 'admin-profiles':
      return <AdminProfiles />;

    case 'admin-chore-builder':
      return <AdminChoreBuilder />;

    case 'admin-assignments':
      return <AdminAssignments />;

    case 'admin-countdown':
      return <AdminCountdown />;

    case 'admin-chore-lists':
      return <AdminChoreLists />;

    case 'admin-chore-list-detail':
      return <AdminChoreListDetail listId={screenData} />;

    case 'admin-list-assign':
      return <AdminListAssign listId={screenData} />;

    case 'admin-school-goals':
      return <AdminSchoolGoals />;

    case 'shopping-lists':
      return <ShoppingLists />;

    case 'shopping-list-detail':
      return <ShoppingListDetail />;

    case 'meal-library':
      return <MealLibrary />;

    case 'meal-form':
      return <MealForm />;

    case 'admin-calendars':
      return <CalendarSetup onDone={() => navigate('admin-dashboard')} inSettings />;

    case 'print-view':
      return <PrintView memberId={screenData} />;

    case 'feedback':
      return <FeedbackScreen />;

    case 'design-system':
      return <DesignSystem />;

    default:
      return <FamilyHub />;
  }
}

function AppShell() {
  const contentRef = useRef(null);
  const lastScrollY = useRef(0);
  const [navVisible, setNavVisible] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const swipeXRef = useRef(0);
  const gesture = useRef(null); // 'pull' | 'swipe-back' | null
  const { showDailyOverview, setShowDailyOverview, refresh, goBack, canGoBack } = useApp();
  const refreshRef = useRef(refresh);
  const goBackRef = useRef(goBack);
  const canGoBackRef = useRef(canGoBack);
  refreshRef.current = refresh;
  goBackRef.current = goBack;
  canGoBackRef.current = canGoBack;

  const PTR_THRESHOLD = 70;
  const SWIPE_THRESHOLD = 80;
  const EDGE_ZONE = 30; // px from left edge to start swipe-back

  function handleScroll() {
    const el = contentRef.current;
    if (!el) return;
    const curr = el.scrollTop;
    if (curr < 50 || curr < lastScrollY.current - 5) {
      setNavVisible(true);
    } else if (curr > lastScrollY.current + 5) {
      setNavVisible(false);
    }
    lastScrollY.current = curr;
  }

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function onTouchStart(e) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      gesture.current = null;
    }

    function onTouchMove(e) {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;

      // Determine gesture on first significant movement
      if (gesture.current === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (
          dx > 0 &&
          Math.abs(dx) > Math.abs(dy) &&
          touchStartX.current < EDGE_ZONE &&
          canGoBackRef.current
        ) {
          gesture.current = 'swipe-back';
        } else if (dy > 0 && Math.abs(dy) > Math.abs(dx) && el.scrollTop === 0) {
          gesture.current = 'pull';
        } else {
          gesture.current = 'none';
        }
      }

      if (gesture.current === 'swipe-back') {
        e.preventDefault();
        const x = Math.min(Math.max(dx, 0), window.innerWidth * 0.75);
        swipeXRef.current = x;
        setSwipeX(x);
      } else if (gesture.current === 'pull') {
        if (el.scrollTop > 0) return;
        if (dy > 0) {
          e.preventDefault();
          const d = Math.min(dy, PTR_THRESHOLD * 1.5);
          pullDistanceRef.current = d;
          setPullDistance(d);
        }
      }
    }

    function onTouchEnd() {
      if (gesture.current === 'swipe-back') {
        if (swipeXRef.current >= SWIPE_THRESHOLD) {
          goBackRef.current();
        }
        swipeXRef.current = 0;
        setSwipeX(0);
      } else if (gesture.current === 'pull') {
        if (pullDistanceRef.current >= PTR_THRESHOLD && !refreshingRef.current) {
          refreshingRef.current = true;
          setRefreshing(true);
          pullDistanceRef.current = 0;
          setPullDistance(0);
          refreshRef.current().finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
          });
        } else {
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      }
      gesture.current = null;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const indicatorProgress = Math.min(pullDistance / PTR_THRESHOLD, 1);
  const showIndicator = pullDistance > 0 || refreshing;
  const swipeProgress = Math.min(swipeX / SWIPE_THRESHOLD, 1);

  return (
    <div className="w-full h-full sm:max-w-sm sm:h-[844px] sm:rounded-3xl md:max-w-3xl md:h-[90dvh] overflow-hidden relative" style={{ background: '#F9F5F0', boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)' }}>
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ height: refreshing ? 56 : pullDistance, transition: refreshing ? 'height 0.2s' : 'none', overflow: 'hidden' }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid #e2d9cf',
              borderTopColor: '#4FA45A',
              opacity: refreshing ? 1 : indicatorProgress,
              transform: refreshing ? 'none' : `rotate(${indicatorProgress * 270}deg)`,
              animation: refreshing ? 'ptr-spin 0.7s linear infinite' : 'none',
            }}
          />
        </div>
      )}
      {swipeX > 0 && (
        <div
          className="absolute inset-0 z-40 pointer-events-none"
          style={{ background: `linear-gradient(to right, rgba(0,0,0,${0.15 * swipeProgress}), transparent 40%)` }}
        />
      )}
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto pb-16"
        style={{
          transform: swipeX > 0
            ? `translateX(${swipeX}px)`
            : pullDistance > 0
            ? `translateY(${pullDistance}px)`
            : 'none',
          transition: swipeX > 0 || pullDistance > 0 ? 'none' : 'transform 0.2s',
        }}
      >
        <Router />
      </div>
      <div className={`absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-in-out ${navVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <BottomNav />
      </div>
      {showDailyOverview && (
        <DailyOverview onClose={() => setShowDailyOverview(false)} />
      )}
    </div>
  );
}

function AppBackground({ children }) {
  const { bgImage } = useApp();
  const style = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: '#F9F5F0' };
  return (
    <div className="h-dvh flex justify-center items-center sm:p-6 md:p-8" style={style}>
      {children}
    </div>
  );
}

const AUTH_SHELL_STYLE = {
  background: '#F9F5F0',
  boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)',
};

function AuthShell({ children }) {
  return (
    <div
      className="w-full h-full sm:max-w-sm sm:h-[844px] sm:rounded-3xl overflow-hidden relative"
      style={AUTH_SHELL_STYLE}
    >
      <div className="absolute inset-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div
      className="w-full h-full sm:max-w-sm sm:h-[844px] sm:rounded-3xl overflow-hidden relative flex items-center justify-center"
      style={{ background: '#F9F5F0', boxShadow: '0 25px 60px rgba(0,0,0,0.35)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#4FA45A' }}>
          <span className="text-3xl">🏠</span>
        </div>
        <div className="text-sm font-semibold text-gray-400">Loading your hub…</div>
      </div>
    </div>
  );
}

function AppContent() {
  const { authStatus, isOnboarding, justSignedUp, setJustSignedUp, setCalendarConnections } = useApp();

  // Detect /invite/:token and /reset-password/:token in the URL
  const inviteToken = window.location.pathname.match(/^\/invite\/([a-f0-9]+)$/)?.[1] ?? null;
  const resetToken  = window.location.pathname.match(/^\/reset-password\/([a-f0-9]+)$/)?.[1] ?? null;

  // Handle ?connected=google redirect back from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const calendarError = params.get('calendarError');
    if (connected || calendarError) {
      if (connected) {
        setCalendarConnections(prev => {
          const filtered = (prev || []).filter(c => c.provider !== connected);
          return [...filtered, { provider: connected, connected: true }];
        });
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setCalendarConnections]);

  function handleJoined() {
    window.location.href = '/'; // cookie already set by server
  }

  if (resetToken)  return <AuthShell><ResetPasswordScreen token={resetToken} /></AuthShell>;
  if (inviteToken) return <AuthShell><JoinScreen token={inviteToken} onJoined={handleJoined} /></AuthShell>;
  if (authStatus === 'loading') return <LoadingShell />;
  if (isOnboarding)             return <AuthShell><OnboardingFlow /></AuthShell>;
  if (authStatus === 'guest')   return <AuthShell><WelcomeScreen /></AuthShell>;
  if (justSignedUp)             return <AuthShell><CalendarSetup onDone={() => setJustSignedUp(false)} /></AuthShell>;
  return <AppShell />;
}

export default function App() {
  return (
    <AppProvider>
      <AppBackground>
        <AppContent />
      </AppBackground>
    </AppProvider>
  );
}
