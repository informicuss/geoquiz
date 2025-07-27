#!/usr/bin/env python3
"""
fill_geometry.py

Заполняет поле geometry в GeoJSON-файлах по name_en,
просматривая все нужные shapefiles, включая ne_50m_geography_regions_polys.shp.
"""

import os
import json

from shapely.geometry import shape
from shapely.geometry import mapping
from shapely.ops import unary_union

from osgeo import ogr

# Путь к папке со shapefiles и GeoJSON-файлами
SHAPES_DIR = r"D:\!!! NIikita\ФТЛ Капицы\Проект 2025-2026\geoquiz_app\data"

# Все shapefiles, в которых могут быть наши объекты
SHAPEFILES = [
    "ne_10m_rivers_lake_centerlines.shp",
    "ne_10m_lakes.shp",
    "ne_10m_geography_marine_polys.shp",
    "ne_50m_geography_regions_polys.shp",
    "ne_50m_admin_1_states_provinces.shp",
    "GMBA_Inventory_v2.0_standard_300.shp",
    "ne_10m_geography_regions_polys.shp"
 ]

# Входные GeoJSON-файлы (с уже заполненным name_en)
INPUT_FILES = [
    "ancient_discoveries_with_name_en.geojson",
    "medieval_discoveries_with_name_en.geojson",
    "research_internal_continents_with_name_en.geojson",
    "russian_explorers_with_name_en.geojson"
]

# Поля, где может лежать название объекта в shapefiles
NAME_FIELDS = [
    "NAME_EN", "Name_EN",   # главное — теперь учитываем этот
    "NAME", "Name", "name",
    "NAME_LONG",
    "GEONAME",
    "CONTINENT",
    "SUBREGION",
]

def build_geometry_index():
    from collections import defaultdict

    raw_geometries = defaultdict(list)

    for shp in SHAPEFILES:
        shp_path = os.path.join(SHAPES_DIR, shp)
        if not os.path.exists(shp_path):
            print(f"[Warning] Shapefile not found: {shp_path}")
            continue
        ds = ogr.Open(shp_path)
        if ds is None:
            print(f"[Error] Cannot open shapefile: {shp_path}")
            continue
        layer = ds.GetLayer(0)
        for feat in layer:
            props = feat.items()
            name_en = None
            for fld in ["NAME_EN", "Name_EN", "name_en",  "NAME", "Name", "name", "NAME_LONG", "GEONAME"]:
                if fld in props and props[fld]:
                    name_en = props[fld].strip()
                    break
            if not name_en:
                continue
            geom = feat.GetGeometryRef()
            if not geom:
                continue
            key = name_en.lower()
            raw_geometries[key].append(geom.Clone())
        ds = None

    geom_index = {}
    for name, geoms in raw_geometries.items():
        notPoints = []
        # polys = []
        points = []

        for g in geoms:
            t = g.GetGeometryType()
            if t in (ogr.wkbLineString, ogr.wkbMultiLineString) or t in (ogr.wkbPolygon, ogr.wkbMultiPolygon):
                notPoints.append(g)
            # elif t in (ogr.wkbPolygon, ogr.wkbMultiPolygon):
            #     polys.append(g)
            elif t == ogr.wkbPoint:
                points.append(g)

        chosen = None
        if notPoints:
            chosen = notPoints[0].Clone()
            for g in notPoints[1:]:
                chosen = chosen.Union(g)
        # elif polys:
        #     chosen = polys[0].Clone()
        #     for g in polys[1:]:
        #         chosen = chosen.Union(g)
        elif points:
            chosen = points[0].Clone()

        if chosen:
            geojson_geom = json.loads(chosen.ExportToJson())
            geom_index[name] = geojson_geom

    return geom_index


# def build_geometry_index():
#     from collections import defaultdict

#     # Индекс: ключ = name_en (lower), значение = список геометрий
#     geom_by_name_en = defaultdict(list)

#     for shp in SHAPEFILES:
#         shp_path = os.path.join(SHAPES_DIR, shp)
#         if not os.path.exists(shp_path):
#             print(f"[Warning] Shapefile not found: {shp_path}")
#             continue
#         ds = ogr.Open(shp_path)
#         if ds is None:
#             print(f"[Error] Cannot open shapefile: {shp_path}")
#             continue
#         layer = ds.GetLayer(0)
#         for feat in layer:
#             props = feat.items()
#             name_en = None
#             # Ищем приоритетно поля, похожие на name_en
#             for fld in ["NAME_EN", "Name_EN", "name_en", "NAME", "Name", "name", "NAME_LONG", "GEONAME"]:
#                 if fld in props and props[fld]:
#                     name_en = props[fld].strip()
#                     break
#             if not name_en:
#                 continue
#             geom = feat.GetGeometryRef()
#             if not geom:
#                 continue
#             key = name_en.lower()
#             geom_by_name_en[key].append(geom.Clone())
#         ds = None

#     # Объединяем геометрии с одинаковым name_en
#     geom_index = {}
#     for key, geoms in geom_by_name_en.items():
#         merged = geoms[0].Clone()
#         for g in geoms[1:]:
#             merged = merged.Union(g)
#         geojson_geom = json.loads(merged.ExportToJson())
#         geom_index[key] = geojson_geom

#     return geom_index


def fill_geometry(geom_index):
    for gj in INPUT_FILES:
        path_in = os.path.join(SHAPES_DIR, gj)
        if not os.path.exists(path_in):
            print(f"[Error] GeoJSON not found: {gj}")
            continue
        with open(path_in, 'r', encoding='utf-8') as f:
            data = json.load(f)

        total = 0
        found = 0
        skipped = 0
        missing = []

        for feat in data.get('features', []):
            name_en = feat['properties'].get('name_en')
            if not name_en:
                continue
            total += 1

            # ⛔ если уже есть geometry — пропускаем
            if feat.get('geometry'):
                skipped += 1
                continue

            # --- 🔹 1. Простое имя — работаем по-старому
            if ',' not in name_en:
                geom = geom_index.get(name_en.lower())

                # если не нашли — пробуем частично
                if not geom:
                    for key, g in geom_index.items():
                        if name_en.lower() in key:
                            geom = g
                            print(f"[~] Partial match: '{name_en}' matched '{key}'")
                            break
            else:
                # --- 🔸 2. Составное имя: объединение геометрий
                geom = None
                sub_geoms = []
                name_parts = [p.strip().lower() for p in name_en.split(",")]

                for subname in name_parts:
                    g = geom_index.get(subname)

                    if not g:
                        for key, candidate in geom_index.items():
                            if subname in key:
                                g = candidate
                                print(f"[~] Partial match: '{subname}' matched '{key}'")
                                break

                    if g:
                        try:
                            from shapely.geometry import shape
                            shapely_geom = shape(g)  # g уже dict, поэтому не нужно json.loads
                            sub_geoms.append(shapely_geom)
                        except Exception as e:
                            print(f"[Error] Cannot parse sub-geom for '{subname}': {e}")
                    else:
                        print(f"[✗] Subpart '{subname}' not found")

                if sub_geoms:
                    try:
                        from shapely.ops import unary_union
                        from shapely.geometry import mapping
                        unioned = unary_union(sub_geoms)
                        geom = mapping(unioned)  # вернёт dict для GeoJSON
                    except Exception as e:
                        print(f"[Error] Union failed for: {name_en} — {e}")

            # --- финальная запись
            if geom:
                feat['geometry'] = geom
                found += 1
            else:
                missing.append(name_en)

        out_path = path_in.replace('_name_en.geojson', '_geom.geojson')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[Info] Written: {os.path.basename(out_path)}")
        print(f"[✓] Found new: {found} / {total}   (Skipped existing: {skipped})")
        if missing:
            print(f"[✗] Missing ({len(missing)}): {sorted(set(missing))}")
        print("-" * 60)


# def fill_geometry(geom_index):
#     for gj in INPUT_FILES:
#         path_in = os.path.join(SHAPES_DIR, gj)
#         if not os.path.exists(path_in):
#             print(f"[Error] GeoJSON not found: {gj}")
#             continue
#         with open(path_in, 'r', encoding='utf-8') as f:
#             data = json.load(f)
#         missing = []
#         for feat in data.get('features', []):
#             name_en = feat['properties'].get('name_en')
#             if not name_en:
#                 continue
#             # пытаемся по оригиналу и по lower
#             geom = geom_index.get(name_en) or geom_index.get(name_en.lower())
#             if geom:
#                 feat['geometry'] = geom
#             else:
#                 missing.append(name_en)
#         if missing:
#             print(f"[Warning] Missing geometry for: {sorted(set(missing))}")
#         out_path = path_in.replace('_name_en.geojson', '_geom.geojson')
#         with open(out_path, 'w', encoding='utf-8') as f:
#             json.dump(data, f, ensure_ascii=False, indent=2)
#         print(f"[Info] Written: {os.path.basename(out_path)}")

if __name__ == '__main__':
    os.chdir(SHAPES_DIR)
    geom_index = build_geometry_index()
    fill_geometry(geom_index)
