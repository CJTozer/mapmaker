### Exmaple Makefile for creating a simple map of France

# Files/folders
examples_france_BASE_DATA = data/naturalearthdata/10m/cultural
examples_france_DATA_TYPE = ne_10m_admin_0_map_subunits
examples_france_DATA_DIR = $(examples_france_BASE_DATA)/$(examples_france_DATA_TYPE)
examples_france_DATA_SHP = $(examples_france_DATA_DIR)/$(examples_france_DATA_TYPE).shp

# Behaviour
examples_france_FILTER = "ADM0_A3 IN ('FRA')"
examples_france_FILTER_SHA = $(call get_sha,$(examples_france_DATA_DIR) $(FILTER))
examples_france_INTERMEDIATE_FILE = $(BUILD_DIR)/$(examples_france_FILTER_SHA).json

examples/france: \
	$(examples_france_INTERMEDIATE_FILE)

$(examples_france_INTERMEDIATE_FILE): \
	build-dir \
	$(examples_france_DATA_DIR)
$(examples_france_INTERMEDIATE_FILE):
	@rm -f $(BUILD_DIR)/$(examples_france_FILTER_SHA).json
	@ogr2ogr -f GeoJSON -where $(examples_france_FILTER) $(BUILD_DIR)/$(examples_france_FILTER_SHA).json $(examples_france_DATA_SHP)

