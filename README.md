# MapMaker

* Intended to take a bunch of awesome tools for making maps, but make it _much_ easier to do simple, repeatable map-making operations.

## Requirements

* NodeJS
* `ogr2ogr` (from e.g. `sudo apt-get install gdal-bin`)

## How to use

* @@@ TODO
* See list of country codes [here](https://www.unc.edu/~rowlett/units/codes/country.htm) for reference.

## TODO List

* [ ] Make it easier for people to get the right country codes
  * [ ] Have an option to list them in a table (`NAME`, `ADM0_A3`, `GU_A3`, `SU_A3`, etc.)
  * [ ] Validate input?
* [ ] Have an option for no countries filter, and an example world map using that.
* [ ] For the power user, allow arbitrary `ogr2ogr` options?
* [ ] Make it easy to select an entire continent (or other pre-defined set) to filter in(/out).
* [ ] Make it neater to mix `ADM0_A3` and `SU_A3` (etc.) in both filters and styles (update `6nations.json`).
