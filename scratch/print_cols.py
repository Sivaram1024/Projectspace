import json

with open("c:/Users/s3378/Downloads/projectspcae/data-model/full-data-model.json", "r") as f:
    data = json.load(f)

for idx in [2, 3]:
    table = data["inMemoryTables"][idx]
    data_list = table.get("data", [])
    if data_list:
        print(f"\nTable {idx} columns:", list(data_list[0].keys()))
        print(f"Table {idx} sample record:", data_list[0])
