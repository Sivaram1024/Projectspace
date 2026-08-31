import json

with open("c:/Users/s3378/Downloads/projectspcae/data-model/full-data-model.json", "r") as f:
    data = json.load(f)

table = data["inMemoryTables"][0]
entity = table.get("entity", {})
attributes = entity.get("Attributes", [])

print("Number of attributes:", len(attributes))
for attr in attributes[:10]:
    print(attr.get("LogicalName"), "->", attr.get("SchemaName"), "->", attr.get("DisplayName", {}).get("LocalizedLabels", [{}])[0].get("Label"))
