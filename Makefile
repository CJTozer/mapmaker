### Steps to reproduce below.
# (From https://bost.ocks.org/mike/map/ and https://medium.com/@mbostock/command-line-cartography-part-1-897aa8f8ca2c#.u7rhxzq3t)
#
# - [x] Get data from naturalearthdata
# - [x] Filter down (and convert to JSON) using ogr2ogr
#   - `ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('GBR', 'IRL', 'FRA')" subunits.json ne_10m_admin_0_map_subunits.shp`
# - [x] Convert to TopoJSON format
#   - `topojson -o topo.json -- geo.json`
# - [ ] Copy to /test-site (boiler-plate test site)
# - [ ] Just do it in Python, reading from a JSON file?
# - [ ] Move all the re-scaling, projections etc. into the map Makefile not the HTML?
# - [ ] Sort out dependencies - right now everything is happening always...


### Main makefile
DATA_DIR=data
BUILD_DIR=build
OUTPUT_DIR=output

# Default action
help:
	@echo "Targets:"
	@echo "    (sudo) make dependencies"
	@echo "    make examples/france"
	@echo "    make user/yourmap"

dependencies:
	@apt-get -y install wget unzip # WGET, unzip
	@apt-get -y install gdal-bin # GDAL binaries (for ogr2ogr)
	@apt-get -y install nodejs # NodeJS
	@npm install -g topojson@1 # TopoJSON

build-dir:
	@mkdir -p $(BUILD_DIR)


### Natural Earth Data (http://www.naturalearthdata.com/)
NATURAL_EARTH_DATA_URL=http://www.naturalearthdata.com/http//www.naturalearthdata.com/download
data/naturalearthdata/%:
	mkdir -p $(DATA_DIR)/naturalearthdata/$*
	wget $(NATURAL_EARTH_DATA_URL)/$*.zip -O $@/tmp.zip
	unzip $@/tmp.zip -d $@
	rm $@/tmp.zip


### Include examples/user makefiles
-include examples/*.mk
-include user/*.mk


### Helper Functions

# Generate a sha from e.g. a data source name and a filter string.
# `$(call get_sha,naturalearthdata/10m/cultural/ne_10m_admin_0_map_subunits ADM0_A3 IN ('GBR', 'IRL'))`
get_sha = $(shell echo $(1) | sha1sum | cut -d " " -f1)
