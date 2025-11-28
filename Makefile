


.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'



.PHONY: build
build: ## Build the plugin using
	@npm run build
	@echo ""> build/.hotreload


.PHONY: build-install
build-install: ## Installs in location: make build-install DEST=/Users/griffnb/lexis/.obsidian/plugins/claude-code
	@if [ -z "$(DEST)" ]; then \
		echo "Error: Please specify DEST variable, e.g., make build-install DEST=/path/to/folder"; \
		exit 1; \
	fi
	@echo "Building plugin..."
	@npm run build
	@echo "Installing to $(DEST)..."
	@mkdir -p $(DEST)
	@cp -r build/* $(DEST)/
	@echo "Plugin installed to $(DEST)"

.PHONY: clean
clean: ## Clean build artifacts
	@rm -rf build



.PHONY: setup-plugin
setup-plugin: ## Setup a symlink to the build folder make setup-plugin DEST=/Users/griffnb/lexis/.obsidian/plugins/claude-code
	@if [ -z "$(DEST)" ]; then \
		echo "Error: Please specify DEST variable, e.g., make build-install DEST=/path/to/folder"; \
		exit 1; \
	fi
	@ln -s $(DEST) build

.PHONY: setup-hotreload
setup-hotreload: ## Setup a symlink to the build folder make setup-hotreload DEST=/Users/griffnb/lexis/.obsidian/plugins/hotreload
	@if [ -z "$(DEST)" ]; then \
		echo "Error: Please specify DEST variable, e.g., make build-install DEST=/path/to/folder"; \
		exit 1; \
	fi
	@cp -r ./hotreload $(DEST)