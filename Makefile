BLDDIR = build

# Necessary because zip copies leading directories if run from above targets
ABS_BLDDIR := $(shell readlink -f $(BLDDIR))

all: tbkeys tbkeys-lite

tbkeys: $(BLDDIR)/tbkeys.xpi

tbkeys-lite: $(BLDDIR)/tbkeys-lite.xpi

SRC_FILES = $(wildcard addon/*.json) $(wildcard addon/*.js) $(wildcard addon/*.html) $(wildcard addon/modules/*.js) $(wildcard addon/*.md)
ADDON_FILES = $(subst addon/,,$(SRC_FILES))

$(BLDDIR)/tbkeys.xpi: $(SRC_FILES)
	@mkdir -p $(dir $@)
	rm -f $@
	cd addon; zip -FSr $(ABS_BLDDIR)/tbkeys.xpi $(ADDON_FILES)

$(BLDDIR)/tbkeys-lite.xpi: $(SRC_FILES)
	rm -rf $(dir $@)/lite
	@mkdir -p $(dir $@)
	cp -r addon $(dir $@)/lite
	# Drop update_url
	sed -i '/update_url/d' $(dir $@)/lite/manifest.json
	sed -i 's/\( *"strict_min_version".*\),$$/\1/' $(dir $@)/lite/manifest.json
	# Drop eval()
	sed -i 's/^\( *\)eval(.*/\1# Do nothing/' $(dir $@)/lite/implementation.js
	# Change name
	sed -i 's/tbkeys@/tbkeys-lite@/' $(dir $@)/lite/manifest.json
	sed -i 's/"name": "tbkeys"/"name": tbkeys-lite"/' $(dir $@)/lite/manifest.json
	sed -i 's/tbkeys@/tbkeys-lite@/' $(dir $@)/lite/implementation.js
	# Build xpi
	cd $(dir $@)/lite; zip -FSr $(ABS_BLDDIR)/tbkeys-lite.xpi $(ADDON_FILES)

clean:
	rm -f $(BLDDIR)/tbkeys*.xpi
	rm -rf $(BLDDIR)/lite

.PHONY: all clean xpi
