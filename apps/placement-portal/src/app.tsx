import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import ErrorBoundary from '@/components/system/error-boundary';
import { InMemoryDataBanner } from '@/generated/components/in-memory-data-banner';
import { HAS_IN_MEMORY_TABLES, useStudentList, useSkillList, useStudentSkillList, usePlacementDriveList, useNotificationList, useEligibilityCriteriaList, useDriveRequirementList, useDriveApplicationList, useUpdateStudent, useCreateStudentSkill, useDeleteStudentSkill, useCreateDriveApplication, useCreatePlacementDrive, useCreateEligibilityCriteria, useCreateDriveRequirement, useUpdatePlacementDrive, useUpdateEligibilityCriteria, useDeleteDriveRequirement } from '@/generated/hooks';
import { StudentDepartmentKeyToLabel, StudentYearKeyToLabel, StudentRoleKeyToLabel, type StudentDepartmentKey, type StudentYearKey } from '@/generated/models/student-model';
import { StudentSkillProficiencyKeyToLabel, type StudentSkillProficiencyKey } from '@/generated/models/student-skill-model';
import { PlacementDriveStatusKeyToLabel, type PlacementDriveStatusKey } from '@/generated/models/placement-drive-model';
import { SkillCategoryKeyToLabel } from '@/generated/models/skill-model';
import { DriveRequirementMinimumProficiencyKeyToLabel, type DriveRequirementMinimumProficiencyKey } from '@/generated/models/drive-requirement-model';
import type { Student } from '@/generated/models/student-model';
import type { Skill } from '@/generated/models/skill-model';
import type { StudentSkill } from '@/generated/models/student-skill-model';
import type { PlacementDrive } from '@/generated/models/placement-drive-model';
import type { Notification } from '@/generated/models/notification-model';
import type { EligibilityCriteria } from '@/generated/models/eligibility-criteria-model';
import type { DriveRequirement } from '@/generated/models/drive-requirement-model';
import type { DriveApplication } from '@/generated/models/drive-application-model';
import { useUser } from '@/hooks/use-user';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { getOrCreateStudentProfile, updateStudentProfile } from '@/lib/student-profile-service';
import { getLatestResumeScore, getLatestResumeAnalysis, saveResumeAnalysis, type ResumeAnalysisRecord } from '@/lib/resume-analysis-service';
import { cn } from '@/lib/utils';
// Student Applied Drives
function StudentAppliedDrives({ student, drives, applications, eligibilityCriteria }: {
  student: Student | undefined;
  drives: PlacementDrive[];
  applications: DriveApplication[];
  eligibilityCriteria: EligibilityCriteria[];
}) {
  // Filter applications for the current student
  const myApplications = applications.filter((a: DriveApplication) => a.student?.id === student?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Import DriveApplicationStatusKeyToLabel
  const statusLabels: Record<string, string> = {
    'StatusKey0': 'Applied',
    'StatusKey1': 'Shortlisted',
    'StatusKey2': 'Interview Scheduled',
    'StatusKey3': 'Selected',
    'StatusKey4': 'Rejected',
  };

  const getStatusBadgeStyle = (statusKey: string) => {
    switch (statusKey) {
      case 'StatusKey3': return 'bg-primary text-primary-foreground'; // Selected
      case 'StatusKey1': return 'bg-accent text-accent-foreground'; // Shortlisted
      case 'StatusKey2': return 'bg-secondary text-secondary-foreground'; // Interview Scheduled
      case 'StatusKey4': return 'bg-destructive text-destructive-foreground'; // Rejected
      default: return 'bg-muted text-muted-foreground'; // Applied
    }
  };

  const getStatusIcon = (statusKey: string) => {
    switch (statusKey) {
      case 'StatusKey3': return <CheckCircle className="h-4 w-4" />;
      case 'StatusKey1': return <Star className="h-4 w-4" />;
      case 'StatusKey2': return <Calendar className="h-4 w-4" />;
      case 'StatusKey4': return <XCircle className="h-4 w-4" />;
      default: return <CircleCheck className="h-4 w-4" />;
    }
  };

  // Filter applications
  const filteredApplications = myApplications.filter((app: DriveApplication) => {
    const drive = drives.find((d: PlacementDrive) => d.id === app.placementDrive?.id);
    const query = searchQuery.toLowerCase().trim();
    
    // Status filter
    if (statusFilter !== 'all' && app.statusKey !== statusFilter) return false;
    
    // Search filter
    if (!query) return true;
    const companyName = (drive?.companyName || '').toLowerCase();
    const jobRole = (drive?.jobRole || '').toLowerCase();
    return companyName.includes(query) || jobRole.includes(query);
  });

  // Sort by application date (most recent first)
  const sortedApplications = [...filteredApplications].sort((a: DriveApplication, b: DriveApplication) => {
    const dateA = a.appliedAt ? new Date(a.appliedAt).getTime() : 0;
    const dateB = b.appliedAt ? new Date(b.appliedAt).getTime() : 0;
    return dateB - dateA;
  });

  // Stats
  const totalApplications = myApplications.length;
  const selectedCount = myApplications.filter((a: DriveApplication) => a.statusKey === 'StatusKey3').length;
  const shortlistedCount = myApplications.filter((a: DriveApplication) => a.statusKey === 'StatusKey1' || a.statusKey === 'StatusKey2').length;
  const pendingCount = myApplications.filter((a: DriveApplication) => a.statusKey === 'StatusKey0').length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Applied Drives</h1>
          <p className="mt-1 text-muted-foreground">Track all your placement applications and their status</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4">
        {[
          { icon: Briefcase, value: totalApplications, label: 'Total Applications', color: 'bg-primary/10 text-primary' },
          { icon: CheckCircle, value: selectedCount, label: 'Selected', color: 'bg-primary/10 text-primary' },
          { icon: Star, value: shortlistedCount, label: 'Shortlisted/Interview', color: 'bg-accent/20 text-accent-foreground' },
          { icon: CircleCheck, value: pendingCount, label: 'Pending Review', color: 'bg-secondary text-secondary-foreground' },
        ].map((stat, i: number) => (
          <Card key={i} className="transition-all hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className={cn('rounded-xl p-3', stat.color)}><stat.icon className="h-5 w-5" /></div>
                <span className="font-display text-3xl font-bold text-card-foreground">{stat.value}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-card-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company or role..."
            className="pl-9"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="StatusKey0">Applied</SelectItem>
            <SelectItem value="StatusKey1">Shortlisted</SelectItem>
            <SelectItem value="StatusKey2">Interview Scheduled</SelectItem>
            <SelectItem value="StatusKey3">Selected</SelectItem>
            <SelectItem value="StatusKey4">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Applications List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {sortedApplications.map((application: DriveApplication) => {
                const drive = drives.find((d: PlacementDrive) => d.id === application.placementDrive?.id);
                const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === drive?.id);
                
                return (
                  <div
                    key={application.id}
                    className="rounded-xl border-2 border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Drive Info */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Building2 className="h-7 w-7 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-lg font-semibold text-card-foreground truncate">
                            {drive?.companyName || 'Unknown Company'}
                          </h3>
                          <p className="text-sm font-medium text-primary truncate">
                            {drive?.jobRole || 'Role not specified'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {drive?.packageLPA && (
                              <div className="flex items-center gap-1.5">
                                <IndianRupee className="h-3.5 w-3.5" />
                                <span>{drive.packageLPA} LPA</span>
                              </div>
                            )}
                            {drive?.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{drive.location}</span>
                              </div>
                            )}
                            {drive?.driveDate && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Drive: {new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status & Applied Date */}
                      <div className="flex flex-col items-start gap-3 lg:items-end lg:text-right">
                        <Badge className={cn('gap-1.5 px-3 py-1.5', getStatusBadgeStyle(application.statusKey))}>
                          {getStatusIcon(application.statusKey)}
                          {statusLabels[application.statusKey] || 'Unknown'}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          <p>Applied on: <span className="font-medium text-card-foreground">{application.appliedAt ? new Date(application.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unknown'}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Drive Details */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Drive Status</p>
                          <p className="font-medium text-card-foreground">{drive?.statusKey ? PlacementDriveStatusKeyToLabel[drive.statusKey] : 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Openings</p>
                          <p className="font-medium text-card-foreground">{drive?.openings || 'Not specified'} positions</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min CGPA Required</p>
                          <p className="font-medium text-card-foreground">{criteria?.minimumCGPA || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Application Deadline</p>
                          <p className="font-medium text-card-foreground">{drive?.applicationDeadline ? new Date(drive.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {sortedApplications.length === 0 && (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <FileUser className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'No matching applications found' : 'No applications yet'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start applying to placement drives to see them here'}
                  </p>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard, User, Briefcase, TrendingUp, Bell, Users, BarChart3, Settings, GraduationCap, CheckCircle, AlertTriangle, XCircle, Sparkles, Building2, Calendar, IndianRupee, Code, FileText, Target, Plus, Search, ChevronRight, Award, BookOpen, Lightbulb, ArrowUpRight, Trash2, Upload, FileSearch, Zap, CircleCheck, CircleX, Star, Cpu, LogOut, Shield, ShieldAlert, UserCircle, Lock, Loader2, Phone
} from 'lucide-react';
import { FileUser, MapPin, Mail as MailIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { StudentResumeAnalyzer } from '@/components/resume-analyzer';
import { AdminManageDrives } from '@/components/admin-manage-drives';

type View = 'student-dashboard' | 'student-profile' | 'student-drives' | 'student-skills' | 'student-resume-analyzer' | 'student-applied-drives' | 'student-notifications' |
            'admin-dashboard' | 'admin-drives' | 'admin-students' | 'admin-analytics' | 'admin-notifications' | 'admin-settings';

type UserRole = 'student' | 'admin';

// Resume score storage interface
interface StoredResumeScore {
  score: number;
  fileName: string;
  targetRole: string;
  analyzedAt: string;
}

// Resume analysis score storage key
const RESUME_SCORE_KEY = 'placement_portal_resume_score';

// Get stored resume score from localStorage
function getStoredResumeScore(): StoredResumeScore | null {
  try {
    const stored = localStorage.getItem(RESUME_SCORE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredResumeScore;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save resume score to localStorage
function saveResumeScore(score: number, fileName: string, targetRole: string) {
  const data: StoredResumeScore = {
    score,
    fileName,
    targetRole,
    analyzedAt: new Date().toISOString()
  };
  localStorage.setItem(RESUME_SCORE_KEY, JSON.stringify(data));
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

function getReadinessStatus(score: number, hasAnalysis: boolean = true) {
  if (!hasAnalysis) return { label: 'Not Analyzed Yet', color: 'bg-muted text-muted-foreground font-medium' };
  if (score >= 80) return { label: 'High Readiness', color: 'bg-primary text-primary-foreground' };
  if (score >= 60) return { label: 'Moderate Readiness', color: 'bg-accent text-accent-foreground' };
  if (score >= 40) return { label: 'Developing', color: 'bg-secondary text-secondary-foreground' };
  return { label: 'Needs Focus', color: 'bg-destructive text-destructive-foreground' };
}

// Sidebar Navigation
function AppSidebar({ role, currentView, onNavigate }: { role: UserRole; currentView: View; onNavigate: (view: View) => void }) {
  const studentNavItems = [
    { title: 'Dashboard', view: 'student-dashboard' as View, icon: LayoutDashboard },
    { title: 'My Profile', view: 'student-profile' as View, icon: User },
    { title: 'Placement Drives', view: 'student-drives' as View, icon: Briefcase },
    { title: 'Skill Analysis', view: 'student-skills' as View, icon: TrendingUp },
    { title: 'Resume Analyzer', view: 'student-resume-analyzer' as View, icon: FileSearch },
    { title: 'Applied Drives', view: 'student-applied-drives' as View, icon: FileUser },
    { title: 'Notifications', view: 'student-notifications' as View, icon: Bell },
  ];
  const adminNavItems = [
    { title: 'Dashboard', view: 'admin-dashboard' as View, icon: LayoutDashboard },
    { title: 'Manage Drives', view: 'admin-drives' as View, icon: Briefcase },
    { title: 'Students', view: 'admin-students' as View, icon: Users },
    { title: 'Analytics', view: 'admin-analytics' as View, icon: BarChart3 },
    { title: 'Notifications', view: 'admin-notifications' as View, icon: Bell },
    { title: 'Settings', view: 'admin-settings' as View, icon: Settings },
  ];
  const navItems = role === 'admin' ? adminNavItems : studentNavItems;

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
        <button onClick={() => onNavigate(role === 'admin' ? 'admin-dashboard' : 'student-dashboard')} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-sidebar-foreground">PlaceTrack</h1>
            <p className="text-xs font-medium text-sidebar-foreground/60">{role === 'admin' ? 'Admin Portal' : 'Student Portal'}</p>
          </div>
        </button>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-1">
              {navItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      onClick={() => onNavigate(item.view)}
                      className={cn(
                        'w-full justify-start gap-3 rounded-xl px-4 py-3 font-medium transition-all',
                        isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Student Dashboard
function StudentDashboard({
  student,
  drives,
  studentSkills,
  notifications,
  skills,
  eligibilityCriteria,
  driveRequirements,
  applications,
  onNavigate,
  selectedTargetRole = 'Software Engineer',
  onSelectTargetRole,
  latestAnalysis = null,
  isAnalysisLoading = false,
}: {
  student: Student | undefined;
  drives: PlacementDrive[];
  studentSkills: StudentSkill[];
  notifications: Notification[];
  skills: Skill[];
  eligibilityCriteria: EligibilityCriteria[];
  driveRequirements: DriveRequirement[];
  applications: DriveApplication[];
  onNavigate: (view: View) => void;
  selectedTargetRole?: string;
  onSelectTargetRole?: (role: string) => void;
  latestAnalysis?: ResumeAnalysisRecord | null;
  isAnalysisLoading?: boolean;
}) {
  const hasAnalysis = Boolean(latestAnalysis && latestAnalysis.status === 'completed');
  const readinessScore = hasAnalysis ? (latestAnalysis?.score || 0) : 0;
  const status = getReadinessStatus(readinessScore, hasAnalysis);
  const mySkills = studentSkills.filter((ss: StudentSkill) => ss.student?.id === student?.id);
  const activeDrives = drives.filter((d: PlacementDrive) => d.statusKey === 'StatusKey1');
  const upcomingDrives = drives.filter((d: PlacementDrive) => d.statusKey === 'StatusKey0');
  const allActive = [...activeDrives, ...upcomingDrives].slice(0, 5);
  // Comprehensive eligibility check function
  const checkDriveEligibility = (drive: PlacementDrive) => {
    if (!student) return { eligible: false, reasons: ['Not logged in'] };
    const reasons: string[] = [];
    const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === drive.id);
    
    if (criteria) {
      // Check CGPA
      if (student.cGPA < criteria.minimumCGPA) {
        reasons.push(`CGPA ${student.cGPA} below ${criteria.minimumCGPA}`);
      }
      // Check Department
      const studentDept = StudentDepartmentKeyToLabel[student.departmentKey];
      if (criteria.allowedDepartments !== 'All' && !criteria.allowedDepartments.includes(studentDept)) {
        reasons.push('Department not eligible');
      }
      // Check Year
      if (criteria.allowedYears && criteria.allowedYears !== 'All') {
        const studentYear = StudentYearKeyToLabel[student.yearKey];
        if (!criteria.allowedYears.includes(studentYear)) {
          reasons.push(`${studentYear} not allowed`);
        }
      }
    }
    
    // Check required mandatory skills
    const requiredSkills = driveRequirements
      .filter((r: DriveRequirement) => r.placementDrive?.id === drive.id && r.isMandatory)
      .map((r: DriveRequirement) => r.skill?.id);
    const mySkillIds = new Set(mySkills.map((ss: StudentSkill) => ss.skill?.id));
    const missingMandatorySkills = requiredSkills.filter((skillId) => skillId && !mySkillIds.has(skillId));
    if (missingMandatorySkills.length > 0) {
      const missingNames = missingMandatorySkills
        .map((skillId) => skills.find((s: Skill) => s.id === skillId)?.name1)
        .filter(Boolean);
      if (missingNames.length > 0) {
        reasons.push(`Missing: ${missingNames.slice(0, 2).join(', ')}${missingNames.length > 2 ? '...' : ''}`);
      }
    }
    
    return { eligible: reasons.length === 0, reasons };
  };
  
  const eligibleDrives = allActive.filter((drive: PlacementDrive) => {
    return checkDriveEligibility(drive).eligible;
  });
  const myApplicationIds = applications.filter((a: DriveApplication) => a.student?.id === student?.id).map((a: DriveApplication) => a.placementDrive?.id);
  const unreadNotifications = notifications.filter((n: Notification) => !n.isRead && (!n.student || n.student.id === student?.id));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Welcome back, {student?.name1?.split(' ')[0] || 'Student'}!</h1>
          <p className="mt-1 text-muted-foreground">Track your placement readiness and explore opportunities</p>
        </div>
        <Badge className={cn(status.color, 'px-3 py-1.5 text-sm')}>{status.label}</Badge>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className="p-8">
            {isAnalysisLoading ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-9 w-52" />
                </div>
                <Skeleton className="h-16 w-32 mt-4" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-72 mt-2" />
              </div>
            ) : (
              <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-lg font-semibold text-card-foreground">Placement Readiness Score</h2>
                    </div>
                    {onSelectTargetRole && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Target Role:</span>
                        <Select value={selectedTargetRole} onValueChange={onSelectTargetRole}>
                          <SelectTrigger className="h-9 w-52 bg-background">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                            <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                            <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                            <SelectItem value="Machine Learning Engineer">Machine Learning Engineer</SelectItem>
                            <SelectItem value="Data Engineer">Data Engineer</SelectItem>
                            <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                            <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                            <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                            <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                            <SelectItem value="Mobile Developer">Mobile Developer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-end gap-3">
                    <span className="font-display text-7xl font-bold text-primary">
                      {hasAnalysis ? readinessScore : 0}
                    </span>
                    <span className="mb-3 text-2xl text-muted-foreground">/100</span>
                  </div>
                  <Progress value={hasAnalysis ? readinessScore : 0} className="mt-6 h-4" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {hasAnalysis
                      ? `Latest AI analysis for ${selectedTargetRole} • ${latestAnalysis?.file_name || 'Uploaded Resume'} ${latestAnalysis?.analyzed_at ? `(${new Date(latestAnalysis.analyzed_at).toLocaleDateString()})` : ''}`
                      : `Not analyzed yet for ${selectedTargetRole}. Upload a resume in the Resume Analyzer to evaluate your score.`}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => onNavigate('student-resume-analyzer')}>
                    <TrendingUp className="h-4 w-4" /> {hasAnalysis ? 'Re-Analyze Resume' : 'Analyze Resume'}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => onNavigate('student-profile')}>
                    Update Profile <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target, value: eligibleDrives.length, label: 'Eligible Drives', sub: `Out of ${allActive.length} active`, color: 'bg-primary/10 text-primary' },
          { icon: Briefcase, value: myApplicationIds.length, label: 'Applications', sub: 'Submitted', color: 'bg-accent/20 text-accent-foreground' },
          { icon: Code, value: mySkills.length, label: 'Skills Added', sub: 'Keep improving', color: 'bg-secondary text-secondary-foreground' },
          { icon: Bell, value: unreadNotifications.length, label: 'Unread Alerts', sub: 'Stay updated', color: 'bg-destructive/10 text-destructive' },
        ].map((stat, i: number) => (
          <Card key={i} className="group transition-all hover:border-primary/50 hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn('rounded-xl p-3', stat.color)}><stat.icon className="h-5 w-5" /></div>
                <span className="font-display text-4xl font-bold text-card-foreground">{stat.value}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-card-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Upcoming Drives</CardTitle>
                <CardDescription>Browse placement opportunities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('student-drives')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allActive.slice(0, 4).map((drive: PlacementDrive) => {
                  const eligibility = checkDriveEligibility(drive);
                  const isEligible = eligibility.eligible;
                  return (
                    <div
                      key={drive.id}
                      className={cn(
                        'rounded-xl border-2 p-5 transition-all hover:shadow-md',
                        isEligible
                          ? 'border-primary/30 bg-gradient-to-br from-card to-primary/5 hover:border-primary/50'
                          : 'border-destructive/30 bg-gradient-to-br from-card to-destructive/5 hover:border-destructive/50'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm',
                            isEligible ? 'bg-primary/10' : 'bg-destructive/10'
                          )}
                        >
                          <Building2 className={cn('h-7 w-7', isEligible ? 'text-primary' : 'text-destructive')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-display text-base font-semibold leading-tight text-card-foreground">
                                {drive.companyName}
                              </h4>
                              <p className="mt-1 text-sm text-muted-foreground leading-snug">
                                {drive.jobRole}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                'shrink-0 px-3 py-1',
                                isEligible
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-destructive text-destructive-foreground'
                              )}
                            >
                              {isEligible ? 'Eligible' : 'Not Eligible'}
                            </Badge>
                          </div>
                          {!isEligible && eligibility.reasons.length > 0 && (
                            <p className="mt-2 text-xs text-destructive leading-snug">
                              {eligibility.reasons[0]}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {drive.driveDate ? new Date(drive.driveDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date TBD'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {allActive.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No upcoming drives available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Notifications</CardTitle>
                <CardDescription>Stay informed about updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('student-notifications')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unreadNotifications.slice(0, 3).map((n: Notification) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2"><Bell className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-card-foreground">{n.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                ))}
                {unreadNotifications.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No unread notifications</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Student Profile
function StudentProfile({
  student,
  studentSkills,
  skills,
  onProfileUpdated,
}: {
  student: Student | undefined;
  studentSkills: StudentSkill[];
  skills: Skill[];
  onProfileUpdated?: (updated: Student) => void;
}) {
  const { user } = useAuth();
  const mySkills = studentSkills.filter((ss: StudentSkill) => ss.student?.id === student?.id);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState<StudentSkillProficiencyKey>('ProficiencyKey1');
  const [isSaving, setIsSaving] = useState(false);

  // Controlled form state for student profile
  const [name1, setName1] = useState(student?.name1 || '');
  const [rollNumber, setRollNumber] = useState(student?.rollNumber || '');
  const [cGPA, setCGPA] = useState(student?.cGPA !== undefined ? student.cGPA.toString() : '');
  const [phoneNumber, setPhoneNumber] = useState(student?.phoneNumber || '');
  const [departmentKey, setDepartmentKey] = useState<StudentDepartmentKey>(student?.departmentKey || 'DepartmentKey0');
  const [yearKey, setYearKey] = useState<StudentYearKey>(student?.yearKey || 'YearKey3');

  const createSkill = useCreateStudentSkill();
  const deleteSkill = useDeleteStudentSkill();

  // Sync state whenever student record is updated or refetched from backend
  useEffect(() => {
    if (student) {
      setName1(student.name1 || '');
      setRollNumber(student.rollNumber || '');
      setCGPA(student.cGPA !== undefined ? student.cGPA.toString() : '');
      setPhoneNumber(student.phoneNumber || '');
      if (student.departmentKey) setDepartmentKey(student.departmentKey);
      if (student.yearKey) setYearKey(student.yearKey);
    }
  }, [student]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name1.trim()) {
      toast.error('Full Name is required');
      return;
    }
    const numCgpa = parseFloat(cGPA);
    if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
      toast.error('Please enter a valid CGPA between 0.0 and 10.0');
      return;
    }

    setIsSaving(true);
    try {
      if (user) {
        const updated = await updateStudentProfile(user, {
          name1: name1.trim(),
          rollNumber: rollNumber.trim(),
          cGPA: numCgpa,
          phoneNumber: phoneNumber.trim(),
          departmentKey,
          yearKey,
        });
        if (onProfileUpdated) {
          onProfileUpdated(updated);
        }
      }
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const mySkillIds = new Set(mySkills.map((ss: StudentSkill) => ss.skill?.id));
  const availableSkills = skills.filter((s: Skill) => !mySkillIds.has(s.id));

  const handleAddSkill = async () => {
    if (!selectedSkillId || !student) return;
    const skill = skills.find((s: Skill) => s.id === selectedSkillId);
    if (!skill) return;
    try {
      await createSkill.mutateAsync({
        studentSkillName: `${student.name1} - ${skill.name1}`,
        student: { id: student.id, name1: student.name1 },
        skill: { id: skill.id, name1: skill.name1 },
        proficiencyKey: selectedProficiency,
        verified: false,
      });
      toast.success(`${skill.name1} added to your profile`);
      setIsAddingSkill(false);
      setSelectedSkillId('');
    } catch (err) {
      toast.error('Failed to add skill');
    }
  };

  const handleDeleteSkill = async (skillId: string, skillName: string) => {
    try {
      await deleteSkill.mutateAsync(skillId);
      toast.success(`${skillName} removed`);
    } catch (err) {
      toast.error('Failed to remove skill');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="mt-1 text-muted-foreground">Manage your information and skills</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your details for placement records</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="profile-name"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-roll">Roll Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="profile-roll"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Enter your roll number"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email (Account Locked)</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={user?.email || student?.email || ''}
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-cgpa">CGPA <span className="text-destructive">*</span></Label>
                  <Input
                    id="profile-cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cGPA}
                    onChange={(e) => setCGPA(e.target.value)}
                    placeholder="e.g. 8.5"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone Number</Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentKey} onValueChange={(v) => setDepartmentKey(v as StudentDepartmentKey)} disabled={isSaving}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DepartmentKey0">Computer Science</SelectItem>
                      <SelectItem value="DepartmentKey1">Information Technology</SelectItem>
                      <SelectItem value="DepartmentKey2">Electronics & Communication</SelectItem>
                      <SelectItem value="DepartmentKey3">Electrical Engineering</SelectItem>
                      <SelectItem value="DepartmentKey4">Mechanical Engineering</SelectItem>
                      <SelectItem value="DepartmentKey5">Civil Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={yearKey} onValueChange={(v) => setYearKey(v as StudentYearKey)} disabled={isSaving}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YearKey0">1st Year</SelectItem>
                      <SelectItem value="YearKey1">2nd Year</SelectItem>
                      <SelectItem value="YearKey2">3rd Year</SelectItem>
                      <SelectItem value="YearKey3">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Skills ({mySkills.length})</CardTitle>
              <CardDescription>Your technical and soft skills with proficiency levels</CardDescription>
            </div>
            <Dialog open={isAddingSkill} onOpenChange={setIsAddingSkill}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Skill</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Skill</DialogTitle>
                  <DialogDescription>Select a skill and your proficiency level</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Skill</Label>
                    <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                      <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                      <SelectContent>
                        {availableSkills.map((skill: Skill) => (
                          <SelectItem key={skill.id} value={skill.id}>{skill.name1} ({SkillCategoryKeyToLabel[skill.categoryKey]})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Proficiency</Label>
                    <Select value={selectedProficiency} onValueChange={(v: string) => setSelectedProficiency(v as StudentSkillProficiencyKey)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(StudentSkillProficiencyKeyToLabel).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddSkill}>Add Skill</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mySkills.map((ss: StudentSkill) => {
                const profColor = ss.proficiencyKey === 'ProficiencyKey2' ? 'border-l-primary' : ss.proficiencyKey === 'ProficiencyKey1' ? 'border-l-accent' : 'border-l-secondary';
                return (
                  <div key={ss.id} className={cn('rounded-lg border border-border bg-card p-4 border-l-4', profColor)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-card-foreground">{ss.skill?.name1 || 'Unknown'}</p>
                        <Badge variant="outline" className="mt-1">{StudentSkillProficiencyKeyToLabel[ss.proficiencyKey]}</Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSkill(ss.id, ss.skill?.name1 || '')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {mySkills.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">No skills added yet. Add your first skill!</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Student Drives
function StudentDrives({ student, drives, studentSkills, skills, eligibilityCriteria, driveRequirements, applications }: {
  student: Student | undefined;
  drives: PlacementDrive[];
  studentSkills: StudentSkill[];
  skills: Skill[];
  eligibilityCriteria: EligibilityCriteria[];
  driveRequirements: DriveRequirement[];
  applications: DriveApplication[];
}) {
  const mySkills = studentSkills.filter((ss: StudentSkill) => ss.student?.id === student?.id);
  const myApplicationIds = new Set(applications.filter((a: DriveApplication) => a.student?.id === student?.id).map((a: DriveApplication) => a.placementDrive?.id));
  const createApplication = useCreateDriveApplication();
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'not-eligible'>('all');

  const checkEligibility = (drive: PlacementDrive) => {
    if (!student) return { eligible: false, reasons: ['Not logged in'] };
    const reasons: string[] = [];
    const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === drive.id);
    if (criteria) {
      if (student.cGPA < criteria.minimumCGPA) reasons.push(`CGPA ${student.cGPA} below ${criteria.minimumCGPA}`);
      const studentDept = StudentDepartmentKeyToLabel[student.departmentKey];
      if (criteria.allowedDepartments !== 'All' && !criteria.allowedDepartments.includes(studentDept)) {
        reasons.push('Department not eligible');
      }
      // Check year eligibility
      if (criteria.allowedYears && criteria.allowedYears !== 'All') {
        const studentYear = StudentYearKeyToLabel[student.yearKey];
        if (!criteria.allowedYears.includes(studentYear)) {
          reasons.push(`${studentYear} not in allowed years (${criteria.allowedYears})`);
        }
      }
    }
    // Check required skills
    const requiredSkills = driveRequirements
      .filter((r: DriveRequirement) => r.placementDrive?.id === drive.id && r.isMandatory)
      .map((r: DriveRequirement) => r.skill?.id);
    const mySkillIds = new Set(mySkills.map((ss: StudentSkill) => ss.skill?.id));
    const missingMandatorySkills = requiredSkills.filter((skillId) => skillId && !mySkillIds.has(skillId));
    if (missingMandatorySkills.length > 0) {
      const missingNames = missingMandatorySkills
        .map((skillId) => skills.find((s: Skill) => s.id === skillId)?.name1)
        .filter(Boolean);
      if (missingNames.length > 0) {
        reasons.push(`Missing required skills: ${missingNames.join(', ')}`);
      }
    }
    return { eligible: reasons.length === 0, reasons };
  };

  const handleApply = async (drive: PlacementDrive) => {
    if (!student) return;
    try {
      await createApplication.mutateAsync({
        applicationName: `${student.name1} - ${drive.companyName}`,
        student: { id: student.id, name1: student.name1 },
        placementDrive: { id: drive.id, companyName: drive.companyName },
        appliedAt: new Date().toISOString(),
        statusKey: 'StatusKey0',
      });
      toast.success(`Applied to ${drive.companyName}!`);
      setSelectedDrive(null);
    } catch (err) {
      toast.error('Failed to apply');
    }
  };

  const getRequiredSkillsForDrive = (driveId: string) => {
    return driveRequirements
      .filter((r: DriveRequirement) => r.placementDrive?.id === driveId)
      .map((r: DriveRequirement) => ({
        skill: skills.find((s: Skill) => s.id === r.skill?.id),
        isMandatory: r.isMandatory,
        minimumProficiency: r.minimumProficiencyKey
      }))
      .filter((item) => item.skill);
  };

  const activeDrives = drives.filter((d: PlacementDrive) => d.statusKey === 'StatusKey0' || d.statusKey === 'StatusKey1');

  // Search and filter functionality
  const filteredDrives = activeDrives.filter((drive: PlacementDrive) => {
    const query = searchQuery.toLowerCase().trim();
    const { eligible } = checkEligibility(drive);
    
    // Apply eligibility filter
    if (eligibilityFilter === 'eligible' && !eligible) return false;
    if (eligibilityFilter === 'not-eligible' && eligible) return false;
    
    // If no search query, return all that pass eligibility filter
    if (!query) return true;
    
    // Search across multiple fields
    const companyName = (drive.companyName || '').toLowerCase();
    const jobRole = (drive.jobRole || '').toLowerCase();
    const location = (drive.location || '').toLowerCase();
    const description = (drive.description || '').toLowerCase();
    const packageStr = drive.packageLPA ? `${drive.packageLPA} lpa` : '';
    
    // Get required skills for this drive to enable skill-based search
    const driveSkills = getRequiredSkillsForDrive(drive.id)
      .map((item) => (item.skill?.name1 || '').toLowerCase())
      .join(' ');
    
    // Check if query matches any field
    return (
      companyName.includes(query) ||
      jobRole.includes(query) ||
      location.includes(query) ||
      description.includes(query) ||
      packageStr.includes(query) ||
      driveSkills.includes(query)
    );
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Placement Drives</h1>
          <p className="mt-1 text-muted-foreground">Explore opportunities and check your eligibility</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={eligibilityFilter} onValueChange={(v: string) => setEligibilityFilter(v as 'all' | 'eligible' | 'not-eligible')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drives</SelectItem>
              <SelectItem value="eligible">Eligible Only</SelectItem>
              <SelectItem value="not-eligible">Not Eligible</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company, role, skills, location..."
              className="w-80 pl-9"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search results summary */}
      {(searchQuery || eligibilityFilter !== 'all') && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {filteredDrives.length} of {activeDrives.length} drives</span>
          {searchQuery && <Badge variant="outline" className="gap-1">Search: "{searchQuery}"</Badge>}
          {eligibilityFilter !== 'all' && <Badge variant="outline">{eligibilityFilter === 'eligible' ? 'Eligible' : 'Not Eligible'}</Badge>}
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDrives.map((drive: PlacementDrive) => {
            const { eligible, reasons } = checkEligibility(drive);
            const hasApplied = myApplicationIds.has(drive.id);
            return (
              <Card key={drive.id} className={cn('transition-all hover:shadow-lg overflow-hidden', eligible ? 'border-primary/20' : 'border-destructive/20')}>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', eligible ? 'bg-primary/10' : 'bg-destructive/10')}>
                        <Building2 className={cn('h-6 w-6', eligible ? 'text-primary' : 'text-destructive')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold text-card-foreground truncate">{drive.companyName}</h3>
                        <p className="text-sm text-muted-foreground truncate">{drive.jobRole}</p>
                      </div>
                    </div>
                    <Badge className={cn('shrink-0 self-start', eligible ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground')}>
                      {eligible ? 'Eligible' : 'Not Eligible'}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0"><Calendar className="h-4 w-4 shrink-0" /> <span className="truncate">{drive.driveDate ? new Date(drive.driveDate).toLocaleDateString() : 'TBD'}</span></div>
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0"><IndianRupee className="h-4 w-4 shrink-0" /> <span className="truncate">{drive.packageLPA ? `${drive.packageLPA} LPA` : 'Not disclosed'}</span></div>
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0"><Award className="h-4 w-4 shrink-0" /> <span className="truncate">{drive.openings || 0} openings</span></div>
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0"><FileText className="h-4 w-4 shrink-0" /> <span className="truncate">{drive.location || 'Multiple'}</span></div>
                  </div>
                  {!eligible && reasons.length > 0 && (
                    <div className="mt-4 rounded-lg bg-destructive/5 p-3 overflow-hidden">
                      <p className="text-xs font-medium text-destructive">Missing Requirements:</p>
                      <ul className="mt-1 list-inside list-disc text-xs text-destructive/80">
                        {reasons.slice(0, 3).map((r: string, i: number) => <li key={i} className="truncate">{r}</li>)}
                      </ul>
                      {reasons.length > 3 && <p className="text-xs text-destructive/60 mt-1">+{reasons.length - 3} more</p>}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hasApplied ? (
                      <Button className="flex-1 min-w-[120px]" disabled><CheckCircle className="mr-2 h-4 w-4" /> Applied</Button>
                    ) : (
                      <Button className="flex-1 min-w-[120px]" disabled={!eligible} onClick={() => handleApply(drive)}>{eligible ? 'Apply Now' : 'Not Eligible'}</Button>
                    )}
                    <Button variant="outline" className="shrink-0" onClick={() => setSelectedDrive(drive)}>View Details</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {filteredDrives.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {searchQuery || eligibilityFilter !== 'all' ? 'No matching drives found' : 'No active placement drives'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery ? 'Try different keywords or clear the search' : eligibilityFilter !== 'all' ? 'Try changing the filter' : 'Check back later for new opportunities'}
            </p>
            {(searchQuery || eligibilityFilter !== 'all') && (
              <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(''); setEligibilityFilter('all'); }}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </motion.div>

      {/* Drive Details Dialog */}
      <Dialog open={!!selectedDrive} onOpenChange={(open) => !open && setSelectedDrive(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:p-7">
          {selectedDrive && (() => {
            const { eligible, reasons } = checkEligibility(selectedDrive);
            const hasApplied = myApplicationIds.has(selectedDrive.id);
            const requiredSkills = getRequiredSkillsForDrive(selectedDrive.id);
            const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === selectedDrive.id);
            return (
              <>
                <DialogHeader className="pr-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-xl', eligible ? 'bg-primary/10' : 'bg-destructive/10')}>
                      <Building2 className={cn('h-7 w-7', eligible ? 'text-primary' : 'text-destructive')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-xl break-words">{selectedDrive.companyName}</DialogTitle>
                      <DialogDescription className="text-base break-words">{selectedDrive.jobRole}</DialogDescription>
                    </div>
                    <Badge className={cn('shrink-0 self-start', eligible ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground')}>
                      {eligible ? 'Eligible' : 'Not Eligible'}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Job Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 min-w-0">
                      <IndianRupee className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Package</p>
                        <p className="font-semibold text-card-foreground truncate">{selectedDrive.packageLPA ? `${selectedDrive.packageLPA} LPA` : 'Not disclosed'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 min-w-0">
                      <MapPin className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="font-semibold text-card-foreground truncate">{selectedDrive.location || 'Multiple locations'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 min-w-0">
                      <Calendar className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Drive Date</p>
                        <p className="font-semibold text-card-foreground text-sm">{selectedDrive.driveDate ? new Date(selectedDrive.driveDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 min-w-0">
                      <Users className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Openings</p>
                        <p className="font-semibold text-card-foreground truncate">{selectedDrive.openings || 'Not specified'} positions</p>
                      </div>
                    </div>
                  </div>

                  {/* Application Deadline */}
                  <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      <p className="font-medium text-card-foreground">Application Deadline</p>
                    </div>
                    <p className="mt-1 text-lg font-bold text-primary break-words">{selectedDrive.applicationDeadline ? new Date(selectedDrive.applicationDeadline).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not specified'}</p>
                  </div>

                  {/* Description */}
                  {selectedDrive.description && (
                    <div>
                      <h3 className="mb-2 flex items-center gap-2 font-semibold text-card-foreground"><FileText className="h-4 w-4 text-primary" /> Job Description</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground break-words">{selectedDrive.description}</p>
                    </div>
                  )}

                  {/* Eligibility Criteria */}
                  {criteria && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-card-foreground"><Target className="h-4 w-4 text-primary" /> Eligibility Criteria</h3>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                          <span className="text-sm text-muted-foreground">Minimum CGPA</span>
                          <Badge variant={student && student.cGPA >= criteria.minimumCGPA ? 'default' : 'destructive'}>
                            {criteria.minimumCGPA} {student && (student.cGPA >= criteria.minimumCGPA ? <CheckCircle className="ml-1 h-3 w-3" /> : <XCircle className="ml-1 h-3 w-3" />)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                          <span className="text-sm text-muted-foreground">Allowed Departments</span>
                          <span className="text-sm font-medium text-card-foreground text-right break-words max-w-[60%]">{criteria.allowedDepartments}</span>
                        </div>
                        {criteria.allowedYears && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                            <span className="text-sm text-muted-foreground">Allowed Years</span>
                            <span className="text-sm font-medium text-card-foreground">{criteria.allowedYears}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Required Skills */}
                  {requiredSkills.length > 0 && (
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-card-foreground"><Code className="h-4 w-4 text-primary" /> Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((item, i: number) => {
                          const hasSkill = mySkills.some((ss: StudentSkill) => ss.skill?.id === item.skill?.id);
                          return (
                            <Badge
                              key={i}
                              variant={hasSkill ? 'default' : 'outline'}
                              className={cn(
                                'gap-1',
                                item.isMandatory && !hasSkill && 'border-destructive text-destructive'
                              )}
                            >
                              {item.skill?.name1}
                              {item.isMandatory && <span className="text-[10px]">*</span>}
                              {hasSkill && <CheckCircle className="h-3 w-3" />}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">* Mandatory skills</p>
                    </div>
                  )}

                  {/* Not Eligible Reasons */}
                  {!eligible && reasons.length > 0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <h3 className="mb-2 flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Why you're not eligible</h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-destructive/80">
                        {reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-4 pr-1 pb-1">
                  <Button variant="outline" onClick={() => setSelectedDrive(null)}>Close</Button>
                  {hasApplied ? (
                    <Button disabled className="gap-2"><CheckCircle className="h-4 w-4" /> Already Applied</Button>
                  ) : (
                    <Button disabled={!eligible} onClick={() => handleApply(selectedDrive)} className="gap-2">
                      {eligible ? <><Zap className="h-4 w-4" /> Apply Now</> : 'Not Eligible'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// Student Skills Analysis
function StudentSkillsAnalysis({
  student,
  studentSkills,
  skills,
  driveRequirements,
  selectedTargetRole = 'Software Engineer',
  onSelectTargetRole,
  latestAnalysis = null,
  isAnalysisLoading = false,
  onNavigate,
}: {
  student: Student | undefined;
  studentSkills: StudentSkill[];
  skills: Skill[];
  driveRequirements: DriveRequirement[];
  selectedTargetRole?: string;
  onSelectTargetRole?: (role: string) => void;
  latestAnalysis?: ResumeAnalysisRecord | null;
  isAnalysisLoading?: boolean;
  onNavigate?: (view: View) => void;
}) {
  const hasAnalysis = Boolean(latestAnalysis && latestAnalysis.status === 'completed');
  const extractedSkills = hasAnalysis ? (latestAnalysis?.skills || []) : [];
  const missingSkills = hasAnalysis ? (latestAnalysis?.missing_skills || []) : [];
  const recommendations = hasAnalysis ? (latestAnalysis?.recommendations || []) : [];
  const strengths = hasAnalysis ? (latestAnalysis?.strengths || []) : [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Skill Gap Analysis</h1>
          <p className="mt-1 text-muted-foreground">AI-evaluated skill gaps and recommendations for {selectedTargetRole}</p>
        </div>
        {onSelectTargetRole && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Target Role:</span>
            <Select value={selectedTargetRole} onValueChange={onSelectTargetRole}>
              <SelectTrigger className="h-9 w-52 bg-background">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                <SelectItem value="Machine Learning Engineer">Machine Learning Engineer</SelectItem>
                <SelectItem value="Data Engineer">Data Engineer</SelectItem>
                <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                <SelectItem value="Mobile Developer">Mobile Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {isAnalysisLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-3"><Code className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-3xl font-bold text-primary">{extractedSkills.length}</p>
                  <p className="text-sm text-muted-foreground">Skills Detected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/20 bg-gradient-to-br from-card to-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-destructive/10 p-3"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-3xl font-bold text-destructive">{missingSkills.length}</p>
                  <p className="text-sm text-muted-foreground">Skill Gaps</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-accent/20 p-3"><TrendingUp className="h-5 w-5 text-accent-foreground" /></div>
                <div>
                  <p className="text-3xl font-bold text-accent-foreground">{hasAnalysis ? `${latestAnalysis?.score}%` : 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">Readiness Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {hasAnalysis ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" />Detected Skills</CardTitle>
                <CardDescription>Extracted from your resume for {selectedTargetRole}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {extractedSkills.map((skillName: string) => (
                    <Badge key={skillName} className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                      <CircleCheck className="h-3 w-3" /> {skillName}
                    </Badge>
                  ))}
                  {extractedSkills.length === 0 && <p className="text-sm text-muted-foreground">No matching skills detected.</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Skills to Develop</CardTitle>
                <CardDescription>Recommended skill focus for {selectedTargetRole}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {missingSkills.map((skillName: string) => (
                    <div key={skillName} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-accent-foreground" />
                        <span className="text-sm font-medium text-foreground">{skillName}</span>
                      </div>
                      <Badge className="bg-destructive text-destructive-foreground">High Priority</Badge>
                    </div>
                  ))}
                  {missingSkills.length === 0 && <p className="text-sm text-muted-foreground">No major skill gaps identified!</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-2 border-accent/30 bg-gradient-to-br from-card to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent-foreground" />AI Recommendations & Insights</CardTitle>
                <CardDescription>Actionable feedback tailored to {selectedTargetRole}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <span className="text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{rec}</p>
                    </li>
                  ))}
                  {strengths.map((str: string, index: number) => (
                    <li key={`str-${index}`} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm text-foreground">{str}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed">
          <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Not Analyzed Yet for {selectedTargetRole}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Upload your resume and run an AI analysis in the Resume Analyzer to identify skill gaps and recommendations for {selectedTargetRole}.
          </p>
          {onNavigate && (
            <Button className="mt-6 gap-2" onClick={() => onNavigate('student-resume-analyzer')}>
              <TrendingUp className="h-4 w-4" /> Go to Resume Analyzer
            </Button>
          )}
        </Card>
      )}
    </motion.div>
  );
}

// Student Notifications
function StudentNotifications({ notifications, student, onNavigate }: { notifications: Notification[]; student: Student | undefined; onNavigate: (view: View) => void }) {
  const studentNotifications = notifications.filter((n: Notification) => !n.student || n.student.id === student?.id);

  // Check if notification is drive-related
  const isDriveNotification = (notification: Notification) => {
    const driveKeywords = ['drive', 'placement', 'company', 'hiring', 'opening', 'opportunity', 'recruitment', 'apply'];
    const titleLower = notification.title?.toLowerCase() || '';
    const messageLower = notification.message?.toLowerCase() || '';
    return driveKeywords.some((keyword: string) => titleLower.includes(keyword) || messageLower.includes(keyword));
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Stay updated with placement activities</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {studentNotifications.map((n: Notification) => (
                <div key={n.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-card-foreground">{n.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                      </div>
                      {!n.isRead && <Badge className="bg-primary text-primary-foreground">New</Badge>}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently'}</p>
                      {isDriveNotification(n) && (
                        <Button size="sm" className="gap-2" onClick={() => onNavigate('student-drives')}>
                          <Briefcase className="h-3.5 w-3.5" /> Apply Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {studentNotifications.length === 0 && <p className="py-12 text-center text-muted-foreground">No notifications yet</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}



// Admin Dashboard
function AdminDashboard({ students, drives, applications }: { students: Student[]; drives: PlacementDrive[]; applications: DriveApplication[] }) {
  const nonAdminStudents = students.filter((s: Student) => s.roleKey === 'RoleKey0');
  const activeDrives = drives.filter((d: PlacementDrive) => d.statusKey === 'StatusKey0' || d.statusKey === 'StatusKey1');
  const avgReadiness = nonAdminStudents.length > 0 ? Math.round(nonAdminStudents.reduce((acc: number, s: Student) => acc + (s.readinessScore || 0), 0) / nonAdminStudents.length) : 0;
  const selectedCount = applications.filter((a: DriveApplication) => a.statusKey === 'StatusKey3').length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of placement activities and student metrics</p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Users, value: nonAdminStudents.length, label: 'Total Students', color: 'bg-primary/10 text-primary' },
          { icon: Briefcase, value: activeDrives.length, label: 'Active Drives', color: 'bg-accent/20 text-accent-foreground' },
          { icon: TrendingUp, value: `${avgReadiness}%`, label: 'Avg Readiness', color: 'bg-secondary text-secondary-foreground' },
          { icon: CheckCircle, value: selectedCount, label: 'Students Placed', color: 'bg-primary/10 text-primary' },
        ].map((stat, i: number) => (
          <Card key={i} className="transition-all hover:shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn('rounded-xl p-3', stat.color)}><stat.icon className="h-5 w-5" /></div>
                <span className="font-display text-4xl font-bold text-card-foreground">{stat.value}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-card-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Placement Drives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drives.slice(0, 5).map((drive: PlacementDrive) => (
                  <div key={drive.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="font-medium text-card-foreground">{drive.companyName}</p>
                        <p className="text-sm text-muted-foreground">{drive.jobRole}</p>
                      </div>
                    </div>
                    <Badge variant={drive.statusKey === 'StatusKey1' ? 'default' : 'secondary'}>{PlacementDriveStatusKeyToLabel[drive.statusKey]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nonAdminStudents.sort((a: Student, b: Student) => (b.readinessScore || 0) - (a.readinessScore || 0)).slice(0, 5).map((s: Student, i: number) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 font-bold text-accent-foreground">{i + 1}</div>
                      <div>
                        <p className="font-medium text-card-foreground">{s.name1}</p>
                        <p className="text-sm text-muted-foreground">{s.rollNumber} • {StudentDepartmentKeyToLabel[s.departmentKey]}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">{s.readinessScore}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}



// Admin Students
function AdminStudents({ students }: { students: Student[] }) {
  const nonAdminStudents = students.filter((s: Student) => s.roleKey === 'RoleKey0');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="mt-1 text-muted-foreground">View and manage student profiles</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search students..." className="w-64 pl-9" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {nonAdminStudents.map((student: Student) => (
                <div key={student.id} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 font-bold text-accent-foreground">{student.name1?.charAt(0) || 'S'}</div>
                    <div>
                      <p className="font-medium text-card-foreground">{student.name1}</p>
                      <p className="text-sm text-muted-foreground">{student.rollNumber} • {StudentDepartmentKeyToLabel[student.departmentKey]} • CGPA: {student.cGPA}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">Readiness: {student.readinessScore}%</p>
                      <Progress value={student.readinessScore || 0} className="mt-1 h-2 w-24" />
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Admin Analytics
function AdminAnalytics({ students, drives }: { students: Student[]; drives: PlacementDrive[] }) {
  const nonAdminStudents = students.filter((s: Student) => s.roleKey === 'RoleKey0');
  const departments = Object.entries(StudentDepartmentKeyToLabel).map(([key, label]) => {
    const deptStudents = nonAdminStudents.filter((s: Student) => s.departmentKey === key);
    const avgReadiness = deptStudents.length > 0 ? Math.round(deptStudents.reduce((acc: number, s: Student) => acc + (s.readinessScore || 0), 0) / deptStudents.length) : 0;
    return { key, label, count: deptStudents.length, avgReadiness };
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Placement statistics and insights</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departments.filter((d) => d.count > 0).map((dept) => (
                <div key={dept.key} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{dept.label.slice(0, 3).toUpperCase()}</div>
                    <div>
                      <p className="font-medium text-card-foreground">{dept.label}</p>
                      <p className="text-sm text-muted-foreground">{dept.count} Students • Avg Readiness: {dept.avgReadiness}%</p>
                    </div>
                  </div>
                  <div className="w-48">
                    <Progress value={dept.avgReadiness} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Admin Notifications
function AdminNotifications({ notifications }: { notifications: Notification[] }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Send and manage notifications</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Send Notification</Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {notifications.slice(0, 10).map((n: Notification) => (
                <div key={n.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2"><Bell className="h-4 w-4 text-primary" /></div>
                    <div>
                      <p className="font-medium text-card-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recently'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Admin Settings
function AdminSettings() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Configure platform settings</p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Default Minimum CGPA</Label>
                <Input type="number" step="0.1" defaultValue="6.0" />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select defaultValue="2024-25">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-25">2024-25</SelectItem>
                    <SelectItem value="2025-26">2025-26</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => toast.success('Settings saved!')}>Save Settings</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Login Portal Component with Supabase Authentication
function LoginPortal({ onLogin: _onLogin }: { onLogin: (role: UserRole, credentials: { email: string; password: string }) => void }) {
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    if (authMode !== 'forgot-password' && !password) {
      toast.error('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await signIn(email, password);
      } else if (authMode === 'signup') {
        await signUp(email, password);
      } else if (authMode === 'forgot-password') {
        await resetPassword(email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSelection = () => {
    setSelectedRole(null);
    setAuthMode('login');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-2xl shadow-primary/30">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">PlaceTrack</h1>
          <p className="mt-2 text-lg text-muted-foreground">Placement &amp; Skill Gap Analytics Platform</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
              className="w-full max-w-3xl"
            >
              <Card className="border-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">Choose Your Portal</CardTitle>
                  <CardDescription className="text-base">Select your role to access the placement management system</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Student Portal Card */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRole('student')}
                      className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10 focus:outline-none focus:border-primary"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="relative">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                          <UserCircle className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-display text-2xl font-bold text-card-foreground">Student Portal</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Access your placement profile, view drives, track applications, and analyze your resume</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">View Drives</Badge>
                          <Badge variant="secondary" className="text-xs">Track Applications</Badge>
                          <Badge variant="secondary" className="text-xs">Analyze Resume</Badge>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                          <span>Continue as Student</span>
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.button>

                    {/* Admin Portal Card */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRole('admin')}
                      className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-8 text-left transition-all hover:border-primary hover:shadow-xl hover:shadow-primary/10 focus:outline-none focus:border-primary"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="relative">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                          <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-display text-2xl font-bold text-card-foreground">Admin Portal</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Manage placement drives, view student data, generate reports, and configure settings</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">Manage Drives</Badge>
                          <Badge variant="secondary" className="text-xs">View Analytics</Badge>
                          <Badge variant="secondary" className="text-xs">Send Notifications</Badge>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                          <span>Continue as Admin</span>
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
              className="w-full max-w-md"
            >
              <Card className="border-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
                <CardHeader className="text-center pb-2">
                  <div className={cn(
                    'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl',
                    selectedRole === 'student' ? 'bg-primary/10' : 'bg-accent/20'
                  )}>
                    {selectedRole === 'student' ? (
                      <UserCircle className="h-7 w-7 text-primary" />
                    ) : (
                      <Shield className="h-7 w-7 text-accent-foreground" />
                    )}
                  </div>
                  <CardTitle className="text-2xl">
                    {authMode === 'login' && (selectedRole === 'student' ? 'Student Login' : 'Admin Login')}
                    {authMode === 'signup' && 'Create Account'}
                    {authMode === 'forgot-password' && 'Reset Password'}
                  </CardTitle>
                  <CardDescription>
                    {authMode === 'login' && 'Sign in using your Supabase credentials'}
                    {authMode === 'signup' && 'Register for a new student placement account'}
                    {authMode === 'forgot-password' && 'Enter your email to receive a password recovery link'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Mode Navigation Tabs */}
                  {authMode !== 'forgot-password' && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1 text-center text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className={cn(
                          'rounded-lg py-2 transition-all',
                          authMode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className={cn(
                          'rounded-lg py-2 transition-all',
                          authMode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        Sign Up
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={selectedRole === 'student' ? 'student@college.edu' : 'admin@college.edu'}
                          className="pl-10"
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {authMode !== 'forgot-password' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          {authMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => setAuthMode('forgot-password')}
                              className="text-xs text-primary hover:underline"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            className="pl-10"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 space-y-3">
                      <Button
                        type="submit"
                        className="w-full gap-2"
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {authMode === 'login' ? 'Signing in...' : authMode === 'signup' ? 'Creating account...' : 'Sending link...'}
                          </>
                        ) : (
                          <>
                            <LogOut className="h-4 w-4" />
                            {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Sign Up' : 'Send Recovery Link'}
                          </>
                        )}
                      </Button>

                      {authMode === 'forgot-password' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setAuthMode('login')}
                        >
                          Back to Sign In
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={handleBackToSelection}
                      >
                        ← Back to Portal Selection
                      </Button>
                    </div>
                  </form>

                  {/* Supabase Status Banner */}
                  {!isConfigured ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>Supabase Environment Not Configured</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Please add <code className="font-mono bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-muted px-1 py-0.5 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> to your local <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Protected by <span className="font-semibold text-primary">Supabase Auth</span> &bull; Real-Time Security
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-muted-foreground"
        >
          Aditya University &bull; Placement Cell
        </motion.p>
      </div>
    </div>
  );
}

// Main App Content (after login)
function MainAppContent({ role, onLogout }: { role: UserRole; onLogout: () => void }) {
  const { user } = useAuth();
  const { data: students = [], isLoading: studentsLoading } = useStudentList();
  const { data: drives = [], isLoading: drivesLoading } = usePlacementDriveList();
  const { data: skills = [], isLoading: skillsLoading } = useSkillList();
  const { data: studentSkills = [] } = useStudentSkillList();
  const { data: notifications = [] } = useNotificationList();
  const { data: eligibilityCriteria = [] } = useEligibilityCriteriaList();
  const { data: driveRequirements = [] } = useDriveRequirementList();
  const { data: applications = [] } = useDriveApplicationList();

  const defaultView: View = role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
  const [currentView, setCurrentView] = useState<View>(defaultView);
  
  // Student Profile State
  const [currentStudent, setCurrentStudent] = useState<Student | undefined>(undefined);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Target Role & Score State
  const [selectedTargetRole, setSelectedTargetRole] = useState<string>('Software Engineer');
  const [latestAnalysis, setLatestAnalysis] = useState<ResumeAnalysisRecord | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(true);

  const fetchLatestAnalysis = async (targetRoleToFetch: string) => {
    if (!user) {
      setLatestAnalysis(null);
      setIsAnalysisLoading(false);
      return;
    }
    setIsAnalysisLoading(true);
    try {
      const { record } = await getLatestResumeAnalysis(user.id, targetRoleToFetch);
      setLatestAnalysis(record);
    } catch {
      setLatestAnalysis(null);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setIsProfileLoading(true);
      getOrCreateStudentProfile(user)
        .then((prof) => {
          setCurrentStudent(prof);
          setIsProfileLoading(false);
        })
        .catch(() => {
          setIsProfileLoading(false);
        });
    } else {
      setIsProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLatestAnalysis(selectedTargetRole);
  }, [user, selectedTargetRole]);

  const handleResumeScoreUpdate = (score: number, fileName: string, targetRole: string) => {
    if (user) {
      fetchLatestAnalysis(targetRole || selectedTargetRole);
    }
  };

  const isLoading = studentsLoading || drivesLoading || skillsLoading || isProfileLoading;

  const handleNavigate = (view: View) => {
    setCurrentView(view);
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" aria-hidden="true" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i: number) => <Skeleton key={i} className="h-32" aria-hidden="true" />)}
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'student-dashboard': return <StudentDashboard student={currentStudent} drives={drives} studentSkills={studentSkills} notifications={notifications} skills={skills} eligibilityCriteria={eligibilityCriteria} driveRequirements={driveRequirements} applications={applications} onNavigate={handleNavigate} selectedTargetRole={selectedTargetRole} onSelectTargetRole={setSelectedTargetRole} latestAnalysis={latestAnalysis} isAnalysisLoading={isAnalysisLoading} />;
      case 'student-profile': return <StudentProfile student={currentStudent} studentSkills={studentSkills} skills={skills} onProfileUpdated={setCurrentStudent} />;
      case 'student-drives': return <StudentDrives student={currentStudent} drives={drives} studentSkills={studentSkills} skills={skills} eligibilityCriteria={eligibilityCriteria} driveRequirements={driveRequirements} applications={applications} />;
      case 'student-skills': return <StudentSkillsAnalysis student={currentStudent} studentSkills={studentSkills} skills={skills} driveRequirements={driveRequirements} selectedTargetRole={selectedTargetRole} onSelectTargetRole={setSelectedTargetRole} latestAnalysis={latestAnalysis} isAnalysisLoading={isAnalysisLoading} onNavigate={handleNavigate} />;
      case 'student-notifications': return <StudentNotifications notifications={notifications} student={currentStudent} onNavigate={handleNavigate} />;
      case 'student-applied-drives': return <StudentAppliedDrives student={currentStudent} drives={drives} applications={applications} eligibilityCriteria={eligibilityCriteria} />;
      case 'student-resume-analyzer': return <StudentResumeAnalyzer student={currentStudent} drives={drives} onScoreCalculated={handleResumeScoreUpdate} />;
      case 'admin-dashboard': return <AdminDashboard students={students} drives={drives} applications={applications} />;
      case 'admin-drives': return <AdminManageDrives drives={drives} skills={skills} eligibilityCriteria={eligibilityCriteria} driveRequirements={driveRequirements} />;
      case 'admin-students': return <AdminStudents students={students} />;
      case 'admin-analytics': return <AdminAnalytics students={students} drives={drives} />;
      case 'admin-notifications': return <AdminNotifications notifications={notifications} />;
      case 'admin-settings': return <AdminSettings />;
      default: return <StudentDashboard student={currentStudent} drives={drives} studentSkills={studentSkills} notifications={notifications} skills={skills} eligibilityCriteria={eligibilityCriteria} driveRequirements={driveRequirements} applications={applications} onNavigate={handleNavigate} selectedTargetRole={selectedTargetRole} onSelectTargetRole={setSelectedTargetRole} latestAnalysis={latestAnalysis} isAnalysisLoading={isAnalysisLoading} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar role={role} currentView={currentView} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5">
                {role === 'student' ? <UserCircle className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                {role === 'student' ? 'Student Portal' : 'Admin Portal'}
              </Badge>
              <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <div className="p-6">
            {!user && (
              <InMemoryDataBanner show={HAS_IN_MEMORY_TABLES} message="This app uses draft tables for testing. Data entered won't be saved. Contact the app owner to enable storage." className="mb-6 bg-warning/10 text-warning-foreground border-warning/30" />
            )}
            <AnimatePresence mode="wait">
              <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" as const }}>
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// App Content with Supabase Authentication & Protected Routes
function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('student');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Checking authentication session...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    setUserRole('student');
  };

  return user ? (
    <MainAppContent role={userRole} onLogout={handleLogout} />
  ) : (
    <LoginPortal onLogin={() => {}} />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <AuthProvider>
            <AppContent />
            <Toaster richColors />
          </AuthProvider>
        </JotaiProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
