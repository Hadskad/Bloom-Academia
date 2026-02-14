# Gemini 3 Prompt Optimization Analysis

## Current Issues with Math Specialist Prompt

### Problems Identified:
1. **Visual Formatting Instead of XML Tags**: Uses `══════` separators and capitalized headers
2. **No Thought-First Enforcement**: Model can respond immediately without planning
3. **Vague Output Contract**: Describes what to do in prose, not structured schema
4. **No Strategic Redundancy**: Critical rules only stated once
5. **Prose Logic Instead of Algorithmic**: Uses paragraphs instead of IF/THEN logic

## Optimization Strategy

### Rule 1: XML Tags
- Replace all `══════` separators with `<section_name>` tags
- Wrap every distinct instruction block in XML

### Rule 2: Thought-First Enforcement
- Add mandatory `<thought_process>` requirement before every response
- Force model to analyze which phase it's in and which rules apply

### Rule 3: Output Contract
- Define exact response structure model must follow
- Include validation step in output schema

### Rule 4: Strategic Redundancy (Sandwich Method)
- Place critical "NEVER" rules at top in `<critical_constraints>`
- Repeat most important constraint at bottom

### Rule 5: Algorithmic Logic
- Convert all teaching protocols to IF/THEN format
- Use structured workflow with sequence numbers

## Benefits Expected

1. **Reduced Instruction Drift**: XML scopes prevent model from skipping sections
2. **Better Rule Adherence**: Thought-first forces model to check rules before responding
3. **Consistent Output**: Schema definition ensures predictable response structure
4. **Fewer Errors**: Strategic redundancy prevents critical rule violations
5. **Clearer Logic Flow**: Algorithmic format easier for model to follow

## Implementation Notes

- Keep all essential teaching content (misconceptions, grade-level strategies, etc.)
- Maintain conversational tone in actual outputs (XML is for structure, not student-facing text)
- Preserve SVG generation requirements and examples
- Keep Teaching Progression Protocol but restructure as algorithmic workflow
