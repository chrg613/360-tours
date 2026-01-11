# Automatic Tour Creation (AI)

This feature describes AI-assisted workflows that generate a draft tour structure and content.

Status: **Post‑MVP** (opt-in)

Related docs:
- AI job model: `../00-conventions.md` (`AIJob`)
- API contract: `../technical/api-specification.md`

## Goal

Reduce authoring time by generating:
- suggested scene titles/descriptions
- suggested scene ordering
- suggested hotspots (navigation/info/media)

The user MUST review and explicitly apply suggestions before publishing.

## Inputs

- `tour_id`
- Optional: property description / brief
- Optional: constraints (preferred ordering, language)

## Outputs

AI output MUST be structured and compatible with canonical schemas:

- Proposed scene titles/descriptions
- Proposed scene ordering (list of `scene_id`s)
- Proposed hotspots using `Hotspot` + typed content (see `../00-conventions.md`)

## Workflow

1. User triggers AI generation from the editor.
2. Backend creates an AI job (`job_type=tour_generation`).
3. Client polls job status until `completed`.
4. Client shows a diff-like review UI.
5. User applies selected changes (creates/updates scenes and hotspots).

## API usage

- Create job: `POST /api/v1/ai/jobs` (`job_type: tour_generation`, `tour_id`, `input`)
- Poll job: `GET /api/v1/ai/jobs/{job_id}`
- Apply results: performed via normal CRUD endpoints (scenes/hotspots) to keep auditability.

## Safety and privacy

- Private tours MUST require explicit opt-in before any AI processing.
- AI output MUST be treated as untrusted input (sanitize any HTML, validate URLs).

**Document Links**:
- [AI Features Index](README.md) ← Back
- [Scene Detection & Analysis](scene-detection.md) → Next

- Trash cans, litter, and debris
- Construction materials
- Vehicles (in interior scenes)
- People and animals (for privacy)
- Reflections of photographers or equipment

Scene-specific filtering also applies—for example, kitchen and bathroom scenes trigger additional checks for items like dirty dishes, laundry, or general clutter.

**Image Enhancement Process**

Based on the quality analysis, the enhancement process applies targeted improvements:

- **Brightness and Contrast Adjustment**: Applied when metrics fall below threshold (40%)
- **Denoising**: Applied when noise levels exceed 50%
- **Sharpening**: Applied when sharpness falls below 50%
- **Color Enhancement**: Applied to all images for improved visual appeal

## Multi-Format Input Support

### 1. Document Processing

The document processing service handles various property document types to extract relevant information for tour creation.

**Supported Document Types**

The processor accepts multiple document formats:

- **PDF Documents**: Property listings, floor plans, brochures, legal documents
- **Image Documents**: Photographs with text, scanned documents, infographics
- **Text Documents**: Plain text descriptions, formatted documents

**PDF Processing**

PDF documents are processed using the VLLM's document understanding capabilities. The system extracts text from all pages, identifies document structure, and organizes information into categories:

1. **Property Details**: Address, size, property type
2. **Specifications**: Rooms, bathrooms, square footage
3. **Features & Amenities**: Kitchen features, outdoor spaces, special amenities
4. **Price & Financial Information**: Listing price, taxes, HOA fees
5. **Location & Neighborhood**: Area description, nearby amenities, schools
6. **Contact Information**: Agent details, brokerage information

**Image Document Processing**

Image-based documents undergo optical character recognition and visual analysis. The VLLM extracts visible text, interprets diagrams or floor plans, and analyzes any property photographs included in the document.

### 2. Voice Input Processing

The voice input processor enables users to describe properties verbally, which the AI then converts into structured tour plans.

**Voice Processing Pipeline**

Voice input follows a multi-stage processing pipeline:

1. **Audio Transcription**: The spoken input is converted to text using speech recognition.

2. **Transcription Enhancement**: The VLLM corrects speech recognition errors, improves grammar and punctuation, and organizes information logically.

3. **Property Information Extraction**: Structured property data is extracted from the enhanced transcription.

4. **Tour Plan Generation**: A complete tour plan is generated based on the extracted information.

**Transcription Enhancement**

The VLLM enhances raw transcriptions by:

- Correcting common speech recognition errors
- Improving grammar and punctuation
- Organizing information into logical categories
- Extracting key property details
- Identifying rooms, features, and specifications

The enhanced transcription includes the improved text, confidence score, structured information breakdown, key points list, and segmented content.

**Property Information Extraction**

From the enhanced transcription, the system extracts and categorizes:

- Property type classification
- Location details (address, area, neighborhood)
- Specifications (room counts, dimensions, square footage)
- Features and amenities
- Price and financial information
- Special highlights and unique features

## Quality Assurance & Validation

### 1. AI Quality Checker

The AI quality assurance service validates all aspects of generated tours before publication.

**Tour Validation Process**

The validation system performs comprehensive checks across multiple dimensions:

1. **Tour Structure Validation**: Evaluates logical flow, completeness, and scene transitions
2. **Scene Quality Validation**: Assesses each scene's image quality and content
3. **Content Quality Validation**: Reviews descriptions, scripts, and metadata
4. **Technical Quality Validation**: Checks file formats, sizes, and compatibility

**Tour Structure Validation**

The structure validation evaluates:

- Logical progression from entrance through main areas
- Complete property coverage without missing key areas
- Appropriate transitions between scenes
- Balanced distribution of scene types
- Appropriate tour duration for property size

The VLLM reviews the tour structure and returns a validation result including pass/fail status, quality score (0-100), specific issues identified, and recommendations for improvement.

**Overall Assessment Generation**

The final assessment aggregates results from all validation categories using weighted scoring:

- **Structure**: 30% weight
- **Scenes**: 40% weight
- **Content**: 20% weight
- **Technical**: 10% weight

A tour passes validation when structure, scene, and content validations all succeed. The overall assessment compiles all issues and recommendations across categories, providing a comprehensive quality report.

**Validation Results**

Each validation produces a result containing:

- **Validity Status**: Boolean indicating pass or fail
- **Quality Score**: Numeric score from 0 to 100
- **Issues List**: Specific problems identified
- **Recommendations**: Suggested improvements
- **Category**: The validation type for weighted scoring

---

**Document Links**:
- [AI Features Overview](README.md) ← Previous: AI technology stack
- [Automatic Tour Creation](automatic-tour-creation.md) ← Current: AI-powered tour generation
- [Scene Detection](scene-detection.md) → Next: Scene analysis and optimization
- [Hotspot Placement](auto-hotspot-placement.md) → Intelligent hotspot suggestions
