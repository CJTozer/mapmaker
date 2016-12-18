# Main makefile
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

# Natural Earth Data (http://www.naturalearthdata.com/)
NATURAL_EARTH_DATA_URL=http://www.naturalearthdata.com/http//www.naturalearthdata.com/download

data/naturalearthdata/%: data-dir/naturalearthdata/%
	@wget $(NATURAL_EARTH_DATA_URL)/$*.zip -O $@/tmp.zip
	@unzip $@/tmp.zip -d $@
	@rm $@/tmp.zip
