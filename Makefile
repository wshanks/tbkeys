BLDDIR = build

# Necessary because zip copies leading directories if run from above targets
ABS_BLDDIR := $(shell readlink -f $(BLDDIR))

all: xpi

xpi: $(BLDDIR)/tbkeys.xpi

$(BLDDIR)/tbkeys.xpi:
	@mkdir -p $(dir $@)
	cd addon; zip -FSr $(ABS_BLDDIR)/tbkeys.xpi * -x '*.swp' -x '#*#' -x '*~'

clean:
	rm -f $(BLDDIR)/tbkeys.xpi

.PHONY: all clean xpi
