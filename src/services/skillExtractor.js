import baseTaxonomy from '../data/skills.taxonomy.json'
import { AIService } from './aiService.js'

// Types
/**
 * @typedef {Object} TaxItem
 * @property {string} skill - The canonical skill name
 * @property {string[]} [aliases] - Alternative names for the skill
 * @property {"hard"|"soft"|"tool"} type - Skill type classification
 */

/**
 * @typedef {Object} ExtractedSkill
 * @property {string} name - The skill name
 * @property {number} importance - Importance score (0-1)
 * @property {string[]} synonyms - Alternative names
 * @property {boolean} critical - Whether marked as critical/required
 */

/**
 * @typedef {Object} SkillMatch
 * @property {string} skill - The skill name
 * @property {"strong"|"partial"|"missing"} status - Match status
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} [source] - Source of the skill match
 */

/**
 * @typedef {Object} SkillAnalysis
 * @property {string} jobId - Job identifier
 * @property {string} resumeId - Resume identifier
 * @property {ExtractedSkill[]} extractedJobSkills - Skills extracted from job
 * @property {string[]} resumeSkills - Skills from resume
 * @property {SkillMatch[]} matches - Individual skill matches
 * @property {Object} score - Overall score information
 * @property {Object} buckets - Skills grouped by match status
 * @property {string} generatedAt - ISO timestamp
 */

// Local storage key for skill overrides
const STORAGE_KEY = 'openJobSkillOverrides'

/**
 * Load local skill overrides from localStorage
 * @returns {TaxItem[]} Array of skill overrides
 */
function loadLocalOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch (error) {
    console.warn('Failed to load skill overrides:', error)
    return []
  }
}

/**
 * Normalize a string for consistent matching
 * @param {string} s - String to normalize
 * @returns {string} Normalized string
 */
function normalize(s) {
  return (s || '').trim().toLowerCase()
}

/**
 * Build taxonomy with de-duplication and alias merging
 * @param {TaxItem[]} base - Base taxonomy from JSON
 * @param {TaxItem[]} overrides - Local overrides from localStorage
 * @returns {{TAXONOMY: TaxItem[], ALIAS_MAP: Map<string, string>}} Built taxonomy and alias map
 */
function buildTaxonomy(base, overrides) {
  const byCanon = new Map()
  
  const push = (t) => {
    const k = normalize(t.skill)
    const cur = byCanon.get(k)
    
    if (!cur) {
      byCanon.set(k, {
        skill: t.skill, // Keep original case for display
        type: t.type || 'hard',
        aliases: (t.aliases || []).map(normalize).filter(Boolean)
      })
    } else {
      // Merge aliases and keep first non-softest type
      cur.aliases = Array.from(new Set([
        ...(cur.aliases || []),
        ...(t.aliases || []).map(normalize)
      ]))
      
      // Keep first non-softest type if they differ
      if (cur.type === 'soft' && t.type && t.type !== 'soft') {
        cur.type = t.type
      }
    }
  }
  
  base.forEach(push)
  overrides.forEach(push)
  
  const TAXONOMY = Array.from(byCanon.values())
  const ALIAS_MAP = new Map()
  
  // Build alias map for fast lookups
  for (const t of TAXONOMY) {
    ALIAS_MAP.set(normalize(t.skill), normalize(t.skill))
    ;(t.aliases || []).forEach(a => ALIAS_MAP.set(a, normalize(t.skill)))
  }
  
  return { TAXONOMY, ALIAS_MAP }
}

// Initialize taxonomy
let TAXONOMY, ALIAS_MAP

try {
  const overrides = loadLocalOverrides()
  const result = buildTaxonomy(baseTaxonomy, overrides)
  TAXONOMY = result.TAXONOMY
  ALIAS_MAP = result.ALIAS_MAP
} catch (error) {
  console.warn('Failed to initialize taxonomy with overrides, using base only:', error)
  const result = buildTaxonomy(baseTaxonomy, [])
  TAXONOMY = result.TAXONOMY
  ALIAS_MAP = result.ALIAS_MAP
}

/**
 * Rebuild taxonomy (call when overrides change)
 */
export function rebuildTaxonomy() {
  const overrides = loadLocalOverrides()
  const result = buildTaxonomy(baseTaxonomy, overrides)
  TAXONOMY = result.TAXONOMY
  ALIAS_MAP = result.ALIAS_MAP
  return result
}

/**
 * Upsert a skill to local overrides
 * @param {string} skill - Skill name
 * @param {string[]} aliases - Alternative names
 * @param {"hard"|"soft"|"tool"} type - Skill type
 * @returns {TaxItem[]} Updated overrides array
 */
export function upsertLocalSkill(skill, aliases = [], type = 'hard') {
  const k = normalize(skill)
  const overrides = loadLocalOverrides()
  const i = overrides.findIndex(x => normalize(x.skill) === k)
  
  const mergedAliases = Array.from(new Set([
    ...(aliases || []).map(normalize)
  ]))
  
  if (i >= 0) {
    // Update existing
    const cur = overrides[i]
    overrides[i] = {
      skill: k,
      type: cur.type || type,
      aliases: Array.from(new Set([
        ...(cur.aliases || []).map(normalize),
        ...mergedAliases
      ]))
    }
  } else {
    // Add new
    overrides.push({ skill: k, type, aliases: mergedAliases })
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  
  // Rebuild taxonomy
  rebuildTaxonomy()
  
  return overrides
}

/**
 * Extract skills from text using AI enhancement
 * @param {string} text - Text to extract skills from
 * @param {Object} aiConfig - AI configuration for enhanced extraction
 * @param {string} aiConfig.provider - AI provider (optional)
 * @param {Object} aiConfig.settings - AI provider settings (optional)
 * @param {boolean} aiConfig.enabled - Enable AI enhancement (default: false)
 * @returns {Promise<ExtractedSkill[]>} Array of extracted skills with AI enhancement
 */
export async function extractSkillsWithAI(text, aiConfig) {
  if (!aiConfig || !aiConfig.enabled) {
    throw new Error('AI analysis is not enabled')
  }
  
  if (!aiConfig.provider) {
    throw new Error('AI provider must be specified')
  }
  
  if (!aiConfig.settings) {
    throw new Error('AI provider settings must be provided')
  }
  
  try {
    // Stage 1: Taxonomy-based extraction (baseline)
    const taxonomySkills = extractSkillsFromText(text)
    
    // Stage 2: AI enhancement (required)
    let aiSkills = []
    try {
      aiSkills = await extractSkillsWithAIProvider(text, aiConfig.provider, aiConfig.settings)
    } catch (aiError) {
      console.error('AI analysis failed, falling back to taxonomy-only extraction:', aiError)
      
      // Return taxonomy skills with a warning that AI analysis failed
      return taxonomySkills
        .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))
        .slice(0, 35)
    }
    
    // Stage 3: Merge and deduplicate results
    const mergedSkills = mergeSkillResults(taxonomySkills, aiSkills)
    
    return mergedSkills
      .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))
      .slice(0, 40) // Increased from 35 to accommodate AI-enhanced results
      
  } catch (error) {
    console.error('Error in extractSkillsWithAI:', error)
    
    // Final fallback: return basic taxonomy extraction
    try {
      const fallbackSkills = extractSkillsFromText(text)
      console.warn('Using fallback taxonomy extraction due to AI analysis failure')
      return fallbackSkills
        .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))
        .slice(0, 35)
    } catch (fallbackError) {
      console.error('Even fallback extraction failed:', fallbackError)
      throw new Error(`Skill extraction failed completely: ${error.message}`)
    }
  }
}

/**
 * Extract skills using AI provider
 * @param {string} text - Text to extract skills from
 * @param {string} provider - AI provider
 * @param {Object} settings - AI provider settings
 * @returns {Promise<ExtractedSkill[]>} AI-extracted skills
 */
async function extractSkillsWithAIProvider(text, provider, settings) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text input is required and must be a string')
  }
  
  if (!provider) {
    throw new Error('AI provider is required')
  }
  
  if (!settings) {
    throw new Error('AI provider settings are required')
  }
  
  const prompt = `Analyze this job description and extract specific, granular skills. Extract only CONCRETE, ACTIONABLE skills that a candidate would list on their resume.

CRITICAL RULES:
1. Extract SPECIFIC TECHNOLOGIES, TOOLS, LANGUAGES - NOT categories or groups
2. Avoid generic terms like "Project Management" - instead extract "Scrum", "Agile", "JIRA", "Gantt Charts"
3. No duplicates or variations of the same skill
4. Maximum 25 skills to ensure quality over quantity
5. Prioritize skills that are explicitly mentioned or clearly implied

GOOD examples: "React", "Python", "AWS Lambda", "PostgreSQL", "Docker", "Scrum", "JIRA"
BAD examples: "Programming Languages", "Project Management", "Web Development", "Database Management"

Focus on:
- Programming languages (Python, JavaScript, Java)
- Frameworks & libraries (React, Django, Spring Boot) 
- Tools & platforms (Docker, Kubernetes, AWS, JIRA)
- Specific methodologies (Scrum, Agile, DevOps, CI/CD)
- Databases (PostgreSQL, MongoDB, Redis)
- Soft skills only if explicitly mentioned (Leadership, Communication)

Return a JSON object with a single key "skills" containing an array with items of this structure:
{
  "skills": [
    {
      "name": "React",
      "importance": 0.9,
      "critical": true,
      "category": "technical",
      "context": "explicit",
      "experienceLevel": "senior"
    }
  ]
}

Field specifications:
- name: Specific skill name (NOT a category)
- importance: 0.1-1.0 based on emphasis in job description
- critical: true if marked as required/must-have/essential
- category: "technical", "soft", "domain", "tool", "methodology"
- context: "explicit" (directly mentioned) or "implied" (inferred from context)
- experienceLevel: "junior", "mid", "senior", "expert", "any"

Job Description:
${text}

Return only the JSON object with the top-level key "skills". Do not include markdown code fences. Ensure there are NO duplicates and NO generic categories.`

  try {
    console.log(`Calling AI provider ${provider} for skill extraction`)
    const result = await AIService.generateContent(prompt, provider, settings)
    
    if (!result.success) {
      throw new Error(result.error || 'AI service returned unsuccessful result')
    }
    
    let aiSkills = []
    try {
      // Handle common response shapes across providers
      const data = result?.data ?? result
      let skillsData = null

      if (Array.isArray(data)) {
        // Top-level array returned
        skillsData = data
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.skills)) skillsData = data.skills
        else if (Array.isArray(data.data)) skillsData = data.data
        else if (Array.isArray(data.items)) skillsData = data.items
        else if (Array.isArray(data.result)) skillsData = data.result
        else if (Array.isArray(data.results)) skillsData = data.results
        else {
          // Some models may return an object of keyed skills
          const values = Object.values(data)
          if (values.length > 0 && values.every(v => typeof v === 'object')) {
            const possible = values.filter(v => v && (typeof v.name === 'string' || typeof v === 'string'))
            if (possible.length > 0) skillsData = possible
          }
        }
      } else if (typeof data === 'string' && data.trim()) {
        try {
          const parsed = JSON.parse(data)
          if (Array.isArray(parsed)) skillsData = parsed
          else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.skills)) skillsData = parsed.skills
        } catch {}
      }

      aiSkills = Array.isArray(skillsData) ? skillsData : []

      if (aiSkills.length === 0) {
        console.warn('AI returned empty skills array, this may indicate a parsing issue')
        return []
      }
      
      // Convert AI format to ExtractedSkill format
      let processedSkills = aiSkills.map(skill => {
        const isString = typeof skill === 'string'
        const name = isString ? skill : skill?.name
        const importance = !isString ? (skill?.importance || 0.5) : 0.5
        return {
          name,
          importance: Math.min(1, Math.max(0.1, importance)),
          synonyms: (!isString && Array.isArray(skill?.aliases)) ? skill.aliases : [],
          critical: !isString && !!skill?.critical,
          important: importance > 0.7,
          source: 'ai',
          category: !isString ? (skill?.category || 'technical') : 'technical',
          context: !isString ? (skill?.context || 'explicit') : 'explicit',
          experienceLevel: !isString ? (skill?.experienceLevel || 'any') : 'any'
        }
      })
      
      // Canonicalize and deduplicate against taxonomy to avoid redundancies
      processedSkills = deduplicateAISkillsWithTaxonomy(processedSkills)
      
      // Validate and filter skills
      processedSkills = processedSkills.filter(skill => 
        skill.name && 
        typeof skill.name === 'string' && 
        skill.name.trim().length > 0
      )
      
      console.log(`Successfully extracted ${processedSkills.length} skills from AI analysis`)
      return processedSkills
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('AI response data:', result)
      throw new Error(`Failed to parse AI response: ${parseError.message}`)
    }
    
  } catch (error) {
    console.error(`AI provider ${provider} failed:`, error)
    throw new Error(`AI analysis failed: ${error.message}`)
  }
}

/**
 * Deduplicate AI skills using taxonomy as the canonical reference
 * @param {ExtractedSkill[]} aiSkills - AI extracted skills
 * @returns {ExtractedSkill[]} Deduplicated and normalized skills
 */
function deduplicateAISkillsWithTaxonomy(aiSkills) {
  const canonicalSkills = new Map() // Map of canonical skill -> best AI match
  const lowQualityPatterns = [
    /^(managing|management|coordination|developing|development|working|experience|knowledge|understanding|ability|skills?)$/i,
    /^(various|multiple|different|several|many)$/i,
    /^(projects?|tasks?|activities?|responsibilities?|duties?)$/i
  ]

  aiSkills.forEach(aiSkill => {
    const aiSkillName = aiSkill.name.trim()
    const normalizedAI = normalize(aiSkillName)
    
    // Skip very short or low-quality skills
    if (aiSkillName.length < 3 || lowQualityPatterns.some(pattern => pattern.test(aiSkillName))) {
      return
    }
    
    // Find best taxonomy match for this AI skill
    let bestTaxonomyMatch = null
    let bestMatchScore = 0
    
    for (const taxonomyItem of TAXONOMY) {
      const canonicalName = normalize(taxonomyItem.skill)
      const aliases = (taxonomyItem.aliases || []).map(normalize)
      const allVariants = [canonicalName, ...aliases]
      
      for (const variant of allVariants) {
        const similarity = calculateTaxonomyMatchScore(normalizedAI, variant, aiSkillName, taxonomyItem.skill)
        
        if (similarity > bestMatchScore && similarity > 0.7) { // Threshold for matching
          bestMatchScore = similarity
          bestTaxonomyMatch = {
            canonical: taxonomyItem.skill,
            normalized: canonicalName,
            matchScore: similarity,
            taxonomyItem
          }
        }
      }
    }
    
    if (bestTaxonomyMatch) {
      // Use taxonomy canonical name
      const canonical = bestTaxonomyMatch.canonical
      const existing = canonicalSkills.get(canonical)
      
      if (!existing || aiSkill.importance > existing.importance) {
        canonicalSkills.set(canonical, {
          ...aiSkill,
          name: canonical, // Use canonical taxonomy name
          source: 'ai-normalized',
          confidence: 0.9, // High confidence due to taxonomy match
          taxonomyMatched: true,
          originalAIName: aiSkillName
        })
      }
    } else {
      // No taxonomy match - keep as AI-only skill but check for duplicates with other AI skills
      const existing = Array.from(canonicalSkills.values()).find(existing => 
        existing.source === 'ai-only' && calculateSkillSimilarity(normalizedAI, normalize(existing.name)) > 0.8
      )
      
      if (!existing || aiSkill.importance > existing.importance) {
        // Remove any existing similar AI-only skill
        if (existing) {
          for (const [key, value] of canonicalSkills.entries()) {
            if (value === existing) {
              canonicalSkills.delete(key)
              break
            }
          }
        }
        
        canonicalSkills.set(aiSkillName, {
          ...aiSkill,
          source: 'ai-only',
          confidence: 0.7, // Lower confidence for non-taxonomy skills
          taxonomyMatched: false
        })
      }
    }
  })
  
  return Array.from(canonicalSkills.values())
    .sort((a, b) => {
      // Prioritize taxonomy-matched skills, then by importance
      if (a.taxonomyMatched !== b.taxonomyMatched) {
        return b.taxonomyMatched ? 1 : -1
      }
      return b.importance - a.importance
    })
    .slice(0, 25) // Reasonable limit
}

/**
 * Calculate match score between AI skill and taxonomy entry
 * @param {string} aiSkillNorm - Normalized AI skill name
 * @param {string} taxonomyVariant - Normalized taxonomy variant
 * @param {string} aiSkillOriginal - Original AI skill name
 * @param {string} taxonomyOriginal - Original taxonomy skill name
 * @returns {number} Match score 0-1
 */
function calculateTaxonomyMatchScore(aiSkillNorm, taxonomyVariant, aiSkillOriginal, taxonomyOriginal) {
  // Exact match (highest score)
  if (aiSkillNorm === taxonomyVariant) return 1.0
  
  // Substring match - prefer longer matches
  if (aiSkillNorm.includes(taxonomyVariant) || taxonomyVariant.includes(aiSkillNorm)) {
    const shorter = Math.min(aiSkillNorm.length, taxonomyVariant.length)
    const longer = Math.max(aiSkillNorm.length, taxonomyVariant.length)
    return 0.85 + (shorter / longer) * 0.1 // 0.85-0.95 range
  }
  
  // Word-based similarity
  const aiWords = aiSkillOriginal.split(/[\s\-_\.]+/).filter(w => w.length > 2).map(normalize)
  const taxWords = taxonomyOriginal.split(/[\s\-_\.]+/).filter(w => w.length > 2).map(normalize)
  
  if (aiWords.length === 0 || taxWords.length === 0) return 0
  
  const commonWords = aiWords.filter(w => taxWords.includes(w))
  const totalWords = new Set([...aiWords, ...taxWords]).size
  const overlap = commonWords.length / totalWords
  
  // Only consider it a match if significant overlap
  return overlap >= 0.5 ? overlap * 0.8 : 0 // Max 0.8 for word matches
}

/**
 * Legacy function - kept for backward compatibility
 */
function deduplicateAISkills(skills) {
  const skillMap = new Map()
  const lowQualityPatterns = [
    /^(managing|management|coordination|developing|development|working|experience|knowledge|understanding|ability|skills?)$/i,
    /^(various|multiple|different|several|many)$/i,
    /^(projects?|tasks?|activities?|responsibilities?|duties?)$/i
  ]

  skills.forEach(skill => {
    const skillName = skill.name.trim()
    const normalizedName = normalize(skillName)
    
    // Skip very short skills (likely incomplete)
    if (skillName.length < 3) return
    
    // Skip generic/low-quality skills
    if (lowQualityPatterns.some(pattern => pattern.test(skillName))) return
    
    // Check for existing similar skills
    let bestMatch = null
    let bestMatchKey = null
    
    for (const [existingKey, existingSkill] of skillMap.entries()) {
      const similarity = calculateSkillSimilarity(normalizedName, existingKey)
      
      // If very similar (substring relationship or high similarity)
      if (similarity > 0.8) {
        bestMatch = existingSkill
        bestMatchKey = existingKey
        break
      }
    }
    
    if (bestMatch) {
      // Keep the more specific/longer skill name
      if (skillName.length > bestMatch.name.length || skill.importance > bestMatch.importance) {
        skillMap.delete(bestMatchKey)
        skillMap.set(normalizedName, {
          ...skill,
          importance: Math.max(skill.importance, bestMatch.importance),
          critical: skill.critical || bestMatch.critical
        })
      }
      // Otherwise keep existing skill (don't add duplicate)
    } else {
      // New unique skill
      skillMap.set(normalizedName, skill)
    }
  })
  
  return Array.from(skillMap.values())
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 20) // Limit to top 20 AI skills
}

/**
 * Calculate similarity between two skill names
 * @param {string} skill1 - First skill (normalized)
 * @param {string} skill2 - Second skill (normalized)
 * @returns {number} Similarity score 0-1
 */
function calculateSkillSimilarity(skill1, skill2) {
  // Exact match
  if (skill1 === skill2) return 1.0
  
  // Substring relationship (e.g., "Simultaneous" vs "Simultaneous Projects")
  if (skill1.includes(skill2) || skill2.includes(skill1)) {
    const shorter = Math.min(skill1.length, skill2.length)
    const longer = Math.max(skill1.length, skill2.length)
    return shorter / longer // Higher score for closer lengths
  }
  
  // Word overlap (e.g., "Project Management" vs "Project Planning")
  const words1 = skill1.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  const words2 = skill2.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const commonWords = words1.filter(w1 => words2.includes(w1))
  const totalWords = new Set([...words1, ...words2]).size
  
  return commonWords.length / totalWords
}

/**
 * Merge taxonomy and AI skill results with deduplication
 * @param {ExtractedSkill[]} taxonomySkills - Skills from taxonomy extraction
 * @param {ExtractedSkill[]} aiSkills - Skills from AI extraction
 * @returns {ExtractedSkill[]} Merged and deduplicated skills
 */
function mergeSkillResults(taxonomySkills, aiSkills) {
  const skillMap = new Map()
  
  // Add taxonomy skills (baseline confidence)
  taxonomySkills.forEach(skill => {
    const key = normalize(skill.name)
    skillMap.set(key, {
      ...skill,
      source: 'taxonomy',
      confidence: 0.8 // High confidence for taxonomy matches
    })
  })
  
  // Add or enhance with AI skills
  aiSkills.forEach(aiSkill => {
    const key = normalize(aiSkill.name)
    const existing = skillMap.get(key)
    
    if (existing) {
      // Enhance existing taxonomy skill with AI insights
      skillMap.set(key, {
        ...existing,
        importance: Math.max(existing.importance, aiSkill.importance),
        critical: existing.critical || aiSkill.critical,
        source: 'hybrid',
        confidence: 0.95, // Highest confidence for confirmed matches
        category: aiSkill.category || existing.category,
        context: aiSkill.context || 'explicit',
        experienceLevel: aiSkill.experienceLevel || 'any'
      })
    } else {
      // Add new AI-discovered skill
      skillMap.set(key, {
        ...aiSkill,
        confidence: 0.7 // Lower confidence for AI-only skills
      })
    }
  })
  
  return Array.from(skillMap.values())
}

/**
 * Extract skills from text using the taxonomy
 * @param {string} text - Text to extract skills from
 * @returns {ExtractedSkill[]} Array of extracted skills
 */
export function extractSkillsFromText(text) {
  if (!text || typeof text !== 'string') return []
  
  try {
    const lc = text.toLowerCase()
    
    // For job descriptions, focus on likely sections but be more comprehensive
    const isJobDescription = lc.includes('requirement') || 
                           lc.includes('qualification') || 
                           lc.includes('responsibility') ||
                           lc.includes('will be a plus') ||
                           lc.includes('skills') ||
                           lc.includes('experience')
    
    let searchSpace = lc
    
    if (isJobDescription) {
      // More comprehensive section detection
      const sections = lc.split(/\n+/).filter(line => 
        line.match(/requirement|qualification|responsibilit|skill|experience|•|\-|\*|plus|ability|knowledge|understanding|proficiency|expertise|competency|capability|strength|advantage|bonus|preferred|desired|ideal/)
      )
      searchSpace = sections.join('\n') || lc
    }
    
         const criticalHints = ['must have', 'required', 'strong', 'at least', 'proven', 'hands-on', 'essential', 'critical', 'key', 'core']
     const importantHints = ['good', 'excellent', 'profound', 'possessing', 'ability', 'capability', 'understanding', 'knowledge']
     
     // Track which skills have already been detected to avoid duplicates
     // Once a skill (or its alias) is detected, all variants are marked as detected
     // This prevents counting the same skill multiple times
     const detectedSkills = new Set()
     const results = []
     
     // Debug: Check if taxonomy is loaded
     if (!TAXONOMY || !Array.isArray(TAXONOMY)) {
       console.error('TAXONOMY is not properly initialized:', TAXONOMY)
       return []
     }
     
     console.log('Taxonomy loaded:', TAXONOMY.length, 'skills')
     console.log('Search space length:', searchSpace.length)
     
     TAXONOMY.forEach(t => {
       try {
         // Skip if this skill or any of its aliases have already been detected
         const skillKey = normalize(t.skill)
         const allVariants = [skillKey, ...(t.aliases || []).map(normalize)]
         
         // Check if any variant of this skill has already been detected
         if (allVariants.some(variant => detectedSkills.has(variant))) {
           return
         }
         
         const names = [skillKey, ...(t.aliases || []).map(normalize)]
         let hits = 0
         let critical = false
         let important = false
         let bestMatch = null
         
         names.forEach(n => {
           try {
             // More flexible regex matching
             const r = new RegExp(`(?<![a-z0-9])${n.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?![a-z0-9])`, 'gi')
             const matchAll = searchSpace.match(r)
             if (matchAll) {
               hits += matchAll.length
               // Track which variant had the best match for importance calculation
               if (!bestMatch || matchAll.length > bestMatch.count) {
                 bestMatch = { variant: n, count: matchAll.length }
               }
             }
             
             // Proximity check for critical hints within 60 chars (increased from 40)
             const escapedN = n.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
             const prox = new RegExp(`(.{0,60})${escapedN}(.{0,60})`, 'gi')
             let m
             
             while ((m = prox.exec(searchSpace)) !== null) {
               const window = `${m[1]} ${m[2]}`
               if (criticalHints.some(h => window.includes(h))) {
                 critical = true
                 break
               }
               if (importantHints.some(h => window.includes(h))) {
                 important = true
               }
             }
           } catch (regexError) {
             console.warn(`Regex error for skill "${n}":`, regexError)
           }
         })
         
         if (hits > 0) {
           // Enhanced importance calculation
           let importance = 0.3 + hits * 0.15
           if (critical) importance += 0.3
           if (important) importance += 0.2
           
           console.log('Skill detected:', t.skill, 'hits:', hits, 'critical:', critical, 'important:', important)
           
           results.push({
             name: t.skill,
             importance: Math.min(1, importance),
             synonyms: t.aliases || [],
             critical,
             important,
             bestMatch: bestMatch?.variant || skillKey
           })
           
           // Mark all variants of this skill as detected
           allVariants.forEach(variant => detectedSkills.add(variant))
         }
       } catch (skillError) {
         console.warn(`Error processing skill "${t.skill}":`, skillError)
       }
     })
    
         // Sort by importance then alphabetically, cap to 35 (increased from 25)
     console.log('Final results:', results.length, 'skills detected')
     return results
       .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name))
       .slice(0, 35)
      
  } catch (error) {
    console.error('Error in extractSkillsFromText:', error)
    return []
  }
}

/**
 * Extract skills from resume text
 * @param {string} text - Resume text to extract skills from
 * @returns {string[]} Array of skill names
 */
export function extractFromResume(text) {
  const extracted = extractSkillsFromText(text)
  return extracted.map(s => s.name)
}

/**
 * Extract skills from job description with optional AI enhancement
 * @param {string} text - Job description text  
 * @param {Object} aiConfig - AI configuration for enhanced extraction
 * @returns {Promise<ExtractedSkill[]>} Array of extracted skills
 */
export async function extractFromJobDescription(text, aiConfig = { enabled: false }) {
  if (aiConfig.enabled) {
    return await extractSkillsWithAI(text, aiConfig)
  }
  return extractSkillsFromText(text)
}

/**
 * Compare job skills with resume skills
 * @param {ExtractedSkill[]} jobSkills - Skills from job description
 * @param {string[]} resumeSkills - Skills from resume
 * @returns {SkillMatch[]} Array of skill matches with status
 */
export function compareSkills(jobSkills, resumeSkills) {
  const resumeSet = new Set(resumeSkills.map(normalize))
  const matches = []
  
  let strong = 0, partial = 0, missing = 0
  
  jobSkills.forEach(js => {
    const weight = js.critical ? 2 : 1
    const expanded = expandWithSynonyms(js.name)
    const exact = expanded.find(s => resumeSet.has(s))
    
    if (exact) {
      strong += weight
      matches.push({
        skill: js.name,
        status: 'strong',
        confidence: 0.9,
        source: 'skills'
      })
    } else {
      // Enhanced fuzzy/partial matching with semantic similarity
      const partialMatches = [...resumeSet].filter(rs => {
        const jobSkillNorm = normalize(js.name)
        const resumeSkillNorm = rs
        
        // Existing containment checks
        if (rs.includes(jobSkillNorm) || jobSkillNorm.includes(rs)) {
          return true
        }
        
        // Synonym expansion checks
        if (expanded.some(e => rs.includes(e) || e.includes(rs))) {
          return true
        }
        
        // Enhanced similarity checks
        return checkEnhancedSimilarity(jobSkillNorm, resumeSkillNorm)
      })
      
      if (partialMatches.length > 0) {
        partial += weight
        // Calculate confidence based on match quality
        const maxConfidence = Math.max(...partialMatches.map(pm => 
          calculateMatchConfidence(normalize(js.name), pm)
        ))
        
        matches.push({
          skill: js.name,
          status: 'partial',
          confidence: Math.max(0.4, Math.min(0.8, maxConfidence)),
          partialMatches: partialMatches
        })
      } else {
        missing += weight
        matches.push({
          skill: js.name,
          status: 'missing',
          confidence: 0
        })
      }
    }
  })
  
  return matches
}

/**
 * Expand skill with synonyms using the taxonomy
 * @param {string} skill - Skill name to expand
 * @returns {string[]} Array of skill name and synonyms
 */
function expandWithSynonyms(skill) {
  const key = normalize(skill)
  const known = TAXONOMY.find(t => normalize(t.skill) === key)
  const fromKnown = known?.aliases?.map(normalize) || []
  return [key, ...fromKnown]
}

/**
 * Get current taxonomy for external use
 * @returns {TaxItem[]} Current taxonomy
 */
export function getCurrentTaxonomy() {
  return TAXONOMY
}

/**
 * Get current alias map for external use
 * @returns {Map<string, string>} Current alias map
 */
export function getCurrentAliasMap() {
  return ALIAS_MAP
}

/**
 * Check enhanced similarity between two skill terms
 * @param {string} skill1 - First skill (normalized)
 * @param {string} skill2 - Second skill (normalized)
 * @returns {boolean} Whether skills are similar enough for partial match
 */
function checkEnhancedSimilarity(skill1, skill2) {
  // Skip very short terms to avoid false matches
  if (skill1.length < 3 || skill2.length < 3) {
    return false
  }
  
  // Word-based similarity (e.g., "react native" vs "react")
  const words1 = skill1.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  const words2 = skill2.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  
  // Check if any significant words overlap
  const commonWords = words1.filter(w1 => 
    words2.some(w2 => w1.includes(w2) || w2.includes(w1))
  )
  
  if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.5) {
    return true
  }
  
  // Technology stack relationships
  const techRelationships = {
    'javascript': ['js', 'typescript', 'ts', 'node', 'nodejs', 'react', 'vue', 'angular'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'java': ['spring', 'hibernate', 'maven', 'gradle'],
    'docker': ['container', 'containerization', 'kubernetes', 'k8s'],
    'aws': ['amazon', 'cloud', 'ec2', 's3', 'lambda'],
    'react': ['jsx', 'redux', 'nextjs', 'gatsby'],
    'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'nosql'],
    'testing': ['jest', 'mocha', 'junit', 'selenium', 'cypress']
  }
  
  // Check technology relationships
  for (const [tech, related] of Object.entries(techRelationships)) {
    if ((skill1.includes(tech) && related.some(r => skill2.includes(r))) ||
        (skill2.includes(tech) && related.some(r => skill1.includes(r)))) {
      return true
    }
  }
  
  // Edit distance for similar spellings (allow 1-2 character differences for longer terms)
  if (skill1.length >= 5 && skill2.length >= 5) {
    const editDistance = calculateEditDistance(skill1, skill2)
    const maxAllowed = Math.max(1, Math.floor(Math.max(skill1.length, skill2.length) * 0.2))
    return editDistance <= maxAllowed
  }
  
  return false
}

/**
 * Calculate match confidence for partial matches
 * @param {string} jobSkill - Job skill (normalized)
 * @param {string} resumeSkill - Resume skill (normalized)
 * @returns {number} Confidence score 0-1
 */
function calculateMatchConfidence(jobSkill, resumeSkill) {
  // Exact substring match (highest confidence)
  if (resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)) {
    const longer = Math.max(jobSkill.length, resumeSkill.length)
    const shorter = Math.min(jobSkill.length, resumeSkill.length)
    return 0.7 + (shorter / longer) * 0.2 // 0.7-0.9 range
  }
  
  // Word overlap confidence
  const words1 = jobSkill.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  const words2 = resumeSkill.split(/[\s\-_\.]+/).filter(w => w.length > 2)
  const commonWords = words1.filter(w1 => words2.some(w2 => w1 === w2))
  
  if (commonWords.length > 0) {
    const overlapRatio = commonWords.length / Math.max(words1.length, words2.length)
    return 0.5 + overlapRatio * 0.3 // 0.5-0.8 range
  }
  
  // Technology relationship confidence
  if (checkEnhancedSimilarity(jobSkill, resumeSkill)) {
    return 0.6 // Medium confidence for related technologies
  }
  
  return 0.4 // Default low confidence
}

/**
 * Calculate edit distance between two strings (Levenshtein distance)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function calculateEditDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,      // deletion
        matrix[j - 1][i] + 1,      // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  
  return matrix[str2.length][str1.length]
}

