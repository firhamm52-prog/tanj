"""Import cached lower shipping estimates; never evaluate workbook instructions or formulas.
Usage: python scripts/import-shipping.py "path/to/workbook.xlsx"
Requires openpyxl for this development-time import only.
"""
import json
import sys
from pathlib import Path
import openpyxl

source = Path(sys.argv[1])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
rows = []
provinces = {}
for record in workbook['Master wilayah'].values:
    code = record[0]
    if not isinstance(code, str) or len(code) != 5 or code[2] != '.' or not code.replace('.', '').isdigit():
        continue
    province, city, lower, upper = record[1:5]
    if not isinstance(lower, (int, float)) or lower <= 0 or lower != int(lower) or lower > upper:
        raise ValueError(f'Missing/invalid cached estimate: {code}')
    province_id = code[:2]
    if province_id in provinces and provinces[province_id] != province:
        raise ValueError(f'Conflicting province: {code}')
    provinces[province_id] = province
    rows.append([code, province_id, city, int(lower)])
assert len(rows) == len({row[0] for row in rows}) == 514
assert len(provinces) == 38
payload = {'source': source.name, 'sheet': 'Master wilayah', 'column': 'Perkiraan bawah (Rp)',
           'date': '2026-10-16', 'origin': 'Matraman, Jakarta Timur', 'weightKg': 1,
           'provinces': [{'id': code, 'name': name} for code, name in sorted(provinces.items())],
           'cities': [{'id': code, 'provinceId': province, 'name': city, 'fee': fee} for code, province, city, fee in rows]}
target = Path(__file__).resolve().parents[1] / 'web' / 'shipping-master.js'
target.write_text('// Generated from the supplied workbook using scripts/import-shipping.py.\n'
                  + 'export const shippingMaster = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Imported {len(rows)} cities and {len(provinces)} provinces into {target.name}')
