with open("c:/Users/s3378/Downloads/projectspcae/apps/placement-portal/src/app.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "StudentDashboard" in line:
        print(f"Line {i+1}: {line.strip()}")
