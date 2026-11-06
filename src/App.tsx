import { BottomNav, NAV_TAB_PATHS } from "@/components/BottomNav";
import { RouteError } from "@/components/RouteError";
import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/use-local-identity";
import { getPositionIfPermitted } from "@/hooks/use-location";
import { useOnboarding } from "@/hooks/use-onboarding";
import { resumeSignedInSession } from "@/lib/accountSession";
import { recordAppOpen } from "@/lib/achievementSessionLog";
import { updateActivityPing } from "@/lib/remoteBackend";
import { useWorkoutStore } from "@/store/workout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { Suspense, lazy, useEffect, useRef } from "react";
import AchievementsPage from "./pages/AchievementsPage";

// Bottom-nav tab pages: lazy, but preloaded in the background (RootLayout).
const loadHome = () => import("@/pages/HomePage");
const loadTrainTogether = () => import("@/pages/TrainTogetherHubPage");
const loadMap = () => import("@/pages/MapPage");
const loadProfile = () => import("@/pages/ProfilePage");
const TAB_PAGE_IMPORTS = [loadHome, loadTrainTogether, loadMap, loadProfile];

const SplashPage = lazy(() => import("@/pages/SplashPage"));
const HomePage = lazy(loadHome);
const DecksPage = lazy(() => import("@/pages/DecksPage"));
const WorkoutSetupPage = lazy(() => import("@/pages/WorkoutSetupPage"));
const WorkoutSessionPage = lazy(() => import("@/pages/WorkoutSessionPage"));
const WorkoutSummaryPage = lazy(() => import("@/pages/WorkoutSummaryPage"));
const WelcomePage = lazy(() => import("@/pages/onboarding/WelcomePage"));
const AuthPage = lazy(() => import("@/pages/onboarding/AuthPage"));
const CreateAccountPage = lazy(
  () => import("@/pages/onboarding/CreateAccountPage"),
);
const EmailSignUpPage = lazy(
  () => import("@/pages/onboarding/EmailSignUpPage"),
);
const NotificationPermissionPage = lazy(
  () => import("@/pages/onboarding/NotificationPermissionPage"),
);
const ProfilePage = lazy(loadProfile);
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const MapPage = lazy(loadMap);
const ExerciseProgressPage = lazy(() => import("@/pages/ExerciseProgressPage"));
const NearbyPage = lazy(() => import("@/pages/NearbyPage"));
const ChatThreadsPage = lazy(() => import("@/pages/ChatThreadsPage"));
const ChatConversationPage = lazy(() => import("@/pages/ChatConversationPage"));
const WelcomeTipsPage = lazy(
  () => import("@/pages/onboarding/WelcomeTipsPage"),
);
const VerifyEmailConfirmationPage = lazy(
  () => import("@/pages/onboarding/VerifyEmailConfirmationPage"),
);
const ForgotPasswordPage = lazy(
  () => import("@/pages/onboarding/ForgotPasswordPage"),
);
const OnboardingFlowPage = lazy(() => import("@/pages/OnboardingPage"));
const MyStreakPage = lazy(() => import("@/pages/MyStreakPage"));
const ProDeckPreviewPage = lazy(() => import("@/pages/ProDeckPreviewPage"));
const SubscribePage = lazy(() => import("@/pages/SubscribePage"));
const PaletteLabPage = lazy(() => import("@/pages/PaletteLabPage"));
const CustomWorkoutBuilderPage = lazy(
  () => import("@/pages/CustomWorkoutBuilderPage"),
);
const CustomDecksPage = lazy(() => import("@/pages/CustomDecksPage"));
const CustomDeckDetailPage = lazy(() => import("@/pages/CustomDeckDetailPage"));
const CustomWorkoutSessionPage = lazy(
  () => import("@/pages/CustomWorkoutSessionPage"),
);
const TrainTogetherHubPage = lazy(loadTrainTogether);
const TrainTogetherWaitingRoomPage = lazy(
  () => import("@/pages/TrainTogetherWaitingRoomPage"),
);
const TrainTogetherSessionPage = lazy(
  () => import("@/pages/TrainTogetherSessionPage"),
);

function RootLayout() {
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabIndex = NAV_TAB_PATHS.indexOf(pathname);

  // Tab-to-tab navigation slides the new page in from the side you moved
  // towards (Home → Together slides in from the right, and back).
  const prevTabIndex = useRef(tabIndex);
  const slideDir =
    tabIndex >= 0 && prevTabIndex.current >= 0
      ? Math.sign(tabIndex - prevTabIndex.current)
      : 0;
  useEffect(() => {
    prevTabIndex.current = tabIndex;
  }, [tabIndex]);

  // Once per launch while signed in: link RevenueCat to the account and sync
  // onboarding answers + custom decks (lib/accountSession.ts).
  useEffect(() => {
    resumeSignedInSession().catch((err) =>
      console.warn("Account sync on start failed:", err),
    );
  }, []);

  // Fetch the other tab pages in the background once the app is idle, so
  // switching tabs never waits on a network chunk.
  useEffect(() => {
    const preload = () => {
      for (const load of TAB_PAGE_IMPORTS) load();
    };
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(preload)
      : window.setTimeout(preload, 1500);
    return () =>
      window.cancelIdleCallback
        ? window.cancelIdleCallback(id)
        : window.clearTimeout(id);
  }, []);

  // Once-per-day app-open log, keyed to whichever bucket is active right
  // now — powers the "Ghost" secret achievement (opened the app daily for
  // a week without training).
  useEffect(() => {
    const isEmailAuth = localStorage.getItem("mbw_user") !== null;
    const isGuest = guestMode && !isEmailAuth;
    recordAppOpen(isGuest);

    // Nearby-athletes activity ping — registered users only (guests have no
    // Supabase session/profiles row). getPositionIfPermitted() never
    // prompts, and updateActivityPing() itself no-ops unless the user has
    // opted into "Visible to nearby athletes", so this is a harmless no-op
    // for everyone else.
    if (!isGuest) {
      getPositionIfPermitted().then(updateActivityPing);
    }
  }, [guestMode]);

  return (
    <div className="dark min-h-dvh bg-background">
      <Suspense
        fallback={
          <div className="min-h-dvh flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }
      >
        {/* Respect the OS "reduce motion" setting for every motion animation. */}
        <MotionConfig reducedMotion="user">
          <div className="overflow-x-clip">
            {/* CSS animation, not motion: a motion mount animation is lost
                when a lazy page suspends underneath it, leaving the page
                stuck invisible. A CSS animation simply starts on reveal. */}
            <div
              key={tabIndex >= 0 ? pathname : "page"}
              className={slideDir ? "tab-slide-in" : undefined}
              style={
                slideDir
                  ? ({
                      "--slide-from": `${slideDir * 28}%`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <Outlet />
            </div>
          </div>
        </MotionConfig>
      </Suspense>
      {tabIndex >= 0 && (
        <MotionConfig reducedMotion="user">
          <BottomNav activeIndex={tabIndex} />
        </MotionConfig>
      )}
      <Toaster />
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const splashRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SplashPage,
});

// AuthGuard intentionally kept for potential direct-auth-only routes
function _AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loginStatus } = useInternetIdentity();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isAuthenticated = loginStatus === "success" || guestMode || isEmailAuth;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/onboarding/welcome", replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

// Redirects are done via useEffect + navigate() rather than throwing
// redirect() from render — a thrown redirect() is only handled by the
// router when it originates from a route loader/beforeLoad, not from a
// plain component render; throwing it here instead surfaces as an
// uncaught error ("Something went wrong!") whenever a protected route is
// hit without valid auth/onboarding state (e.g. after a hard refresh).
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loginStatus } = useInternetIdentity();
  const guestMode = useWorkoutStore((s) => s.guestMode);
  const isEmailAuth = localStorage.getItem("mbw_user") !== null;
  const isAuthenticated = loginStatus === "success" || guestMode || isEmailAuth;
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/onboarding/welcome", replace: true });
    } else if (!isLoading && !hasCompletedOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, navigate]);

  if (!isAuthenticated || (!isLoading && !hasCompletedOnboarding)) {
    return null;
  }
  return <>{children}</>;
}

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: () => (
    <OnboardingGuard>
      <HomePage />
    </OnboardingGuard>
  ),
});

const decksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/decks",
  component: () => (
    <OnboardingGuard>
      <DecksPage />
    </OnboardingGuard>
  ),
});

const workoutSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout/setup",
  component: () => (
    <OnboardingGuard>
      <WorkoutSetupPage />
    </OnboardingGuard>
  ),
});

const workoutSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout/session",
  component: () => (
    <OnboardingGuard>
      <WorkoutSessionPage />
    </OnboardingGuard>
  ),
});

const workoutSummaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workout/summary",
  component: () => (
    <OnboardingGuard>
      <WorkoutSummaryPage />
    </OnboardingGuard>
  ),
});

const onboardingWelcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/welcome",
  component: WelcomePage,
});

const onboardingAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/auth",
  component: AuthPage,
});

const onboardingCreateAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/create-account",
  component: CreateAccountPage,
});

const onboardingCreateAccountEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/create-account/email",
  component: EmailSignUpPage,
});

const onboardingNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/notifications",
  component: NotificationPermissionPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <OnboardingGuard>
      <ProfilePage />
    </OnboardingGuard>
  ),
});

const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/faq",
  component: () => (
    <OnboardingGuard>
      <FAQPage />
    </OnboardingGuard>
  ),
});

const mapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/map",
  component: () => (
    <OnboardingGuard>
      <MapPage />
    </OnboardingGuard>
  ),
});

const onboardingFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingFlowPage,
});

const achievementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/achievements",
  component: () => (
    <OnboardingGuard>
      <AchievementsPage />
    </OnboardingGuard>
  ),
});

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: () => (
    <OnboardingGuard>
      <ExerciseProgressPage />
    </OnboardingGuard>
  ),
});

const nearbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nearby",
  component: () => (
    <OnboardingGuard>
      <NearbyPage />
    </OnboardingGuard>
  ),
});

const chatThreadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: () => (
    <OnboardingGuard>
      <ChatThreadsPage />
    </OnboardingGuard>
  ),
});

const chatConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat/$threadId",
  component: () => (
    <OnboardingGuard>
      <ChatConversationPage />
    </OnboardingGuard>
  ),
});

const myStreakRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/streak",
  component: () => (
    <OnboardingGuard>
      <MyStreakPage />
    </OnboardingGuard>
  ),
});

const proDeckPreviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/decks/pro-preview",
  component: () => (
    <OnboardingGuard>
      <ProDeckPreviewPage />
    </OnboardingGuard>
  ),
});

const paletteLabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/palette-lab",
  component: PaletteLabPage,
});

const subscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscribe",
  component: () => (
    <OnboardingGuard>
      <SubscribePage />
    </OnboardingGuard>
  ),
});

const customWorkoutListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout",
  component: () => (
    <OnboardingGuard>
      <CustomDecksPage />
    </OnboardingGuard>
  ),
});

const customWorkoutNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout/new",
  component: () => (
    <OnboardingGuard>
      <CustomWorkoutBuilderPage />
    </OnboardingGuard>
  ),
});

const customWorkoutEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout/edit/$deckId",
  component: () => (
    <OnboardingGuard>
      <CustomWorkoutBuilderPage />
    </OnboardingGuard>
  ),
});

const customWorkoutDeckDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout/deck/$deckId",
  component: () => (
    <OnboardingGuard>
      <CustomDeckDetailPage />
    </OnboardingGuard>
  ),
});

const customWorkoutSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout/session/$deckId",
  component: () => (
    <OnboardingGuard>
      <CustomWorkoutSessionPage />
    </OnboardingGuard>
  ),
});

const trainTogetherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/train-together",
  component: () => (
    <OnboardingGuard>
      <TrainTogetherHubPage />
    </OnboardingGuard>
  ),
});

const trainTogetherWaitingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/train-together/waiting/$sessionId",
  component: () => (
    <OnboardingGuard>
      <TrainTogetherWaitingRoomPage />
    </OnboardingGuard>
  ),
});

const trainTogetherSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/train-together/session/$sessionId",
  component: () => (
    <OnboardingGuard>
      <TrainTogetherSessionPage />
    </OnboardingGuard>
  ),
});

const welcomeTipsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome-tips",
  component: WelcomeTipsPage,
});

const verifyEmailConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding/verify-email-confirmation",
  component: VerifyEmailConfirmationPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const routeTree = rootRoute.addChildren([
  splashRoute,
  homeRoute,
  decksRoute,
  workoutSetupRoute,
  workoutSessionRoute,
  workoutSummaryRoute,
  onboardingWelcomeRoute,
  onboardingAuthRoute,
  onboardingCreateAccountRoute,
  onboardingCreateAccountEmailRoute,
  onboardingNotificationsRoute,
  profileRoute,
  faqRoute,
  mapRoute,
  welcomeTipsRoute,
  verifyEmailConfirmationRoute,
  forgotPasswordRoute,
  onboardingFlowRoute,
  achievementsRoute,
  progressRoute,
  nearbyRoute,
  chatThreadsRoute,
  chatConversationRoute,
  myStreakRoute,
  proDeckPreviewRoute,
  subscribeRoute,
  customWorkoutListRoute,
  customWorkoutNewRoute,
  customWorkoutEditRoute,
  customWorkoutDeckDetailRoute,
  customWorkoutSessionRoute,
  trainTogetherRoute,
  trainTogetherWaitingRoute,
  trainTogetherSessionRoute,
  paletteLabRoute,
]);

const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
