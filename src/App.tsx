import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/use-local-identity";
import { getPositionIfPermitted } from "@/hooks/use-location";
import { useOnboarding } from "@/hooks/use-onboarding";
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
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import AchievementsPage from "./pages/AchievementsPage";

const SplashPage = lazy(() => import("@/pages/SplashPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
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
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const MapPage = lazy(() => import("@/pages/MapPage"));
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
const CustomWorkoutBuilderPage = lazy(
  () => import("@/pages/CustomWorkoutBuilderPage"),
);
const CustomWorkoutSessionPage = lazy(
  () => import("@/pages/CustomWorkoutSessionPage"),
);
const TrainTogetherHubPage = lazy(() => import("@/pages/TrainTogetherHubPage"));
const TrainTogetherWaitingRoomPage = lazy(
  () => import("@/pages/TrainTogetherWaitingRoomPage"),
);
const TrainTogetherSessionPage = lazy(
  () => import("@/pages/TrainTogetherSessionPage"),
);

function RootLayout() {
  const guestMode = useWorkoutStore((s) => s.guestMode);

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
        <Outlet />
      </Suspense>
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

const subscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/subscribe",
  component: () => (
    <OnboardingGuard>
      <SubscribePage />
    </OnboardingGuard>
  ),
});

const customWorkoutBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout",
  component: () => (
    <OnboardingGuard>
      <CustomWorkoutBuilderPage />
    </OnboardingGuard>
  ),
});

const customWorkoutSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/custom-workout/session",
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
  customWorkoutBuilderRoute,
  customWorkoutSessionRoute,
  trainTogetherRoute,
  trainTogetherWaitingRoute,
  trainTogetherSessionRoute,
]);

const router = createRouter({ routeTree });

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
