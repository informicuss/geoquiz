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


не найденное на момент 27.07
[Warning] Missing geometry for: ['Atlantic Ocean', 'Crete', 'Eurasia', 'Pacific Ocean']
[Info] Written: ancient_discoveries_with_geom.geojson
[Warning] Missing geometry for: ['Faroe Islands', 'Labrador Peninsula', 'Scandinavian Peninsula']
[Info] Written: medieval_discoveries_with_geom.geojson
[Warning] Missing geometry for: ['Lake Lop Nur', 'Victoria Falls']
[Info] Written: research_internal_continents_with_geom.geojson
[Warning] Missing geometry for: ['Bering Strait', 'Cape Dezhnev', 'Commander Islands', 'Kola Peninsula', 'Spitsbergen']
[Info] Written: russian_explorers_with_geom.geojson
