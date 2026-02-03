### ADR-003: Skills-Based Pattern Detection Enhancement
**Status**: Accepted
**Date**: 2026-02-02
**Context**: The original Teller was only detecting basic patterns from terminal commands. To provide more sophisticated behavioral insights, we needed a system that could detect complex patterns like repetitive loops, intent drift, and cross-session similarities.

**Decision**: Implemented a skills-based pattern detection system with:
- Three specialized skills: loop detection, intent tracking, and cross-session analysis
- Vector memory for semantic similarity search across sessions
- Dynamic skill loading from .opencode/skills directories
- Enhanced agent that combines pattern detection with traditional observations

**Rationale**: Skills provide modular, extensible pattern detection that can be added without modifying core code. Vector memory enables "semantic rhyming" to find conceptually similar past patterns, not just exact text matches.

**Consequences**:
- **Benefits**: Much more sophisticated pattern recognition, extensible architecture, cross-session insights
- **Drawbacks**: Increased complexity, dependency on vector database (placeholder implementation), requires separate terminal for proper monitoring
- **Trade-offs**: More complex to maintain but provides significantly better insights

**Testing**: Successfully tested with all three skills loading and pattern detection working. Teller now detects meta-patterns like debugging the detector instead of working.

**Known Issues**:
- Vector memory is placeholder implementation (uses random vectors)
- Teller must run in separate terminal from work to capture actual coding activity

**Open Questions**:
- Which vector database to use for production (Chroma, Pinecone, FAISS)?
- Should we add more specialized skills?
- How to handle multi-session analysis effectively?

**Future Considerations**:
- Implement real vector database integration
- Add more pattern detection skills
- Consider web-based UI for pattern visualization
- Add session export/import capabilities

**References**:
- /src/agent/enhanced-teller.ts
- /src/agent/skill-loader.ts
- /src/agent/vector-memory.ts
- /src/teller2.ts
- .opencode/skills/ directory structure