


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
build-install: ## Installs in location: make build-install DEST=/home/riven/obsidian/Default/.obsidian/plugins/claude-code-integration
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
setup-plugin: ## Setup a symlink to the build folder make setup-plugin DEST=/home/riven/obsidian/Default/.obsidian/plugins/claude-code-integration
	@if [ -z "$(DEST)" ]; then \
		echo "Error: Please specify DEST variable, e.g., make build-install DEST=/path/to/folder"; \
		exit 1; \
	fi
	@ln -s $(DEST) build

.PHONY: setup-hotreload
setup-hotreload: ## Setup a symlink to the build folder make setup-hotreload DEST=/home/riven/obsidian/Default/.obsidian/plugins/claude-code-integration
	@if [ -z "$(DEST)" ]; then \
		echo "Error: Please specify DEST variable, e.g., make build-install DEST=/path/to/folder"; \
		exit 1; \
	fi
	@cp -r ./hotreload $(DEST)

.PHONY: release
release: ## Build and upload a new release (auto-increments patch version)
	@CURRENT_VERSION=$$(grep -oP '"version":\s*"\K[^"]+' manifest.json); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	echo "Bumping version: $$CURRENT_VERSION -> $$NEW_VERSION"; \
	sed -i "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" manifest.json; \
	echo "Building plugin..."; \
	npm run build; \
	echo "Committing version bump..."; \
	git add manifest.json; \
	git commit -m "$$NEW_VERSION"; \
	echo "Creating tag $$NEW_VERSION..."; \
	git tag $$NEW_VERSION; \
	echo "Pushing to remote..."; \
	git push && git push --tags; \
	echo "Creating GitHub release $$NEW_VERSION..."; \
	gh release create $$NEW_VERSION build/main.js manifest.json build/styles.css --title "$$NEW_VERSION" --generate-notes || \
	gh release upload $$NEW_VERSION build/main.js manifest.json build/styles.css --clobber; \
	echo "Release $$NEW_VERSION uploaded successfully!"
