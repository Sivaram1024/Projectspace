import json
import os
import re

with open("c:/Users/s3378/Downloads/projectspcae/data-model/full-data-model.json", "r") as f:
    db = json.load(f)

models_dir = "c:/Users/s3378/Downloads/projectspcae/apps/placement-portal/src/generated/models"
model_files = os.listdir(models_dir)

# Read TS model files to find field names
model_fields = {}
for mf in model_files:
    if mf.endswith("-model.ts"):
        name = mf.replace("-model.ts", "")
        # convert kebab-case to PascalCase
        model_name = "".join(x.capitalize() for x in name.split("-"))
        with open(os.path.join(models_dir, mf), "r") as f:
            content = f.read()
        # Find interface definition
        match = re.search(r"interface\s+(\w+)\s*\{(.*?)\}", content, re.DOTALL)
        if match:
            intf_name = match.group(1)
            fields = []
            for line in match.group(2).split("\n"):
                line = line.strip()
                if line and not line.startswith("/*") and not line.startswith("*") and not line.startswith("//"):
                    fmatch = re.match(r"^(\w+)\??\s*:", line)
                    if fmatch:
                        fields.append(fmatch.group(1))
            model_fields[intf_name] = fields

print("TS Models and their fields:")
for m, f in model_fields.items():
    print(m, f)

# Now map tables in full-data-model.json
table_mappings = {}
display_to_ts = {
    "Student": "Student",
    "Skill": "Skill",
    "Student Skill": "StudentSkill",
    "Placement Drive": "PlacementDrive",
    "Drive Requirement": "DriveRequirement",
    "Eligibility Criteria": "EligibilityCriteria",
    "Notification": "Notification",
    "Drive Application": "DriveApplication"
}

for i, table in enumerate(db["inMemoryTables"]):
    entity = table.get("entity", {})
    disp = entity.get("DisplayName", {}).get("LocalizedLabels", [{}])[0].get("Label")
    ts_name = display_to_ts.get(disp)
    if not ts_name:
        continue
    
    data_list = table.get("data", [])
    if not data_list:
        continue
        
    db_keys = list(data_list[0].keys())
    ts_fields = model_fields.get(ts_name, [])
    
    # Try to map
    mapping = {}
    print(f"\n--- Mapping for {ts_name} ---")
    for db_key in db_keys:
        # Match by prefix-less lowercase name
        clean_db_key = db_key.replace("cr69a_", "").replace("@odata.bind", "").lower()
        matched = False
        for ts_field in ts_fields:
            clean_ts = ts_field.replace("Key", "").lower()
            if clean_db_key == clean_ts or clean_db_key + "1" == clean_ts or clean_db_key == clean_ts + "name":
                mapping[db_key] = ts_field
                matched = True
                break
        if not matched:
            # check default mappings
            if "id" in db_key:
                mapping[db_key] = "id"
            elif db_key == "cr69a_name":
                # find closest
                for ts_field in ts_fields:
                    if "name" in ts_field.lower():
                        mapping[db_key] = ts_field
                        break
        print(f"  {db_key} -> {mapping.get(db_key, 'UNKNOWN')}")
