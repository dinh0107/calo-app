import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Theme & Colors
import { COLORS } from './theme/colors';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useMealHistory } from './hooks/useMealHistory';
import { useUserProfile } from './hooks/useUserProfile';
import { useWaterTracker } from './hooks/useWaterTracker';

// Services
import { waterReminderService } from './services/waterReminderService';

// Types
import type { MealEntry, MealType } from './types/food';

// Core Navigation & Layout Components
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';

// Auth Screen
import { AuthScreen } from './components/Auth/AuthScreen';

// Screens
import { DashboardScreen } from './components/Dashboard/DashboardScreen';
import { ScannerScreen } from './components/Scanner/ScannerScreen';
import { HistoryScreen } from './components/History/HistoryScreen';
import { AnalyticsScreen } from './components/Analytics/AnalyticsScreen';
import { ProfileScreen } from './components/Profile/ProfileScreen';

// Modals
import { ManualAddModal } from './components/Modals/ManualAddModal';
import { MealDetailModal } from './components/Modals/MealDetailModal';
import { OnboardingModal } from './components/Onboarding/OnboardingModal';
import { WaterReminderModal } from './components/Modals/WaterReminderModal';
import { WaterToast } from './components/common/WaterToast';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'history' | 'analytics' | 'profile'>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Authentication
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    login,
    register,
    loginWithGoogle,
    guestLogin,
    resetPassword,
    changePassword,
    logout,
    updateProfile: updateAuthProfile,
  } = useAuth();

  // Modals state
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [targetMealTypeForAdd, setTargetMealTypeForAdd] = useState<MealType>('lunch');
  const [selectedMealForDetail, setSelectedMealForDetail] = useState<MealEntry | null>(null);
  const [isForceOnboardingOpen, setIsForceOnboardingOpen] = useState(false);
  const [isWaterReminderOpen, setIsWaterReminderOpen] = useState(false);
  const [toastData, setToastData] = useState<{
    visible: boolean;
    title: string;
    message: string;
    amountMl: number;
  }>({
    visible: false,
    title: '',
    message: '',
    amountMl: 250,
  });

  // Listen for In-App Water Reminder Toasts
  useEffect(() => {
    const unsubscribe = waterReminderService.onToast((title, message, amountMl) => {
      setToastData({
        visible: true,
        title,
        message,
        amountMl: amountMl || 250,
      });
    });
    return unsubscribe;
  }, []);

  // Background Water Reminder Check Loop
  useEffect(() => {
    const checkReminder = async () => {
      try {
        await waterReminderService.checkAndTriggerReminder();
      } catch (e) {
        console.error('Error checking water reminder:', e);
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Custom Hooks for State Management
  const {
    meals,
    selectedDate,
    setSelectedDate,
    dailyTotals,
    mealsByType,
    addMealEntry,
    deleteMealEntry,
    duplicateMealEntry,
    getPastDaysTrend,
    clearAllMeals,
    reloadMeals,
  } = useMealHistory();

  const { profile, updateProfile, reloadProfile } = useUserProfile();
  const { currentWater, addWater, resetWater } = useWaterTracker(selectedDate);

  const theme = isDark ? COLORS.dark : COLORS.light;

  // Active combined profile
  const activeProfile = user?.profile || profile;

  // Toggle Dark / Light Theme
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Open Scanner targeted for a specific meal type
  const handleOpenScanner = (mealType: MealType = 'lunch') => {
    setTargetMealTypeForAdd(mealType);
    setActiveTab('scanner');
  };

  // Open Manual Add Modal
  const handleOpenManualAdd = (mealType: MealType = 'lunch') => {
    setTargetMealTypeForAdd(mealType);
    setIsManualAddOpen(true);
  };

  // Save meal from Scanner
  const handleSaveMealFromScanner = (entryData: Omit<MealEntry, 'id' | 'createdAt'>) => {
    addMealEntry(entryData);
    setActiveTab('dashboard');
  };

  // Profile update handler
  const handleUpdateProfile = (partial: Partial<typeof activeProfile>) => {
    updateProfile(partial);
    updateAuthProfile(partial);
  };

  // Onboarding completion handler
  const handleOnboardingComplete = (completedProfile: Partial<typeof activeProfile>) => {
    setIsForceOnboardingOpen(false);
    handleUpdateProfile({
      ...completedProfile,
      hasCompletedOnboarding: true,
    });
  };

  // Reset all app data
  const handleResetAllData = () => {
    reloadMeals();
    reloadProfile();
    setActiveTab('dashboard');
  };

  // If loading auth state
  if (isAuthLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // If not authenticated -> Show Login / Register Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.safeArea, { backgroundColor: theme.bg }]}
          edges={['top', 'left', 'right']}
        >
          <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.card} />
          <View style={[styles.appWrapper, { backgroundColor: theme.bg }]}>
            <AuthScreen
              onLogin={login}
              onRegister={register}
              onGoogleLogin={loginWithGoogle}
              onGuestLogin={async () => {
                await guestLogin();
              }}
              onResetPassword={resetPassword}
              isDark={isDark}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.bg }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.card} />

        {/* Max-width container for desktop/tablet browser centering */}
        <View style={[styles.appWrapper, { backgroundColor: theme.bg }]}>
          {/* Top Mobile Header */}
          <Header
            profile={activeProfile}
            avatarUrl={user?.avatarUrl}
            authProvider={user?.authProvider}
            isDark={isDark}
            toggleTheme={toggleTheme}
            onOpenProfile={() => setActiveTab('profile')}
          />

          {/* Active Screen Content */}
          <View style={styles.screenContainer}>
            {activeTab === 'dashboard' && (
              <DashboardScreen
                profile={activeProfile}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                dailyTotals={dailyTotals}
                mealsByType={mealsByType}
                currentWater={currentWater}
                onAddWater={addWater}
                onResetWater={resetWater}
                onOpenScanner={handleOpenScanner}
                onOpenManualAdd={handleOpenManualAdd}
                onDeleteMeal={deleteMealEntry}
                onViewMealDetail={(meal) => setSelectedMealForDetail(meal)}
                onOpenOnboarding={() => setIsForceOnboardingOpen(true)}
                onOpenWaterReminder={() => setIsWaterReminderOpen(true)}
                isDark={isDark}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerScreen
                apiKey={activeProfile.geminiApiKey}
                defaultMealType={targetMealTypeForAdd}
                selectedDate={selectedDate}
                onSaveMeal={handleSaveMealFromScanner}
                onClose={() => setActiveTab('dashboard')}
                onOpenProfileForApiKey={() => setActiveTab('profile')}
                isDark={isDark}
              />
            )}

            {activeTab === 'history' && (
              <HistoryScreen
                meals={meals}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                profile={activeProfile}
                onOpenScanner={handleOpenScanner}
                onOpenManualAdd={handleOpenManualAdd}
                onDeleteMeal={deleteMealEntry}
                onDuplicateMeal={(id, targetDate) => duplicateMealEntry(id, targetDate || selectedDate)}
                onViewMealDetail={(meal) => setSelectedMealForDetail(meal)}
                isDark={isDark}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsScreen
                trendData={getPastDaysTrend(14)}
                profile={activeProfile}
                isDark={isDark}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                profile={activeProfile}
                userEmail={user?.email}
                avatarUrl={user?.avatarUrl}
                authProvider={user?.authProvider}
                onChangePassword={changePassword}
                onUpdateProfile={handleUpdateProfile}
                onResetAllData={handleResetAllData}
                onClearAllMeals={clearAllMeals}
                onLogout={logout}
                onOpenOnboarding={() => setIsForceOnboardingOpen(true)}
                onOpenWaterReminder={() => setIsWaterReminderOpen(true)}
                isDark={isDark}
              />
            )}
          </View>


          {/* Bottom Navigation Tab Bar */}
          <BottomTabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenScanner={() => handleOpenScanner('lunch')}
            isDark={isDark}
          />
        </View>

        {/* Manual Add Meal Modal */}
        <ManualAddModal
          visible={isManualAddOpen}
          onClose={() => setIsManualAddOpen(false)}
          defaultMealType={targetMealTypeForAdd}
          selectedDate={selectedDate}
          onAddMeal={(entry) => addMealEntry(entry)}
          isDark={isDark}
        />

        {/* Meal Detail Modal */}
        <MealDetailModal
          meal={selectedMealForDetail}
          onClose={() => setSelectedMealForDetail(null)}
          onDelete={(id) => deleteMealEntry(id)}
          onDuplicate={(id) => duplicateMealEntry(id, selectedDate)}
          isDark={isDark}
        />

        {/* Onboarding Biometrics & Goal Setup Modal */}
        <OnboardingModal
          visible={
            (isAuthenticated && activeProfile.hasCompletedOnboarding !== true) ||
            isForceOnboardingOpen
          }
          initialProfile={activeProfile}
          userName={user?.name}
          onComplete={handleOnboardingComplete}
          onClose={isForceOnboardingOpen ? () => setIsForceOnboardingOpen(false) : undefined}
          isDark={isDark}
        />

        {/* Smart Water Drinking Reminder Modal */}
        <WaterReminderModal
          visible={isWaterReminderOpen}
          onClose={() => setIsWaterReminderOpen(false)}
          isDark={isDark}
        />

        {/* In-App Water Reminder Toast Notification Banner */}
        <WaterToast
          visible={toastData.visible}
          title={toastData.title}
          message={toastData.message}
          amountMl={toastData.amountMl}
          onQuickDrink={(amount) => addWater(amount)}
          onClose={() => setToastData((prev) => ({ ...prev, visible: false }))}
          isDark={isDark}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        display: 'flex' as any,
        alignItems: 'center' as any,
      },
    }),
  },
  appWrapper: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 480,
        height: '100vh' as any,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#e2e8f0',
      },
    }),
  },
  screenContainer: {
    flex: 1,
  },
});
