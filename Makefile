.PHONY: help check test bundle verify clean
help:
	@printf 'make check   - offline sanity tests\nmake bundle  - signed .swbn (Codex: implement tooling)\nmake verify  - verify .swbn (Codex: implement tooling)\nmake clean   - remove generated bundles\n'
check test:
	python3 -m unittest discover -s tests -v
	node tests/test_tcp.mjs
bundle:
	bash scripts/build.sh
verify:
	bash scripts/verify.sh
clean:
	rm -rf dist/*.swbn dist/*.wbn
