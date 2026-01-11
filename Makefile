# Obsidian Claude Code Plugin - Makefile
# =======================================

# Default plugin destination (customize this for your setup)
PLUGIN_DIR ?= /home/riven/obsidian/Default/.obsidian/plugins/claude-code-integration

.PHONY: help
help: ## Show this help message
	@echo ''
	@echo 'Obsidian Claude Code Plugin'
	@echo '==========================='
	@echo ''
	@echo 'Quick Start (Hot Reload):'
	@echo '  1. make link      - Symlink build folder to Obsidian'
	@echo '  2. make dev       - Start dev server with hot reload'
	@echo ''
	@echo 'Current PLUGIN_DIR: $(PLUGIN_DIR)'
	@echo 'Override with: make <target> PLUGIN_DIR=/path/to/plugins/claude-code-integration'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ''

# =======================================
# Development (Hot Reload)
# =======================================

.PHONY: link
link: ## Symlink build folder to Obsidian plugin directory
	@if [ -e "$(PLUGIN_DIR)" ]; then \
		echo "Removing existing plugin directory..."; \
		rm -rf "$(PLUGIN_DIR)"; \
	fi
	@mkdir -p build
	@echo "Creating symlink: $(PLUGIN_DIR) -> $(PWD)/build"
	@ln -s "$(PWD)/build" "$(PLUGIN_DIR)"
	@echo "Symlink created successfully!"

.PHONY: unlink
unlink: ## Remove the symlink from Obsidian plugin directory
	@if [ -L "$(PLUGIN_DIR)" ]; then \
		rm "$(PLUGIN_DIR)"; \
		echo "Symlink removed."; \
	else \
		echo "No symlink found at $(PLUGIN_DIR)"; \
	fi

.PHONY: dev
dev: ## Start development build with watch mode (hot reload)
	@echo "Starting dev server with hot reload..."
	@echo "Make sure 'Hot Reload' plugin is installed in Obsidian"
	@echo ""
	@npm run dev

.PHONY: hotreload
hotreload: ## Create .hotreload file to trigger reload
	@echo "" > build/.hotreload
	@echo "Hot reload triggered"

# =======================================
# Building
# =======================================

.PHONY: build
build: ## Build the plugin for production
	@npm run build
	@echo "" > build/.hotreload

.PHONY: clean
clean: ## Clean build artifacts
	@rm -rf build

.PHONY: lint
lint: ## Run ESLint on source files
	@npm run lint

# =======================================
# Installation
# =======================================

.PHONY: install
install: build ## Build and copy files to Obsidian plugin directory
	@echo "Installing to $(PLUGIN_DIR)..."
	@mkdir -p "$(PLUGIN_DIR)"
	@cp -r build/* "$(PLUGIN_DIR)/"
	@echo "Plugin installed!"

# =======================================
# Release
# =======================================

.PHONY: release
release: ## Build and upload a new release (auto-increments patch version). Use NOTES="..." for custom release notes
	@$(MAKE) _do_release BUMP_TYPE=patch

.PHONY: release-minor
release-minor: ## Build and upload a new minor release (1.0.x -> 1.1.0)
	@$(MAKE) _do_release BUMP_TYPE=minor

.PHONY: release-major
release-major: ## Build and upload a new major release (1.x.x -> 2.0.0). Includes CHANGELOG.md in release notes
	@$(MAKE) _do_release BUMP_TYPE=major

.PHONY: _do_release
_do_release:
	@CURRENT_VERSION=$$(grep -oP '"version":\s*"\K[^"]+' manifest.json); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	if [ "$(BUMP_TYPE)" = "major" ]; then \
		NEW_VERSION="$$((MAJOR + 1)).0.0"; \
	elif [ "$(BUMP_TYPE)" = "minor" ]; then \
		NEW_VERSION="$$MAJOR.$$((MINOR + 1)).0"; \
	else \
		NEW_VERSION="$$MAJOR.$$MINOR.$$((PATCH + 1))"; \
	fi; \
	echo "Bumping version: $$CURRENT_VERSION -> $$NEW_VERSION ($(BUMP_TYPE))"; \
	sed -i "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" manifest.json; \
	echo "Building plugin..."; \
	npm run build; \
	echo "Creating zip archive..."; \
	zip -j build/claude-code-integration.zip build/main.js manifest.json build/styles.css; \
	echo "Committing version bump..."; \
	git add manifest.json CHANGELOG.md; \
	git commit -m "v$$NEW_VERSION"; \
	echo "Creating tag v$$NEW_VERSION..."; \
	git tag "v$$NEW_VERSION"; \
	echo "Pushing to remote..."; \
	git push -u origin HEAD && git push origin --tags; \
	echo "Creating GitHub release v$$NEW_VERSION..."; \
	if [ -n "$(NOTES)" ]; then \
		gh release create "v$$NEW_VERSION" build/main.js manifest.json build/styles.css build/claude-code-integration.zip --title "v$$NEW_VERSION" --notes "$(NOTES)"; \
	elif [ -f CHANGELOG.md ]; then \
		gh release create "v$$NEW_VERSION" build/main.js manifest.json build/styles.css build/claude-code-integration.zip --title "v$$NEW_VERSION" --notes-file CHANGELOG.md; \
	else \
		gh release create "v$$NEW_VERSION" build/main.js manifest.json build/styles.css build/claude-code-integration.zip --title "v$$NEW_VERSION" --generate-notes; \
	fi || \
	gh release upload "v$$NEW_VERSION" build/main.js manifest.json build/styles.css build/claude-code-integration.zip --clobber; \
	echo "Release v$$NEW_VERSION uploaded successfully!"
