### Exmaple Makefile for creating a simple map of France

# Files/folders
examples_france_BASE_DATA = data/naturalearthdata/10m/cultural
examples_france_DATA_TYPE = ne_10m_admin_0_map_subunits
examples_france_DATA_DIR = $(examples_france_BASE_DATA)/$(examples_france_DATA_TYPE)
examples_france_DATA_SHP = $(examples_france_DATA_DIR)/$(examples_france_DATA_TYPE).shp

# Behaviour
examples_france_FILTER = "ADM0_A3 IN ('FRA')"
examples_france_FILTER_SHA = $(call get_sha,$(examples_france_DATA_DIR) $(FILTER))
examples_france_INTERMEDIATE_GEO = $(BUILD_DIR)/$(examples_france_FILTER_SHA).geo.json
examples_france_INTERMEDIATE_TOPO = $(BUILD_DIR)/$(examples_france_FILTER_SHA).topo.json
examples_france_TOPO_FLAGS = --id-property SU_A3

# Build target
.PHONY: examples/france
examples/france: \
	$(examples_france_INTERMEDIATE_TOPO)

# Make intermediate GeoJSON file, with specified filter
$(examples_france_INTERMEDIATE_GEO): \
	build-dir \
	$(examples_france_DATA_DIR)
$(examples_france_INTERMEDIATE_GEO):
	rm -f $(examples_france_INTERMEDIATE_GEO)
	ogr2ogr -f GeoJSON -where $(examples_france_FILTER) $(examples_france_INTERMEDIATE_GEO) $(examples_france_DATA_SHP)

# Make intermediate TopoJSON file (give it a sensible name in the mean time though as this is used in the JSON)
$(examples_france_INTERMEDIATE_TOPO): \
	$(examples_france_INTERMEDIATE_GEO)
$(examples_france_INTERMEDIATE_TOPO):
	cp $(examples_france_INTERMEDIATE_GEO) $(BUILD_DIR)/subunits.json
	topojson -o $(examples_france_INTERMEDIATE_TOPO) $(examples_france_TOPO_FLAGS) -- $(BUILD_DIR)/subunits.json
	rm -f $(BUILD_DIR)/subunits.json

# Copy TopoJSON file to test site
.PHONY: examples/france/test
examples/france/test: \
	$(examples_france_INTERMEDIATE_TOPO)
examples/france/test:
	cp $(examples_france_INTERMEDIATE_TOPO) test-site/test.json
