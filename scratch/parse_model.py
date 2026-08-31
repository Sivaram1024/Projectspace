import json

with open("c:/Users/s3378/Downloads/projectspcae/data-model/full-data-model.json", "r") as f:
    data = json.load(f)

for i, t in enumerate(data["inMemoryTables"]):
    print(f"\nTable {i}:")
    entity = t.get("entity", {})
    print("DisplayName:", entity.get("DisplayName", {}).get("LocalizedLabels", [{}])[0].get("Label"))
    print("SchemaName:", entity.get("SchemaName"))
    print("PrimaryIdAttribute:", entity.get("PrimaryIdAttribute"))
