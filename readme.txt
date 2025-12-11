команды выполняются в OSGeo4W Shell (для этого надо установить приложение и при установке еще выбирать соответствующие галки и питон)

python fill_geometry.py - заполняет геометрии, для незаполненных объектов на основе нескольких shape файлов

ogr2ogr -f CSV GMBA_Inventory_v2.0_standard_300.csv GMBA_Inventory_v2.0_standard_300.shp -select NAME_EN,NAME_RU
ogr2ogr -f CSV ne_10m_geography_marine_polys.csv ne_10m_geography_marine_polys.shp -select NAME,NAME_EN,NAME_RU
ogr2ogr -f CSV ne_50m_admin_1_states_provinces.csv ne_50m_admin_1_states_provinces.shp -select NAME,NAME_EN,NAME_RU
ogr2ogr -f CSV ne_50m_geography_regions_polys.csv ne_50m_geography_regions_polys.shp -select NAME,NAME_EN,NAME_RU

ogrinfo -so ne_10m_lakes.shp ne_10m_lakes
ogr2ogr -f CSV ne_10m_lakes.csv ne_10m_lakes.shp -select name,name_en,name_ru
ogr2ogr -f CSV ne_10m_geography_regions_polys.csv ne_10m_geography_regions_polys.shp -select name,name_en,name_ru

ogrinfo -so ne_10m_populated_places_simple.shp ne_10m_populated_places_simple
ogr2ogr -f CSV ne_10m_populated_places_simple.csv ne_10m_populated_places_simple.shp -select name,name_en,name_ru

Поиск по шейпфайлу по части названия, чтобы догадаться, как называется на английском...
ogrinfo ne_10m_geography_marine_polys.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_geography_marine_polys WHERE LOWER(name) LIKE LOWER('%%татар%%') OR LOWER(name_en) LIKE LOWER('%%tar%%')"

ogrinfo ne_10m_rivers_lake_centerlines.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_rivers_lake_centerlines WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo ne_10m_lakes.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_lakes WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo ne_10m_geography_marine_polys.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_geography_marine_polys WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo ne_10m_geography_marine_polys.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_geography_marine_polys WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo ne_50m_admin_1_states_provinces.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_50m_admin_1_states_provinces WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo GMBA_Inventory_v2.0_standard_300.shp -dialect SQLITE -sql "SELECT name, name_en FROM GMBA_Inventory_v2.0_standard_300 WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo ne_10m_geography_regions_polys.shp -dialect SQLITE -sql "SELECT name, name_en FROM ne_10m_geography_regions_polys WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"
ogrinfo Smithsonian_VOTW_Holocene_VolcanoesPoint.shp -dialect SQLITE -sql "SELECT name, name_en FROM Smithsonian_VOTW_Holocene_VolcanoesPoint WHERE LOWER(name_en) LIKE LOWER('%%Neva%%')"




Назначение	Подходит файл
Материки	ne_10m_geography_regions_polys.shp
Континенты	ne_10m_geography_regions_polys.shp
Страны	ne_10m_admin_0_countries.shp
Провинции / штаты	ne_10m_admin_1_states_provinces.shp
Регионы рельефа	GMBA_Inventory_v2.0_standard_300.shp
Моря и океаны	ne_10m_geography_marine_polys.shp

ne_10m_geography_regions_polys.shp
Содержит:

NAME, NAME_EN, NAME_RU и т.п.

группы островов: Канары, Сейшелы, Микронезия и т.д.

регионы: Субантарктика, Полинезия и пр.

ne_10m_admin_0_countries.shp
включает островные государства (Сейшелы, Фиджи, Тувалу и пр.)

содержит имена и коды
