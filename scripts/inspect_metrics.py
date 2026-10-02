import json

with open('ml/reports/benchmark_report_full.json', 'r') as f:
    d = json.load(f)

rf = d['all_results']['Model_B_78D']['Random_Forest']
print(f"Overall Accuracy: {rf['accuracy']:.4f}")
print(f"Overall Macro F1: {rf['macro_f1']:.4f}")

classes = ['S', 'T', 'M', 'N', 'K', 'Q', 'R', 'A', 'E', 'J', 'Z']
for c in classes:
    if c in rf['per_class']:
        m = rf['per_class'][c]
        print(f"{c}: Precision={m['precision']:.2f}, Recall={m['recall']:.2f}, F1={m['f1']:.2f}, Support={m['support']}")
