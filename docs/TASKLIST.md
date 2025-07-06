# 🚀 Next Moves Task List

> ⚠️ **MAJOR PIVOT IN PROGRESS**: We are removing the plugin system and refocusing on being a best-in-class transclusion tool. See [REORG_TASKLIST.md](./REORG_TASKLIST.md) for the reorganization plan and [docs/sitreps/2025-06-19-brutal-honesty.md](./docs/sitreps/2025-06-19-brutal-honesty.md) for rationale.

## 🎯 Feature Specifications to Create
- [x] F020 - CLI Output Control → **MOVED TO** `docs/features/completed/`
- [x] F021 - Heading Range Extraction → **MOVED TO** `docs/features/completed/`
- [x] ~~F022 - Plugin System for Custom Transformers~~ → **REMOVED IN v2.0.0**
- [x] F023 - VS Code Extension for Transclusion Preview
- [x] F024 - Content Analytics & Dependency Graphs
- [x] F025 - Enhanced Error Recovery → **MOVED TO** `docs/features/completed/`

## 📚 Documentation Generation
- [ ] Auto-generate comprehensive docs for all src/ modules
- [ ] Create rationale, design details, class diagrams for each module
- [ ] Add mermaid diagrams for data flow visualization
- [ ] Generate test plans from documentation

## 🔧 Implementation Tasks (Prioritized)

### 🥇 **Priority 1: User Experience**
- [x] F021 - Implement heading range extraction `![[file#start:end]]`
- [x] F020 - CLI output control (--verbose, --porcelain, --progress) - ALREADY IMPLEMENTED!
- [x] F025 - Enhanced error recovery with human-friendly suggestions ✅ COMPLETE

### 🥈 **Priority 2: Developer Experience**
- [x] Generate comprehensive documentation for all src/ modules (core modules complete)
- [x] ~~F022 - Design and implement plugin system architecture~~ ❌ REMOVED
- [ ] F023 - Create VS Code extension prototype (using new API)

### 🥉 **Priority 3: Analytics & Tooling**
- [ ] F024 - Implement content analytics and dependency graphs
- [ ] Create GitHub Action for transclusion validation
- [ ] Add pre-commit/pre-push hook templates

### 🎁 **Priority 4: Performance & Polish**
- [ ] Add intelligent caching for repeated operations
- [ ] Watch mode implementation (`--watch` flag)
- [ ] Line number preservation in output

## 📋 Completion Notes

### ✅ Recently Completed Features (2025-06-18/19)
- **F020**: CLI Output Control - Unix-style flags (simplifying in v2.0.0)
- **F021**: Heading Range Extraction - Advanced ![[file#start:end]] syntax  
- ~~**F022**: Plugin System Architecture~~ - Built then removed (see SITREP)
- **F025**: Enhanced Error Recovery - Fuzzy matching with intelligent suggestions

### 🎯 **Recommended Next Moves (Priority Order)**

#### ⚠️ **OBSOLETE - Plugin System Being Removed**
~~1. **Stream Integration for Plugins**~~ ❌ CANCELLED
   - ~~Integrate plugin execution into TransclusionTransform stream~~
   - Being removed in v2.0.0 reorganization

#### 🥇 **New Immediate Priorities**
1. **Core Architecture Cleanup** ⭐⭐⭐
   - Implement clean separation: CLI/Stream/API
   - Remove plugin system entirely
   - **Impact**: Cleaner, faster, more maintainable
   - **Effort**: 3 weeks (see REORG_TASKLIST.md)

2. **F023 - VS Code Extension Prototype** ⭐⭐⭐
   - Live preview of transclusion resolution in VS Code
   - Use new Rich API (not plugins)
   - **Impact**: Developer experience game-changer
   - **Effort**: 4-6 hours (after v2.0.0)

#### 🥈 **Medium Term (Expand Capabilities)**
3. **F024 - Content Analytics & Dependency Graphs** ⭐⭐
   - Generate dependency graphs showing file relationships
   - Content analytics (file sizes, transclusion counts, etc.)
   - **Impact**: Documentation insight and optimization
   - **Effort**: 6-8 hours

4. **Watch Mode Implementation** ⭐⭐
   - Real-time processing with --watch flag
   - File system monitoring for auto-rebuild
   - **Impact**: Development workflow improvement
   - **Effort**: 4-5 hours

#### 🥉 **Future Enhancements (Polish & Scale)**
5. **Performance Optimization** ⭐
   - Intelligent caching system
   - Parallel plugin execution
   - **Impact**: Better performance for large docs
   - **Effort**: 3-4 hours

6. **GitHub Actions Integration** ⭐
   - Pre-built action for CI/CD workflows
   - Documentation validation automation
   - **Impact**: CI/CD adoption
   - **Effort**: 2-3 hours

### 🎯 **Strategic Recommendation**
**Start with Stream Integration** - This completes the plugin system and makes it fully functional. Then move to VS Code extension for maximum developer impact.

---
**Started**: 2025-06-18  
**Major Updates**: 2025-06-19 (Plugin System & Enhanced Error Recovery)  
**Status**: Core architecture complete! Ready for ecosystem expansion 🚀