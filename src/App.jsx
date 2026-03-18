import { useRef, useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

    default:
      return <FamilyHub />;
  }
}

function AppShell() {
  const contentRef = useRef(null);
  const lastScrollY = useRef(0);
  const [navVisible, setNavVisible] = useState(true);
  const { showDailyOverview, setShowDailyOverview } = useApp();

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

  return (
    <div className="w-full h-full sm:max-w-sm sm:h-[844px] sm:rounded-3xl md:max-w-3xl md:h-[90dvh] overflow-hidden relative" style={{ background: '#F9F5F0', boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)' }}>
      <div ref={contentRef} onScroll={handleScroll} className="absolute inset-0 overflow-y-auto pb-16">
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
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setCalendarConnections]);

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
