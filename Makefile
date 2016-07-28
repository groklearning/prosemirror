SOURCES := $(wildcard src/**/*.js)
DIST = $(SOURCES:src/%=dist/%)

all: $(DIST)

dist/%.js: src/%.js
	@mkdir -p $(dir $@)
	node_modules/.bin/babel $< > $@

demo: demo/demo-built.js

demo/demo-built.js: demo/demo.js src/**/*.js
	node_modules/.bin/browserify -d --outfile $@ -t babelify $<

browsertests: demo/test-built.js

demo/test-built.js: demo/test.js src/**/*.js
	node_modules/.bin/browserify -d --outfile $@ -t babelify $<

release/prosemirror.js: release/release.js src/**/*.js
	node_modules/.bin/browserify -d -t babelify -s ProseMirror $< > $@

release/prosemirror.min.js: release/release.js src/**/*.js
	node_modules/.bin/browserify -d -t babelify -s ProseMirror $< | node_modules/.bin/uglifyjs - -m > $@
