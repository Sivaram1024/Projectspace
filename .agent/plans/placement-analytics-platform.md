# Placement & Skill Gap Analytics Platform

A college placement management platform with personalized student dashboards, skill gap analysis, and comprehensive admin tools for placement drive management.

## Overview

**Problem**: Students lack visibility into their placement readiness and skill gaps relative to job requirements. Placement admins need efficient tools to manage drives, track eligibility, and analyze placement trends.

**Solution**: A role-based platform where students see personalized readiness scores, skill recommendations, and upcoming opportunities — while admins manage the entire placement lifecycle with full analytics.

## User Roles

### Student
- View personalized Placement Readiness Score (0-100)
- Manage profile: department, year, CGPA, skills with proficiency levels
- See upcoming placement drives with eligibility status
- Receive skill gap analysis and improvement recommendations
- Get notified about new drives, eligibility changes, deadlines

### Placement Admin
- Create and manage placement drives (company, roles, requirements)
- Define eligibility criteria per drive
- View all student profiles and readiness metrics
- Access analytics dashboard (placement trends, skill distributions, eligibility rates)
- Send notifications to students

## Key Features

### Student Portal
1. **Dashboard** — Readiness score gauge, eligibility summary, skill gap highlights, notifications feed
2. **Profile Management** — Edit personal info, add/update skills with proficiency (beginner/intermediate/advanced)
3. **Placement Drives** — Browse drives, see eligibility status, view required vs. possessed skills
4. **Skill Gap Analysis** — Visual comparison of current skills vs. market demand, personalized recommendations

### Admin Portal
1. **Dashboard** — Aggregate metrics (total students, avg readiness, upcoming drives, eligibility rates)
2. **Drive Management** — CRUD for placement drives, define required skills and criteria
3. **Student Directory** — Search/filter students, view individual profiles and readiness
4. **Analytics** — Charts for skill distribution, department-wise readiness, placement trends
5. **Notifications** — Broadcast announcements to eligible students

## Authentication

- Microsoft Entra ID (SSO) with college Microsoft accounts
- Role detection based on user group membership or email domain pattern
- Secure, production-ready authentication

## Data Model (Dataverse)

### Entities
- **Student** — roll number, name, department, year, CGPA, readiness score
- **Skill** — skill name, category (programming/tools/soft skills)
- **StudentSkill** — links student to skill with proficiency level
- **PlacementDrive** — company, job role, date, description, status
- **DriveRequirement** — links drive to required skills with minimum proficiency
- **EligibilityCriteria** — min CGPA, allowed departments, year requirements per drive
- **Notification** — title, message, target audience, timestamp

## Readiness Score Algorithm

Rule-based calculation considering:
- Skill coverage: % of in-demand skills possessed
- Proficiency weighting: advanced (1.0), intermediate (0.7), beginner (0.4)
- Academic factor: CGPA normalized contribution
- Market alignment: bonus for trending skills

Transparent breakdown shown to students.

## Design Direction

**Aesthetic**: Professional, data-forward, trustworthy — like a career platform that takes students seriously. Clean dashboard layouts with prominent data visualizations.

**Palette**: Deep navy primary, teal accents for positive states (eligible, improving), warm amber for warnings (skill gaps), crisp whites for content areas.

**Typography**: Modern sans-serif with clear hierarchy — bold metrics, readable body text.

**Key Visual Elements**:
- Circular progress gauge for readiness score
- Skill cards with proficiency bars
- Timeline view for upcoming drives
- Comparison charts for skill gaps

## Pages

1. **Login** — Entra ID SSO entry point
2. **Student Dashboard** — Readiness score, quick stats, notifications
3. **Student Profile** — Edit personal info and skills
4. **Placement Drives (Student)** — Browse with eligibility filters
5. **Skill Analysis** — Gap analysis and recommendations
6. **Admin Dashboard** — Aggregate metrics and charts
7. **Drive Management** — Admin CRUD for drives
8. **Student Directory** — Admin view of all students
9. **Admin Settings** — Notification management, criteria templates
