import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Upload, FileSearch, Zap, FileText, Target, Eye, Code, CheckCircle, AlertTriangle, Lightbulb, Sparkles, Star, CircleCheck, CircleX, Cpu, Loader2
} from 'lucide-react';
import type { Student } from '@/generated/models/student-model';
import type { PlacementDrive } from '@/generated/models/placement-drive-model';
import { useAuth } from '@/context/auth-context';
import { analyzeResumeWithBackend, getLatestResumeAnalysis } from '@/lib/resume-analysis-service';
import { uploadResumeToSupabase, validateResumeFile } from '@/lib/resume-storage-service';
import { extractTextFromFile } from '@/lib/resume-parser-service';


const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

// Job role requirements database for matching
const JOB_ROLE_REQUIREMENTS: Record<string, { title: string; requiredSkills: { name: string; weight: number; category: string }[]; description: string }> = {
    'frontend-developer': {
        title: 'Frontend Developer',
        description: 'Build user interfaces using modern web technologies',
        requiredSkills: [
            { name: 'JavaScript', weight: 15, category: 'Programming' },
            { name: 'React', weight: 20, category: 'Framework' },
            { name: 'TypeScript', weight: 15, category: 'Programming' },
            { name: 'HTML', weight: 10, category: 'Web' },
            { name: 'CSS', weight: 10, category: 'Web' },
            { name: 'Tailwind CSS', weight: 8, category: 'Framework' },
            { name: 'Git', weight: 7, category: 'Tools' },
            { name: 'REST API', weight: 8, category: 'Integration' },
            { name: 'Problem Solving', weight: 7, category: 'Soft Skills' },
        ],
    },
    'backend-developer': {
        title: 'Backend Developer',
        description: 'Design and implement server-side applications and APIs',
        requiredSkills: [
            { name: 'Node.js', weight: 18, category: 'Runtime' },
            { name: 'Python', weight: 15, category: 'Programming' },
            { name: 'SQL', weight: 15, category: 'Database' },
            { name: 'MongoDB', weight: 10, category: 'Database' },
            { name: 'REST API', weight: 12, category: 'Integration' },
            { name: 'Docker', weight: 8, category: 'DevOps' },
            { name: 'Git', weight: 7, category: 'Tools' },
            { name: 'Problem Solving', weight: 8, category: 'Soft Skills' },
            { name: 'System Design', weight: 7, category: 'Architecture' },
        ],
    },
    'fullstack-developer': {
        title: 'Full Stack Developer',
        description: 'End-to-end development of web applications',
        requiredSkills: [
            { name: 'JavaScript', weight: 12, category: 'Programming' },
            { name: 'React', weight: 12, category: 'Framework' },
            { name: 'Node.js', weight: 12, category: 'Runtime' },
            { name: 'SQL', weight: 10, category: 'Database' },
            { name: 'MongoDB', weight: 8, category: 'Database' },
            { name: 'TypeScript', weight: 10, category: 'Programming' },
            { name: 'REST API', weight: 10, category: 'Integration' },
            { name: 'Git', weight: 6, category: 'Tools' },
            { name: 'Docker', weight: 6, category: 'DevOps' },
            { name: 'AWS', weight: 7, category: 'Cloud' },
            { name: 'Problem Solving', weight: 7, category: 'Soft Skills' },
        ],
    },
    'data-scientist': {
        title: 'Data Scientist',
        description: 'Analyze data and build ML models for business insights',
        requiredSkills: [
            { name: 'Python', weight: 20, category: 'Programming' },
            { name: 'Machine Learning', weight: 18, category: 'AI/ML' },
            { name: 'SQL', weight: 12, category: 'Database' },
            { name: 'TensorFlow', weight: 10, category: 'AI/ML' },
            { name: 'PyTorch', weight: 8, category: 'AI/ML' },
            { name: 'Statistics', weight: 12, category: 'Math' },
            { name: 'Data Visualization', weight: 8, category: 'Analytics' },
            { name: 'Pandas', weight: 7, category: 'Data' },
            { name: 'Problem Solving', weight: 5, category: 'Soft Skills' },
        ],
    },
    'devops-engineer': {
        title: 'DevOps Engineer',
        description: 'Automate infrastructure and deployment pipelines',
        requiredSkills: [
            { name: 'Docker', weight: 18, category: 'Container' },
            { name: 'Kubernetes', weight: 15, category: 'Orchestration' },
            { name: 'AWS', weight: 15, category: 'Cloud' },
            { name: 'Linux', weight: 12, category: 'OS' },
            { name: 'CI/CD', weight: 12, category: 'Automation' },
            { name: 'Git', weight: 8, category: 'Tools' },
            { name: 'Python', weight: 8, category: 'Programming' },
            { name: 'Terraform', weight: 7, category: 'IaC' },
            { name: 'Problem Solving', weight: 5, category: 'Soft Skills' },
        ],
    },
    'mobile-developer': {
        title: 'Mobile Developer',
        description: 'Build native and cross-platform mobile applications',
        requiredSkills: [
            { name: 'React Native', weight: 18, category: 'Framework' },
            { name: 'JavaScript', weight: 15, category: 'Programming' },
            { name: 'TypeScript', weight: 12, category: 'Programming' },
            { name: 'Swift', weight: 10, category: 'iOS' },
            { name: 'Kotlin', weight: 10, category: 'Android' },
            { name: 'REST API', weight: 10, category: 'Integration' },
            { name: 'Git', weight: 8, category: 'Tools' },
            { name: 'UI/UX', weight: 10, category: 'Design' },
            { name: 'Problem Solving', weight: 7, category: 'Soft Skills' },
        ],
    },
};

// Skill extraction patterns for resume analysis
const SKILL_PATTERNS: { pattern: RegExp; skill: string; category: string }[] = [
    // Programming Languages
    { pattern: /\b(javascript|js|es6|es2015)\b/gi, skill: 'JavaScript', category: 'Programming' },
    { pattern: /\b(typescript|ts)\b/gi, skill: 'TypeScript', category: 'Programming' },
    { pattern: /\b(python|py)\b/gi, skill: 'Python', category: 'Programming' },
    { pattern: /\b(java)\b/gi, skill: 'Java', category: 'Programming' },
    { pattern: /\b(c\+\+|cpp)\b/gi, skill: 'C++', category: 'Programming' },
    { pattern: /\b(c#|csharp)\b/gi, skill: 'C#', category: 'Programming' },
    { pattern: /\b(go|golang)\b/gi, skill: 'Go', category: 'Programming' },
    { pattern: /\b(rust)\b/gi, skill: 'Rust', category: 'Programming' },
    { pattern: /\b(swift)\b/gi, skill: 'Swift', category: 'iOS' },
    { pattern: /\b(kotlin)\b/gi, skill: 'Kotlin', category: 'Android' },
    { pattern: /\b(php)\b/gi, skill: 'PHP', category: 'Programming' },
    { pattern: /\b(ruby)\b/gi, skill: 'Ruby', category: 'Programming' },
    { pattern: /\b(scala)\b/gi, skill: 'Scala', category: 'Programming' },
    // Web Technologies
    { pattern: /\b(html5?|html)\b/gi, skill: 'HTML', category: 'Web' },
    { pattern: /\b(css3?|css)\b/gi, skill: 'CSS', category: 'Web' },
    { pattern: /\b(sass|scss)\b/gi, skill: 'SASS', category: 'Web' },
    // Frameworks
    { pattern: /\b(react\.?js|reactjs|react)\b/gi, skill: 'React', category: 'Framework' },
    { pattern: /\b(angular\.?js|angularjs|angular)\b/gi, skill: 'Angular', category: 'Framework' },
    { pattern: /\b(vue\.?js|vuejs|vue)\b/gi, skill: 'Vue.js', category: 'Framework' },
    { pattern: /\b(next\.?js|nextjs)\b/gi, skill: 'Next.js', category: 'Framework' },
    { pattern: /\b(node\.?js|nodejs)\b/gi, skill: 'Node.js', category: 'Runtime' },
    { pattern: /\b(express\.?js|expressjs|express)\b/gi, skill: 'Express.js', category: 'Framework' },
    { pattern: /\b(django)\b/gi, skill: 'Django', category: 'Framework' },
    { pattern: /\b(flask)\b/gi, skill: 'Flask', category: 'Framework' },
    { pattern: /\b(spring\s*boot|springboot)\b/gi, skill: 'Spring Boot', category: 'Framework' },
    { pattern: /\b(react\s*native)\b/gi, skill: 'React Native', category: 'Framework' },
    { pattern: /\b(flutter)\b/gi, skill: 'Flutter', category: 'Framework' },
    { pattern: /\b(tailwind\s*css|tailwindcss|tailwind)\b/gi, skill: 'Tailwind CSS', category: 'Framework' },
    { pattern: /\b(bootstrap)\b/gi, skill: 'Bootstrap', category: 'Framework' },
    // Databases
    { pattern: /\b(sql|mysql|postgresql|postgres|sqlite)\b/gi, skill: 'SQL', category: 'Database' },
    { pattern: /\b(mongodb|mongo)\b/gi, skill: 'MongoDB', category: 'Database' },
    { pattern: /\b(redis)\b/gi, skill: 'Redis', category: 'Database' },
    { pattern: /\b(firebase)\b/gi, skill: 'Firebase', category: 'Database' },
    { pattern: /\b(dynamodb)\b/gi, skill: 'DynamoDB', category: 'Database' },
    // Cloud & DevOps
    { pattern: /\b(aws|amazon\s*web\s*services)\b/gi, skill: 'AWS', category: 'Cloud' },
    { pattern: /\b(azure|microsoft\s*azure)\b/gi, skill: 'Azure', category: 'Cloud' },
    { pattern: /\b(gcp|google\s*cloud)\b/gi, skill: 'GCP', category: 'Cloud' },
    { pattern: /\b(docker)\b/gi, skill: 'Docker', category: 'DevOps' },
    { pattern: /\b(kubernetes|k8s)\b/gi, skill: 'Kubernetes', category: 'Orchestration' },
    { pattern: /\b(jenkins)\b/gi, skill: 'Jenkins', category: 'CI/CD' },
    { pattern: /\b(ci\/cd|cicd|continuous\s*integration)\b/gi, skill: 'CI/CD', category: 'Automation' },
    { pattern: /\b(terraform)\b/gi, skill: 'Terraform', category: 'IaC' },
    { pattern: /\b(ansible)\b/gi, skill: 'Ansible', category: 'IaC' },
    { pattern: /\b(linux|unix)\b/gi, skill: 'Linux', category: 'OS' },
    // Tools
    { pattern: /\b(git|github|gitlab|bitbucket)\b/gi, skill: 'Git', category: 'Tools' },
    { pattern: /\b(jira)\b/gi, skill: 'Jira', category: 'Tools' },
    { pattern: /\b(figma)\b/gi, skill: 'Figma', category: 'Design' },
    { pattern: /\b(vs\s*code|vscode)\b/gi, skill: 'VS Code', category: 'Tools' },
    // AI/ML
    { pattern: /\b(machine\s*learning|ml)\b/gi, skill: 'Machine Learning', category: 'AI/ML' },
    { pattern: /\b(deep\s*learning|dl)\b/gi, skill: 'Deep Learning', category: 'AI/ML' },
    { pattern: /\b(tensorflow|tf)\b/gi, skill: 'TensorFlow', category: 'AI/ML' },
    { pattern: /\b(pytorch)\b/gi, skill: 'PyTorch', category: 'AI/ML' },
    { pattern: /\b(nlp|natural\s*language\s*processing)\b/gi, skill: 'NLP', category: 'AI/ML' },
    { pattern: /\b(computer\s*vision)\b/gi, skill: 'Computer Vision', category: 'AI/ML' },
    { pattern: /\b(pandas)\b/gi, skill: 'Pandas', category: 'Data' },
    { pattern: /\b(numpy)\b/gi, skill: 'NumPy', category: 'Data' },
    { pattern: /\b(scikit-?learn|sklearn)\b/gi, skill: 'Scikit-learn', category: 'AI/ML' },
    // APIs
    { pattern: /\b(rest\s*api|restful|rest)\b/gi, skill: 'REST API', category: 'Integration' },
    { pattern: /\b(graphql)\b/gi, skill: 'GraphQL', category: 'Integration' },
    // Soft Skills (from context clues)
    { pattern: /\b(problem[\s-]?solving|troubleshoot|debug)\b/gi, skill: 'Problem Solving', category: 'Soft Skills' },
    { pattern: /\b(team\s*work|collaboration|collaborated)\b/gi, skill: 'Teamwork', category: 'Soft Skills' },
    { pattern: /\b(communication|communicated|present)\b/gi, skill: 'Communication', category: 'Soft Skills' },
    { pattern: /\b(leadership|led|managed\s*team)\b/gi, skill: 'Leadership', category: 'Soft Skills' },
    { pattern: /\b(agile|scrum|kanban)\b/gi, skill: 'Agile', category: 'Methodology' },
    // Other
    { pattern: /\b(statistics|statistical)\b/gi, skill: 'Statistics', category: 'Math' },
    { pattern: /\b(data\s*visualization|d3\.?js|tableau|power\s*bi)\b/gi, skill: 'Data Visualization', category: 'Analytics' },
    { pattern: /\b(ui\/ux|ui\s*design|ux\s*design|user\s*experience)\b/gi, skill: 'UI/UX', category: 'Design' },
    { pattern: /\b(system\s*design|architecture)\b/gi, skill: 'System Design', category: 'Architecture' },
];

interface AnalysisResult {
    extractedSkills: { name: string; category: string; found: boolean }[];
    matchedSkills: { name: string; weight: number; category: string; matched: boolean }[];
    readinessScore: number;
    missingSkills: { name: string; weight: number; category: string; priority: 'high' | 'medium' | 'low' }[];
    improvements: string[];
}

export function StudentResumeAnalyzer({ student, drives, onScoreCalculated }: { student: Student | undefined; drives: PlacementDrive[]; onScoreCalculated?: (score: number, fileName: string, targetRole: string) => void }) {
    const { user } = useAuth();
    const [resumeText, setResumeText] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedStoragePath, setUploadedStoragePath] = useState('');
    const [uploadedResumeId, setUploadedResumeId] = useState<string>('');

    // Fetch existing completed analysis record when role or user changes
    useEffect(() => {
        if (!selectedRole || !user?.id) {
            setAnalysisResult(null);
            return;
        }

        const roleReqs = JOB_ROLE_REQUIREMENTS[selectedRole];
        const targetRoleTitle = roleReqs ? roleReqs.title : selectedRole;

        let isMounted = true;
        getLatestResumeAnalysis(user.id, targetRoleTitle).then(({ record }) => {
            if (!isMounted) return;
            if (record && record.status === 'completed') {
                const extracted = (record.skills || []).map((s) => ({ name: s, category: 'Technical', found: true }));
                const reqs = roleReqs?.requiredSkills || [];
                const extractedSet = new Set((record.skills || []).map((s) => s.toLowerCase()));

                const matchedSkills = reqs.map((req) => ({
                    ...req,
                    matched: extractedSet.has(req.name.toLowerCase()) || (record.skills || []).some((s) => s.toLowerCase().includes(req.name.toLowerCase())),
                }));

                const missingSkills = (record.missing_skills || []).map((ms) => ({
                    name: ms,
                    weight: 12,
                    category: 'Skill Gap',
                    priority: 'high' as const,
                }));

                setAnalysisResult({
                    extractedSkills: extracted,
                    matchedSkills,
                    readinessScore: record.score,
                    missingSkills,
                    improvements: (record.recommendations && record.recommendations.length > 0)
                        ? record.recommendations
                        : (record.strengths || ['Resume analysis stored successfully.']),
                });
            } else {
                setAnalysisResult(null);
            }
        });

        return () => { isMounted = false; };
    }, [selectedRole, user?.id]);

    // Handle file upload to Supabase Storage & Database + Text Extraction
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Validate file (10MB limit, PDF/DOC/DOCX/TXT)
        const validation = validateResumeFile(file);
        if (!validation.valid) {
            toast.error(validation.error || 'Invalid file');
            return;
        }

        setFileName(file.name);
        setIsUploading(true);

        try {
            if (user) {
                const roleReqs = JOB_ROLE_REQUIREMENTS[selectedRole];
                const targetRoleTitle = roleReqs ? roleReqs.title : (selectedRole || 'Software Engineer');

                const record = await uploadResumeToSupabase(user, file, targetRoleTitle, student?.id);
                setUploadedStoragePath(record.storage_path);
                if (record.id) {
                    setUploadedResumeId(record.id);
                }
                toast.success('Resume uploaded successfully to Supabase Storage!');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to upload resume file.');
        } finally {
            setIsUploading(false);
        }

        // 2. Real text extraction from document
        try {
            const extractedText = await extractTextFromFile(file);
            setResumeText(extractedText);
            setAnalysisResult(null);
        } catch (err: any) {
            toast.error('Failed to extract textual content from resume file.');
        }
    };

    // Analyze resume using secure backend LLM service & Supabase Edge Function
    const analyzeResume = async () => {
        if (!uploadedResumeId) {
            toast.error('Please upload your resume before analysis.');
            return;
        }

        if (!resumeText || !selectedRole) {
            toast.error('Please upload a resume and select a target role');
            return;
        }

        const roleReqs = JOB_ROLE_REQUIREMENTS[selectedRole];
        const targetRoleTitle = roleReqs ? roleReqs.title : selectedRole;

        setIsAnalyzing(true);

        try {
            if (!user) {
                toast.error('User authentication session required.');
                setIsAnalyzing(false);
                return;
            }

            const record = await analyzeResumeWithBackend({
                userId: user.id,
                studentId: student?.id,
                resumeId: uploadedResumeId,
                storagePath: uploadedStoragePath,
                resumeText,
                targetRole: targetRoleTitle,
                fileName: fileName || 'Resume.pdf',
            });

            const extracted = (record.skills || []).map((s) => ({ name: s, category: 'Technical', found: true }));
            const reqs = roleReqs?.requiredSkills || [];
            const extractedSet = new Set((record.skills || []).map((s) => s.toLowerCase()));

            const matchedSkills = reqs.map((req) => ({
                ...req,
                matched: extractedSet.has(req.name.toLowerCase()) || (record.skills || []).some((s) => s.toLowerCase().includes(req.name.toLowerCase())),
            }));

            const missingSkills = (record.missing_skills || []).map((ms) => ({
                name: ms,
                weight: 12,
                category: 'Skill Gap',
                priority: 'high' as const,
            }));

            setAnalysisResult({
                extractedSkills: extracted,
                matchedSkills,
                readinessScore: record.score,
                missingSkills,
                improvements: (record.recommendations && record.recommendations.length > 0)
                    ? record.recommendations
                    : (record.strengths || ['Resume analysis completed.']),
            });

            if (onScoreCalculated && fileName) {
                onScoreCalculated(record.score, fileName, targetRoleTitle);
            }

            toast.success('Analysis Complete!');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to complete resume analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-primary';
        if (score >= 60) return 'text-accent-foreground';
        if (score >= 40) return 'text-secondary-foreground';
        return 'text-destructive';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-primary/10';
        if (score >= 60) return 'bg-accent/10';
        if (score >= 40) return 'bg-secondary/50';
        return 'bg-destructive/10';
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-destructive text-destructive-foreground';
            case 'medium': return 'bg-accent text-accent-foreground';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={itemVariants}>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Resume Analyzer</h1>
                        <p className="mt-1 text-muted-foreground">Upload your resume and get personalized skill gap analysis for your target role</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Cpu className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">AI-Powered Analysis</span>
                    </div>
                </div>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Upload & Configuration */}
                <motion.div variants={itemVariants} className="space-y-6">
                    {/* Resume Upload */}
                    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-card to-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" />Upload Resume</CardTitle>
                            <CardDescription>Upload your resume in PDF or Word (.docx, .doc) format</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="resume-upload"
                                />
                                {isUploading ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="mt-2 text-sm font-medium text-muted-foreground">Uploading resume to Supabase Storage...</p>
                                    </div>
                                ) : (
                                    <label htmlFor="resume-upload" className="cursor-pointer text-center">
                                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <p className="mt-3 text-sm font-medium text-foreground">Click to upload your resume</p>
                                        <p className="mt-1 text-xs text-muted-foreground">PDF or Word (.docx, .doc) files supported (max 10MB)</p>
                                    </label>
                                )}
                            </div>
                            {fileName && (
                                <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium text-foreground truncate max-w-[220px]">{fileName}</span>
                                    <Badge variant="outline" className="ml-auto text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 shrink-0">
                                        <CheckCircle className="h-3 w-3" />
                                        {uploadedStoragePath ? 'Uploaded to Storage' : 'Ready'}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Role Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Select Target Role</CardTitle>
                            <CardDescription>Choose the role you're applying for</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a job role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(JOB_ROLE_REQUIREMENTS).map(([key, role]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex flex-col">
                                                <span>{role.title}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedRole && (
                                <div className="rounded-lg bg-muted/50 p-4">
                                    <p className="text-sm text-muted-foreground">{JOB_ROLE_REQUIREMENTS[selectedRole]?.description}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {JOB_ROLE_REQUIREMENTS[selectedRole]?.requiredSkills.slice(0, 5).map((skill: { name: string; weight: number; category: string }) => (
                                            <Badge key={skill.name} variant="secondary" className="text-xs">{skill.name}</Badge>
                                        ))}
                                        {(JOB_ROLE_REQUIREMENTS[selectedRole]?.requiredSkills.length || 0) > 5 && (
                                            <Badge variant="outline" className="text-xs">+{(JOB_ROLE_REQUIREMENTS[selectedRole]?.requiredSkills.length || 0) - 5} more</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                            <Button
                                onClick={analyzeResume}
                                disabled={!resumeText || !selectedRole || isAnalyzing}
                                className="w-full gap-2 shadow-lg shadow-primary/20"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                            <Zap className="h-4 w-4" />
                                        </motion.div>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <FileSearch className="h-4 w-4" />
                                        Analyze Resume
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Resume Text Preview */}
                    {resumeText && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />Resume Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/30 p-4">
                                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{resumeText.substring(0, 2000)}{resumeText.length > 2000 && '...'}</pre>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>

                {/* Analysis Results */}
                <motion.div variants={itemVariants} className="space-y-6">
                    {analysisResult ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: 'easeOut' as const }}
                                className="space-y-6"
                            >
                                {/* Readiness Score */}
                                <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
                                    <CardContent className="p-8">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-primary" />
                                                <h3 className="font-display text-lg font-semibold text-card-foreground">Role Readiness Score</h3>
                                            </div>
                                            <div className="mt-6">
                                                <div className={cn('inline-flex h-32 w-32 items-center justify-center rounded-full', getScoreBg(analysisResult.readinessScore))}>
                                                    <span className={cn('font-display text-5xl font-bold', getScoreColor(analysisResult.readinessScore))}>
                                                        {analysisResult.readinessScore}
                                                    </span>
                                                </div>
                                            </div>
                                            <Progress value={analysisResult.readinessScore} className="mt-6 h-3 w-full" />
                                            <p className="mt-4 text-sm text-muted-foreground">
                                                Your resume matches <span className="font-semibold text-foreground">{analysisResult.readinessScore}%</span> of {JOB_ROLE_REQUIREMENTS[selectedRole]?.title} requirements
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Extracted Skills */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" />Extracted Skills</CardTitle>
                                        <CardDescription>{analysisResult.extractedSkills.length} skills found in your resume</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {analysisResult.extractedSkills.map((skill: { name: string; category: string; found: boolean }) => (
                                                <Badge key={skill.name} className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
                                                    <CircleCheck className="h-3 w-3" />
                                                    {skill.name}
                                                </Badge>
                                            ))}
                                            {analysisResult.extractedSkills.length === 0 && (
                                                <p className="text-sm text-muted-foreground">No skills detected. Try uploading a more detailed resume.</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Skills to Develop */}
                                {analysisResult.missingSkills.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-accent-foreground" />Skills to Develop</CardTitle>
                                            <CardDescription>Focus on these skills to improve your match score</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {analysisResult.missingSkills.map((skill: { name: string; weight: number; category: string; priority: string }) => (
                                                    <div key={skill.name} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                                                        <div className="flex items-center gap-3">
                                                            <Star className="h-4 w-4 text-accent-foreground" />
                                                            <span className="text-sm font-medium text-foreground">{skill.name}</span>
                                                        </div>
                                                        <Badge className={getPriorityColor(skill.priority)}>{skill.priority} priority</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Improvement Suggestions */}
                                <Card className="border-2 border-accent/30 bg-gradient-to-br from-card to-accent/5">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent-foreground" />Improvement Suggestions</CardTitle>
                                        <CardDescription>Actionable steps to boost your readiness score</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {analysisResult.improvements.map((improvement: string, index: number) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                                                        <span className="text-xs font-bold">{index + 1}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground">{improvement}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                {/* Skill Match Analysis */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Skill Match Analysis</CardTitle>
                                        <CardDescription>How your skills match the role requirements</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {analysisResult.matchedSkills.map((skill: { name: string; weight: number; category: string; matched: boolean }) => (
                                                <div key={skill.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                                                    <div className="flex items-center gap-3">
                                                        {skill.matched ? (
                                                            <CircleCheck className="h-5 w-5 text-primary" />
                                                        ) : (
                                                            <CircleX className="h-5 w-5 text-destructive" />
                                                        )}
                                                        <div>
                                                            <p className={cn('text-sm font-medium', skill.matched ? 'text-foreground' : 'text-muted-foreground')}>{skill.name}</p>
                                                            <p className="text-xs text-muted-foreground">{skill.category}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Weight: {skill.weight}%</span>
                                                        <Badge variant={skill.matched ? 'default' : 'secondary'} className={skill.matched ? '' : 'bg-muted text-muted-foreground'}>
                                                            {skill.matched ? 'Matched' : 'Missing'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <Card className="flex min-h-[400px] flex-col items-center justify-center border-2 border-dashed border-border bg-muted/20">
                            <FileSearch className="h-16 w-16 text-muted-foreground/50" />
                            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">No Analysis Yet</h3>
                            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
                                Upload your resume and select a target role, then click "Analyze Resume" to get your personalized skill gap analysis.
                            </p>
                        </Card>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}
