'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  ChevronRight,
  Save,
  Camera,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RankBadge } from '@/components/rank-badge';
import { Separator } from '@/components/ui/separator';
import { RankTier } from '@/lib/scoring';

interface ProfileData {
  name: string;
  email: string;
  avatar: string | null;
  rank: RankTier;
  memberSince: string;
  profile: {
    sex: string;
    birthDate: string;
    bodyWeight: number;
    height: number;
    weightUnit: string;
    heightUnit: string;
  };
  preferences: {
    weeklyGoal: number;
    restTimerDefault: number;
    notifications: boolean;
    darkMode: boolean;
  };
}

const defaultFormData: ProfileData = {
  name: '',
  email: '',
  avatar: null,
  rank: 'unranked' as RankTier,
  memberSince: '',
  profile: {
    sex: 'male',
    birthDate: '',
    bodyWeight: 70,
    height: 170,
    weightUnit: 'kg',
    heightUnit: 'cm',
  },
  preferences: {
    weeklyGoal: 4,
    restTimerDefault: 120,
    notifications: true,
    darkMode: true,
  },
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'notifications'>('profile');
  const [formData, setFormData] = useState<ProfileData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch profile data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile and stats in parallel
        const [profileRes, statsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/stats'),
        ]);

        if (!profileRes.ok && profileRes.status !== 404) {
          throw new Error('Failed to fetch profile');
        }
        if (!statsRes.ok) {
          throw new Error('Failed to fetch stats');
        }

        const statsData = await statsRes.json();
        const profileData = profileRes.ok ? await profileRes.json() : { profile: null };

        // Build form data from API responses
        setFormData({
          name: statsData.user?.name || '',
          email: statsData.user?.email || '',
          avatar: statsData.user?.image || null,
          rank: statsData.rank || 'unranked',
          memberSince: statsData.user?.createdAt
            ? new Date(statsData.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : '',
          profile: {
            sex: profileData.profile?.sex || 'male',
            birthDate: profileData.profile?.birthDate
              ? new Date(profileData.profile.birthDate).toISOString().split('T')[0]
              : '',
            bodyWeight: profileData.profile?.bodyWeight || 70,
            height: profileData.profile?.height || 170,
            weightUnit: profileData.profile?.weightUnit || 'kg',
            heightUnit: profileData.profile?.heightUnit || 'cm',
          },
          preferences: {
            weeklyGoal: 4,
            restTimerDefault: 120,
            notifications: true,
            darkMode: true,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: formData.profile.birthDate,
          sex: formData.profile.sex,
          height: formData.profile.height,
          heightUnit: formData.profile.heightUnit,
          bodyWeight: formData.profile.bodyWeight,
          weightUnit: formData.profile.weightUnit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400 text-sm">
          Profile saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={formData.avatar || undefined} />
                    <AvatarFallback className="text-xl">
                      {formData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full hover:bg-primary/80 transition-colors">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <h3 className="mt-3 font-semibold">{formData.name}</h3>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
                <div className="mt-3">
                  <RankBadge rank={formData.rank} size="md" showLabel />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Member since {formData.memberSince}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <>
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Physical Profile */}
              <Card>
                <CardHeader>
                  <CardTitle>Physical Profile</CardTitle>
                  <CardDescription>
                    Your body metrics for accurate strength scoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <Select
                        value={formData.profile.sex}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            profile: { ...formData.profile, sex: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Date of Birth</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.profile.birthDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: { ...formData.profile, birthDate: e.target.value },
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Age: {calculateAge(formData.profile.birthDate)} years
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bodyWeight">Body Weight</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bodyWeight"
                          type="number"
                          value={formData.profile.bodyWeight}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                bodyWeight: parseFloat(e.target.value),
                              },
                            })
                          }
                        />
                        <Select
                          value={formData.profile.weightUnit}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              profile: { ...formData.profile, weightUnit: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height</Label>
                      <div className="flex gap-2">
                        <Input
                          id="height"
                          type="number"
                          value={formData.profile.height}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                height: parseFloat(e.target.value),
                              },
                            })
                          }
                        />
                        <Select
                          value={formData.profile.heightUnit}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              profile: { ...formData.profile, heightUnit: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">cm</SelectItem>
                            <SelectItem value="in">in</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <>
              {/* Workout Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Workout Preferences</CardTitle>
                  <CardDescription>
                    Customize your workout experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weeklyGoal">Weekly Workout Goal</Label>
                      <Select
                        value={formData.preferences.weeklyGoal.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              weeklyGoal: parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} workout{num > 1 ? 's' : ''} per week
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restTimer">Default Rest Timer</Label>
                      <Select
                        value={formData.preferences.restTimerDefault.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            preferences: {
                              ...formData.preferences,
                              restTimerDefault: parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 seconds</SelectItem>
                          <SelectItem value="90">90 seconds</SelectItem>
                          <SelectItem value="120">2 minutes</SelectItem>
                          <SelectItem value="180">3 minutes</SelectItem>
                          <SelectItem value="240">4 minutes</SelectItem>
                          <SelectItem value="300">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize the app appearance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme throughout the app
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            darkMode: !formData.preferences.darkMode,
                          },
                        })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.preferences.darkMode
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          formData.preferences.darkMode
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Export or delete your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium">Export Data</p>
                        <p className="text-sm text-muted-foreground">
                          Download all your workout data
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-red-500" />
                      <div className="text-left">
                        <p className="font-medium text-red-500">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and data
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-red-500" />
                  </button>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: 'Workout Reminders',
                    description: 'Get reminded to work out based on your schedule',
                    enabled: true,
                  },
                  {
                    title: 'PR Celebrations',
                    description: 'Celebrate when you hit new personal records',
                    enabled: true,
                  },
                  {
                    title: 'Streak Alerts',
                    description: 'Get notified when your streak is at risk',
                    enabled: true,
                  },
                  {
                    title: 'Rank Updates',
                    description: 'Know when you rank up or down',
                    enabled: true,
                  },
                  {
                    title: 'Recovery Alerts',
                    description: 'Get notified when muscle groups are recovered',
                    enabled: false,
                  },
                  {
                    title: 'Weekly Summary',
                    description: 'Receive a weekly summary of your progress',
                    enabled: true,
                  },
                ].map((notification, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                    </div>
                    <button
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notification.enabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          notification.enabled
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
