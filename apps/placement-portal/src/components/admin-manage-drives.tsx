import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    useCreatePlacementDrive,
    useUpdatePlacementDrive,
    useCreateEligibilityCriteria,
    useUpdateEligibilityCriteria,
    useCreateDriveRequirement,
    useDeleteDriveRequirement,
} from '@/generated/hooks';
import { StudentDepartmentKeyToLabel, StudentYearKeyToLabel } from '@/generated/models/student-model';
import { PlacementDriveStatusKeyToLabel, type PlacementDriveStatusKey } from '@/generated/models/placement-drive-model';
import { DriveRequirementMinimumProficiencyKeyToLabel, type DriveRequirementMinimumProficiencyKey } from '@/generated/models/drive-requirement-model';
import type { Skill } from '@/generated/models/skill-model';
import type { PlacementDrive } from '@/generated/models/placement-drive-model';
import type { EligibilityCriteria } from '@/generated/models/eligibility-criteria-model';
import type { DriveRequirement } from '@/generated/models/drive-requirement-model';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Target, Code, Plus, Trash2, CheckCircle } from 'lucide-react';

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

interface AdminManageDrivesProps {
    drives: PlacementDrive[];
    skills: Skill[];
    eligibilityCriteria: EligibilityCriteria[];
    driveRequirements: DriveRequirement[];
}

export function AdminManageDrives({ drives, skills, eligibilityCriteria, driveRequirements }: AdminManageDrivesProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingDrive, setEditingDrive] = useState<PlacementDrive | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [companyName, setCompanyName] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [driveDate, setDriveDate] = useState('');
    const [applicationDeadline, setApplicationDeadline] = useState('');
    const [location, setLocation] = useState('');
    const [packageLPA, setPackageLPA] = useState('');
    const [openings, setOpenings] = useState('');
    const [description, setDescription] = useState('');
    const [statusKey, setStatusKey] = useState<PlacementDriveStatusKey>('StatusKey0');

    // Eligibility criteria state
    const [minimumCGPA, setMinimumCGPA] = useState('6.0');
    const [maximumBacklogs, setMaximumBacklogs] = useState('0');
    const [allowedDepartments, setAllowedDepartments] = useState<string[]>(['All']);
    const [allowedYears, setAllowedYears] = useState<string[]>(['4th Year']);

    // Required skills state
    const [selectedSkills, setSelectedSkills] = useState<{ skillId: string; proficiency: DriveRequirementMinimumProficiencyKey; isMandatory: boolean; existingId?: string }[]>([]);

    // Mutations
    const createDrive = useCreatePlacementDrive();
    const updateDrive = useUpdatePlacementDrive();
    const createEligibility = useCreateEligibilityCriteria();
    const updateEligibility = useUpdateEligibilityCriteria();
    const createRequirement = useCreateDriveRequirement();
    const deleteRequirement = useDeleteDriveRequirement();

    const resetForm = () => {
        setCompanyName('');
        setJobRole('');
        setDriveDate('');
        setApplicationDeadline('');
        setLocation('');
        setPackageLPA('');
        setOpenings('');
        setDescription('');
        setStatusKey('StatusKey0');
        setMinimumCGPA('6.0');
        setMaximumBacklogs('0');
        setAllowedDepartments(['All']);
        setAllowedYears(['4th Year']);
        setSelectedSkills([]);
        setEditingDrive(null);
    };

    const openEditDialog = (drive: PlacementDrive) => {
        setEditingDrive(drive);
        setCompanyName(drive.companyName || '');
        setJobRole(drive.jobRole || '');
        setDriveDate(drive.driveDate ? drive.driveDate.split('T')[0] : '');
        setApplicationDeadline(drive.applicationDeadline ? drive.applicationDeadline.split('T')[0] : '');
        setLocation(drive.location || '');
        setPackageLPA(drive.packageLPA?.toString() || '');
        setOpenings(drive.openings?.toString() || '');
        setDescription(drive.description || '');
        setStatusKey(drive.statusKey || 'StatusKey0');

        // Load eligibility criteria
        const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === drive.id);
        if (criteria) {
            setMinimumCGPA(criteria.minimumCGPA?.toString() || '6.0');
            setMaximumBacklogs(criteria.maximumBacklogs?.toString() || '0');
            if (criteria.allowedDepartments === 'All') {
                setAllowedDepartments(['All']);
            } else {
                setAllowedDepartments(criteria.allowedDepartments?.split(', ').filter(Boolean) || ['All']);
            }
            setAllowedYears(criteria.allowedYears?.split(', ').filter(Boolean) || ['4th Year']);
        } else {
            setMinimumCGPA('6.0');
            setMaximumBacklogs('0');
            setAllowedDepartments(['All']);
            setAllowedYears(['4th Year']);
        }

        // Load skill requirements
        const requirements = driveRequirements.filter((r: DriveRequirement) => r.placementDrive?.id === drive.id);
        setSelectedSkills(requirements.map((r: DriveRequirement) => ({
            skillId: r.skill?.id || '',
            proficiency: r.minimumProficiencyKey || 'MinimumProficiencyKey1',
            isMandatory: r.isMandatory ?? true,
            existingId: r.id,
        })));

        setIsEditDialogOpen(true);
    };

    const handleAddSkillRequirement = () => {
        setSelectedSkills([...selectedSkills, { skillId: '', proficiency: 'MinimumProficiencyKey1', isMandatory: true }]);
    };

    const handleRemoveSkillRequirement = (index: number) => {
        setSelectedSkills(selectedSkills.filter((_: { skillId: string; proficiency: DriveRequirementMinimumProficiencyKey; isMandatory: boolean; existingId?: string }, i: number) => i !== index));
    };

    const handleSkillChange = (index: number, field: 'skillId' | 'proficiency' | 'isMandatory', value: string | boolean) => {
        const updated = [...selectedSkills];
        if (field === 'isMandatory') {
            updated[index] = { ...updated[index], isMandatory: value as boolean };
        } else if (field === 'proficiency') {
            updated[index] = { ...updated[index], proficiency: value as DriveRequirementMinimumProficiencyKey };
        } else {
            updated[index] = { ...updated[index], skillId: value as string };
        }
        setSelectedSkills(updated);
    };

    const toggleDepartment = (dept: string) => {
        if (dept === 'All') {
            // Toggle All: switch to All departments
            setAllowedDepartments(['All']);
        } else {
            // Remove 'All' if present when selecting specific departments
            const current = allowedDepartments.filter((d: string) => d !== 'All');

            if (current.includes(dept)) {
                // Deselect this department
                const updated = current.filter((d: string) => d !== dept);
                // If no departments left, default to 'All'
                if (updated.length === 0) {
                    setAllowedDepartments(['All']);
                } else {
                    setAllowedDepartments(updated);
                }
            } else {
                // Select this department
                // Check if all individual departments would be selected
                const allDeptLabels = Object.values(StudentDepartmentKeyToLabel);
                const updatedSelection = [...current, dept];
                if (updatedSelection.length === allDeptLabels.length) {
                    // All individual depts selected, switch to 'All'
                    setAllowedDepartments(['All']);
                } else {
                    setAllowedDepartments(updatedSelection);
                }
            }
        }
    };

    const toggleYear = (year: string) => {
        // Single selection only - always set to the clicked year
        setAllowedYears([year]);
    };

    const handleSubmit = async () => {
        // Validation
        if (!companyName.trim()) { toast.error('Company name is required'); return; }
        if (!jobRole.trim()) { toast.error('Job role is required'); return; }
        if (!driveDate) { toast.error('Drive date is required'); return; }
        if (!applicationDeadline) { toast.error('Application deadline is required'); return; }
        if (!location.trim()) { toast.error('Location is required'); return; }
        if (!packageLPA || isNaN(Number(packageLPA)) || Number(packageLPA) <= 0) { toast.error('Valid package (LPA) is required'); return; }
        if (!openings || isNaN(Number(openings)) || Number(openings) <= 0) { toast.error('Valid openings count is required'); return; }
        if (!minimumCGPA || isNaN(Number(minimumCGPA)) || Number(minimumCGPA) < 0 || Number(minimumCGPA) > 10) { toast.error('Valid minimum CGPA (0-10) is required'); return; }

        setIsSubmitting(true);

        try {
            const driveData = {
                companyName: companyName.trim(),
                jobRole: jobRole.trim(),
                driveDate,
                applicationDeadline,
                location: location.trim(),
                packageLPA: Number(packageLPA),
                openings: Number(openings),
                description: description.trim() || undefined,
                statusKey,
            };

            const newDrive = await createDrive.mutateAsync(driveData);

            const deptString = allowedDepartments.includes('All') ? 'All' : allowedDepartments.join(', ');
            const yearString = allowedYears.join(', ');

            await createEligibility.mutateAsync({
                criteriaName: `${companyName} - ${jobRole} Criteria`,
                minimumCGPA: Number(minimumCGPA),
                maximumBacklogs: Number(maximumBacklogs),
                allowedDepartments: deptString,
                allowedYears: yearString,
                placementDrive: { id: newDrive.id, companyName: newDrive.companyName },
            });

            for (const skillReq of selectedSkills) {
                if (skillReq.skillId) {
                    const skill = skills.find((s: Skill) => s.id === skillReq.skillId);
                    if (skill) {
                        await createRequirement.mutateAsync({
                            requirementName: `${skill.name1} requirement`,
                            skill: { id: skill.id, name1: skill.name1 },
                            minimumProficiencyKey: skillReq.proficiency,
                            isMandatory: skillReq.isMandatory,
                            placementDrive: { id: newDrive.id, companyName: newDrive.companyName },
                        });
                    }
                }
            }

            toast.success(`Drive "${companyName}" created successfully!`);
            resetForm();
            setIsAddDialogOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to create drive');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingDrive) return;

        // Validation
        if (!companyName.trim()) { toast.error('Company name is required'); return; }
        if (!jobRole.trim()) { toast.error('Job role is required'); return; }
        if (!driveDate) { toast.error('Drive date is required'); return; }
        if (!applicationDeadline) { toast.error('Application deadline is required'); return; }
        if (!location.trim()) { toast.error('Location is required'); return; }
        if (!packageLPA || isNaN(Number(packageLPA)) || Number(packageLPA) <= 0) { toast.error('Valid package (LPA) is required'); return; }
        if (!openings || isNaN(Number(openings)) || Number(openings) <= 0) { toast.error('Valid openings count is required'); return; }
        if (!minimumCGPA || isNaN(Number(minimumCGPA)) || Number(minimumCGPA) < 0 || Number(minimumCGPA) > 10) { toast.error('Valid minimum CGPA (0-10) is required'); return; }

        setIsSubmitting(true);

        try {
            // 1. Update the placement drive
            await updateDrive.mutateAsync({
                id: editingDrive.id,
                changedFields: {
                    companyName: companyName.trim(),
                    jobRole: jobRole.trim(),
                    driveDate,
                    applicationDeadline,
                    location: location.trim(),
                    packageLPA: Number(packageLPA),
                    openings: Number(openings),
                    description: description.trim() || undefined,
                    statusKey,
                },
            });

            // 2. Update eligibility criteria
            const criteria = eligibilityCriteria.find((c: EligibilityCriteria) => c.placementDrive?.id === editingDrive.id);
            const deptString = allowedDepartments.includes('All') ? 'All' : allowedDepartments.join(', ');
            const yearString = allowedYears.join(', ');

            if (criteria) {
                await updateEligibility.mutateAsync({
                    id: criteria.id,
                    changedFields: {
                        minimumCGPA: Number(minimumCGPA),
                        maximumBacklogs: Number(maximumBacklogs),
                        allowedDepartments: deptString,
                        allowedYears: yearString,
                    },
                });
            } else {
                await createEligibility.mutateAsync({
                    criteriaName: `${companyName} - ${jobRole} Criteria`,
                    minimumCGPA: Number(minimumCGPA),
                    maximumBacklogs: Number(maximumBacklogs),
                    allowedDepartments: deptString,
                    allowedYears: yearString,
                    placementDrive: { id: editingDrive.id, companyName: editingDrive.companyName },
                });
            }

            // 3. Handle skill requirements - delete existing ones first, then create new ones
            const existingRequirements = driveRequirements.filter((r: DriveRequirement) => r.placementDrive?.id === editingDrive.id);
            for (const req of existingRequirements) {
                await deleteRequirement.mutateAsync(req.id);
            }

            // Create new skill requirements
            for (const skillReq of selectedSkills) {
                if (skillReq.skillId) {
                    const skill = skills.find((s: Skill) => s.id === skillReq.skillId);
                    if (skill) {
                        await createRequirement.mutateAsync({
                            requirementName: `${skill.name1} requirement`,
                            skill: { id: skill.id, name1: skill.name1 },
                            minimumProficiencyKey: skillReq.proficiency,
                            isMandatory: skillReq.isMandatory,
                            placementDrive: { id: editingDrive.id, companyName: companyName.trim() },
                        });
                    }
                }
            }

            toast.success(`Drive "${companyName}" updated successfully!`);
            resetForm();
            setIsEditDialogOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to update drive');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render form fields (shared between add and edit)
    const renderFormFields = () => (
        <div className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Company Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
                        <Input id="companyName" placeholder="e.g., Google" value={companyName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="jobRole">Job Role <span className="text-destructive">*</span></Label>
                        <Input id="jobRole" placeholder="e.g., Software Engineer" value={jobRole} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobRole(e.target.value)} />
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="driveDate">Drive Date <span className="text-destructive">*</span></Label>
                        <Input id="driveDate" type="date" value={driveDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriveDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="deadline">Application Deadline <span className="text-destructive">*</span></Label>
                        <Input id="deadline" type="date" value={applicationDeadline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApplicationDeadline(e.target.value)} />
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
                        <Input id="location" placeholder="e.g., Bangalore" value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="package">Package (LPA) <span className="text-destructive">*</span></Label>
                        <Input id="package" type="number" step="0.5" min="0" placeholder="e.g., 12" value={packageLPA} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPackageLPA(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="openings">Openings <span className="text-destructive">*</span></Label>
                        <Input id="openings" type="number" min="1" placeholder="e.g., 10" value={openings} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenings(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusKey} onValueChange={(val: string) => setStatusKey(val as PlacementDriveStatusKey)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Object.entries(PlacementDriveStatusKeyToLabel).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Job description and additional details..." value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} rows={3} />
                </div>
            </div>

            {/* Eligibility Criteria Section */}
            <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="h-4 w-4" /> Eligibility Criteria</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="cgpa">Minimum CGPA <span className="text-destructive">*</span></Label>
                        <Input id="cgpa" type="number" step="0.1" min="0" max="10" value={minimumCGPA} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinimumCGPA(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="backlogs">Maximum Backlogs Allowed</Label>
                        <Input id="backlogs" type="number" min="0" value={maximumBacklogs} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaximumBacklogs(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Eligible Departments</Label>
                    <p className="text-xs text-muted-foreground">Select specific departments or choose "All Departments" to include all branches.</p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={allowedDepartments.includes('All') ? 'default' : 'outline'} size="sm" onClick={() => toggleDepartment('All')} className="font-medium">All Departments</Button>
                        {Object.entries(StudentDepartmentKeyToLabel).map(([_, label]) => (
                            <Button key={label} type="button" variant={allowedDepartments.includes(label) && !allowedDepartments.includes('All') ? 'default' : 'outline'} size="sm" onClick={() => toggleDepartment(label)}>{label}</Button>
                        ))}
                    </div>
                    {!allowedDepartments.includes('All') && allowedDepartments.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{allowedDepartments.length} department{allowedDepartments.length !== 1 ? 's' : ''} selected</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Eligible Years</Label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(StudentYearKeyToLabel).map(([_, label]) => (
                            <Button key={label} type="button" variant={allowedYears.includes(label) ? 'default' : 'outline'} size="sm" onClick={() => toggleYear(label)}>{label}</Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Required Skills Section */}
            <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Code className="h-4 w-4" /> Required Skills</h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddSkillRequirement} className="gap-1"><Plus className="h-3 w-3" /> Add Skill</Button>
                </div>
                {selectedSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No skill requirements added yet. Click "Add Skill" to define required skills.</p>
                ) : (
                    <div className="space-y-3">
                        {selectedSkills.map((skillReq: { skillId: string; proficiency: DriveRequirementMinimumProficiencyKey; isMandatory: boolean; existingId?: string }, index: number) => (
                            <div key={index} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3">
                                <div className="min-w-[180px] flex-1 space-y-1">
                                    <Label className="text-xs">Skill</Label>
                                    <Select value={skillReq.skillId || 'placeholder'} onValueChange={(val: string) => handleSkillChange(index, 'skillId', val === 'placeholder' ? '' : val)}>
                                        <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="placeholder" disabled>Select skill</SelectItem>
                                            {skills.map((skill: Skill) => (
                                                <SelectItem key={skill.id} value={skill.id}>{skill.name1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="min-w-[140px] space-y-1">
                                    <Label className="text-xs">Proficiency</Label>
                                    <Select value={skillReq.proficiency} onValueChange={(val: string) => handleSkillChange(index, 'proficiency', val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(DriveRequirementMinimumProficiencyKeyToLabel).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant={skillReq.isMandatory ? 'default' : 'outline'} size="sm" onClick={() => handleSkillChange(index, 'isMandatory', !skillReq.isMandatory)}>
                                        {skillReq.isMandatory ? 'Mandatory' : 'Optional'}
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSkillRequirement(index)} className="text-destructive hover:bg-destructive/10">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Manage Drives</h1>
                    <p className="mt-1 text-muted-foreground">Create and manage placement drives</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={(open: boolean) => { if (!open) resetForm(); setIsAddDialogOpen(open); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Drive</Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Placement Drive</DialogTitle>
                            <DialogDescription>Create a new placement drive with eligibility criteria and skill requirements</DialogDescription>
                        </DialogHeader>
                        {renderFormFields()}
                        <DialogFooter className="gap-3">
                            <Button variant="outline" onClick={() => { resetForm(); setIsAddDialogOpen(false); }} disabled={isSubmitting}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                                {isSubmitting ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Creating...</>) : (<><Plus className="h-4 w-4" /> Create Drive</>)}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open: boolean) => { if (!open) resetForm(); setIsEditDialogOpen(open); }}>
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Placement Drive</DialogTitle>
                        <DialogDescription>Update the drive details, eligibility criteria, and skill requirements</DialogDescription>
                    </DialogHeader>
                    {renderFormFields()}
                    <DialogFooter className="gap-3">
                        <Button variant="outline" onClick={() => { resetForm(); setIsEditDialogOpen(false); }} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={isSubmitting} className="gap-2">
                            {isSubmitting ? (<><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>) : (<><CheckCircle className="h-4 w-4" /> Save Changes</>)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <motion.div variants={itemVariants}>
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {drives.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                    <p className="mt-4 text-muted-foreground">No placement drives yet. Click "Add Drive" to create one.</p>
                                </div>
                            ) : (
                                drives.map((drive: PlacementDrive) => (
                                    <div key={drive.id} className="flex items-center justify-between rounded-xl border-2 border-border/80 p-4 transition-colors hover:bg-accent/50">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-card-foreground">{drive.companyName}</p>
                                                <p className="text-sm text-muted-foreground">{drive.jobRole} • {drive.packageLPA ? `${drive.packageLPA} LPA` : 'Not disclosed'}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge variant={drive.statusKey === 'StatusKey1' ? 'default' : 'secondary'}>{PlacementDriveStatusKeyToLabel[drive.statusKey]}</Badge>
                                            <Button variant="outline" size="sm" onClick={() => openEditDialog(drive)}>Edit</Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
