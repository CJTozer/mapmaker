### Steps to reproduce below.
# (From https://bost.ocks.org/mike/map/ and https://medium.com/@mbostock/command-line-cartography-part-1-897aa8f8ca2c#.u7rhxzq3t)
#
# - [x] Get data from naturalearthdata
# - [ ] Filter down (and convert to JSON) using ogr2ogr
#   - `ogr2ogr -f GeoJSON -where "ADM0_A3 IN ('GBR', 'IRL', 'FRA')" subunits.json ne_10m_admin_0_map_subunits.shp`
# - [ ] Convert to TopoJSON format
#   - `topojson -o topo.json -- geo.json`
# - [ ] Copy to /test-site (boiler-plate test site)


### Main makefile
DATA_DIR=data

# Default action
help:
	@echo "Targets:"
	@echo "    (sudo) make dependencies"

dependencies:
	@apt-get -y install wget unzip # WGET, unzip
	@apt-get -y install gdal-bin # GDAL binaries (for ogr2ogr)
	@apt-get -y install nodejs # NodeJS
	@npm install -g topojson@1 # TopoJSON

data-dir/%:
	@mkdir -p $(DATA_DIR)/$*


### Natural Earth Data (http://www.naturalearthdata.com/)
NATURAL_EARTH_DATA_URL=http://www.naturalearthdata.com/http//www.naturalearthdata.com/download

data/naturalearthdata/%: data-dir/naturalearthdata/%
	@wget $(NATURAL_EARTH_DATA_URL)/$*.zip -O $@/tmp.zip
	@unzip $@/tmp.zip -d $@
	@rm $@/tmp.zip


### Helper Functions

# Generate a sha from e.g. a data source name and a filter string.
# E.g. `$(call filter_sha,naturalearthdata/10m/cultural/ne_10m_admin_0_map_subunits ADM0_A3 IN ('GBR', 'IRL'))`
filter_sha = echo "$(1)" | sha1sum | cut -d " " -f1
