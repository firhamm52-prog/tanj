"""Import cached lower shipping estimates; never evaluate workbook instructions or formulas.
Usage: python scripts/import-shipping.py "path/to/workbook.xlsx"
Requires openpyxl for this development-time import only.
"""
import json
import sys
import re
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
# Keep district/postcode files split by province so the checkout loads only the selected area.
city_index = {code: (province, city, fee) for code, province, city, fee in rows}
areas = {province: {} for province in provinces}
districts = {}
postcode_pairs = set()
for record in workbook['Kecamatan dan kode pos'].values:
    district_id = record[0]
    if not isinstance(district_id, str) or not re.fullmatch(r"[0-9]{2}\.[0-9]{2}\.[0-9]{2}", district_id):
        continue
    _, city_id, province_name, city_name, district_name, postcode, villages, lower = record[:8]
    if city_id not in city_index:
        raise ValueError(f'Unknown district parent: {district_id}')
    province_id, expected_city, expected_fee = city_index[city_id]
    if district_id[:5] != city_id or province_name != provinces[province_id] or city_name != expected_city or lower != expected_fee:
        raise ValueError(f'District parent or estimate mismatch: {district_id}')
    if not isinstance(postcode, str) or not re.fullmatch(r"[0-9]{5}", postcode):
        raise ValueError(f'Invalid postcode: {district_id} {postcode}')
    if (district_id, postcode) in postcode_pairs:
        raise ValueError(f'Duplicate district/postcode: {district_id} {postcode}')
    postcode_pairs.add((district_id, postcode))
    if district_id not in districts:
        district = {'id': district_id, 'name': district_name, 'postcodes': []}
        districts[district_id] = district
        areas[province_id].setdefault(city_id, []).append(district)
    elif districts[district_id]['name'] != district_name:
        raise ValueError(f'Conflicting district name: {district_id}')
    districts[district_id]['postcodes'].append({'code': postcode, 'villages': str(villages or '')})
assert len(districts) == 7285
assert len(postcode_pairs) == 11580
assert {city for province in areas.values() for city in province} == set(city_index)
payload['districtSheet'] = 'Kecamatan dan kode pos'
payload['districtCount'] = len(districts)
payload['postcodePairCount'] = len(postcode_pairs)
area_dir = Path(__file__).resolve().parents[1] / 'web' / 'shipping-areas'
area_dir.mkdir(exist_ok=True)
for province_id, cities in areas.items():
    (area_dir / (province_id + '.js')).write_text(
        '// Generated from the supplied workbook; postcode values remain strings.\n'
        + 'export const cities = ' + json.dumps(cities, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

target = Path(__file__).resolve().parents[1] / 'web' / 'shipping-master.js'
target.write_text('// Generated from the supplied workbook using scripts/import-shipping.py.\n'
                  + 'export const shippingMaster = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Imported {len(rows)} cities, {len(provinces)} provinces, {len(districts)} districts, {len(postcode_pairs)} district/postcode pairs')
