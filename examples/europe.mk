### Example Makefile for creating a simple map of France

# Files/folders
examples_europe_BASE_DATA = data/naturalearthdata/10m/cultural
examples_europe_DATA_TYPE = ne_10m_admin_0_map_subunits
examples_europe_DATA_DIR = $(examples_europe_BASE_DATA)/$(examples_europe_DATA_TYPE)
examples_europe_DATA_SHP = $(examples_europe_DATA_DIR)/$(examples_europe_DATA_TYPE).shp

# Behaviour
examples_europe_FILTER = "ADM0_A3 IN ('FRA', 'GBR', 'ITA', 'ESP', 'DNK', 'BEL', 'DEU', 'NLX', 'LUX', 'CHE', 'AUT', 'LIE', 'AND')"
examples_europe_FILTER_SHA = $(call get_sha,$(examples_europe_DATA_DIR) $(FILTER))
examples_europe_INTERMEDIATE_GEO = $(BUILD_DIR)/$(examples_europe_FILTER_SHA).geo.json
examples_europe_INTERMEDIATE_TOPO = $(BUILD_DIR)/$(examples_europe_FILTER_SHA).topo.json
examples_europe_TOPO_FLAGS = --id-property SU_A3

# Build target
.PHONY: examples/europe
examples/europe: build-dir
	# Make intermediate GeoJSON file, with specified filter
	rm -f $(examples_europe_INTERMEDIATE_GEO)
	ogr2ogr -f GeoJSON -where $(examples_europe_FILTER) $(examples_europe_INTERMEDIATE_GEO) $(examples_europe_DATA_SHP)
	# ogr2ogr -f GeoJSON $(examples_europe_INTERMEDIATE_GEO) $(examples_europe_DATA_SHP)
	# Make intermediate TopoJSON file (give it a sensible name in the mean time though as this is used in the JSON)
	cp $(examples_europe_INTERMEDIATE_GEO) $(BUILD_DIR)/subunits.json
	topojson -o $(examples_europe_INTERMEDIATE_TOPO) $(examples_europe_TOPO_FLAGS) -- $(BUILD_DIR)/subunits.json
	rm -f $(BUILD_DIR)/subunits.json

# Copy TopoJSON file to test site
.PHONY: examples/europe/test
examples/europe/test: examples/europe
	cp $(examples_europe_INTERMEDIATE_TOPO) test-site/test.json
