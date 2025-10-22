export class AIService {
  static MARITACA_BASE_URL = 'https://chat.maritaca.ai/api'

  // Try multiple strategies to parse slightly malformed JSON reliably
  static parseJsonFlexible(content) {
    if (typeof content !== 'string') return content
    let text = content.trim()
    // Strip common fences
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '')

    // First try a direct parse
    try { return JSON.parse(text) } catch {}

    // Try to extract first JSON object
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) {
      const candidate = objMatch[0]
      try { return JSON.parse(candidate) } catch {}
    }

    // Fix common trailing commas and whitespace
    let repaired = text
      .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
      .replace(/\s+\n/g, '\n')
    try { return JSON.parse(repaired) } catch (e1) {}

    // Escape unescaped newlines inside quoted strings
    // Walk the string; when inside a JSON string, replace raw \n/\r with \n
    let out = ''
    let inStr = false
    let escaped = false
    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i]
      if (!inStr) {
        if (ch === '"') { inStr = true; out += ch; continue }
        out += ch; continue
      }
      // inside string
      if (escaped) {
        out += ch; escaped = false; continue
      }
      if (ch === '\\') { out += ch; escaped = true; continue }
      if (ch === '"') { out += ch; inStr = false; continue }
      if (ch === '\n') { out += '\\n'; continue }
      if (ch === '\r') { out += '\\r'; continue }
      out += ch
    }

    try { return JSON.parse(out) } catch (e) {
      console.error('Flexible JSON parse failed', e, '\nRaw:', content)
      throw e
    }
  }

  static async testConnection(provider, settings) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return await this.testOpenAI(settings.apiKey, settings.model)
        
      case 'gemini':
        return await this.testGemini(settings.apiKey)
        
      case 'ollama':
        return await this.testOllama(settings.host)
        
      case 'maritaca':
        return await this.testMaritaca(settings.apiKey, settings.baseUrl)
        
      case 'custom':
        return await this.testCustomProvider(settings.baseUrl, settings.apiKey, settings.headers)
        
      default:
        return {
          success: false,
          error: `Unsupported provider: ${provider}`
        }
    }
  }

  static async testOpenAI(apiKey, model) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return {
        success: true,
        models: data.data.map(model => ({
          id: model.id,
          name: model.id,
          created: model.created
        }))
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async testGemini(apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return {
        success: true,
        models: data.models
          .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
          .map(model => ({
            id: model.name.split('/').pop(),
            name: model.displayName || model.name.split('/').pop(),
            description: model.description
          }))
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async validateOllamaModel(host, model) {
    try {
      if (!host || !host.startsWith('http')) {
        return { success: false, error: 'Invalid host URL' }
      }
      
      if (!model) {
        return { success: false, error: 'Model name is required' }
      }
      
      console.log(`Validating Ollama model: ${model} at ${host}`)
      
      // First, try to get the list of available models
      const listResponse = await fetch(`${host}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (!listResponse.ok) {
        const errorText = await listResponse.text().catch(() => 'Unknown error')
        return { 
          success: false, 
          error: `Failed to get model list: ${listResponse.status} ${listResponse.statusText} - ${errorText}` 
        }
      }
      
      const listData = await listResponse.json()
      if (!listData || !listData.models) {
        return { success: false, error: 'Invalid response from Ollama API when getting model list' }
      }
      
      // Check if the model exists in the list
      const availableModels = listData.models.map(m => m.name)
      console.log('Available models:', availableModels)
      
      // Try exact match first
      if (availableModels.includes(model)) {
        return { 
          success: true, 
          model: { name: model },
          message: `Model '${model}' is available and ready to use`
        }
      }
      
      // Try partial matches (in case of version differences)
      const partialMatches = availableModels.filter(m => 
        m.includes(model) || model.includes(m) || 
        m.replace(/[:\.]/g, '').includes(model.replace(/[:\.]/g, ''))
      )
      
      if (partialMatches.length > 0) {
        console.log('Found partial matches:', partialMatches)
        // Use the first partial match
        const bestMatch = partialMatches[0]
        return { 
          success: true, 
          model: { name: bestMatch },
          message: `Model '${model}' matched to available model '${bestMatch}'`
        }
      }
      
      // If no matches found, try the /api/show endpoint as a fallback
      try {
        const showResponse = await fetch(`${host}/api/show`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: model }),
          signal: AbortSignal.timeout(5000)
        })
        
        if (showResponse.ok) {
          const showData = await showResponse.json()
          if (showData.model) {
            return { 
              success: true, 
              model: showData.model,
              message: `Model '${model}' is available and ready to use`
            }
          }
        }
      } catch (showError) {
        console.log('Show endpoint failed, continuing with list-based validation')
      }
      
      // No matches found
      return { 
        success: false, 
        error: `Model '${model}' not found. Available models: ${availableModels.join(', ')}. Use 'ollama pull ${model}' to download it.` 
      }
      
    } catch (error) {
      console.error('Model validation error:', error)
      if (error.name === 'AbortError') {
        return { success: false, error: 'Model validation timed out' }
      }
      return { success: false, error: error.message }
    }
  }

  static async testOllama(host) {
    try {
      // Validate host URL
      if (!host || !host.startsWith('http')) {
        throw new Error('Invalid host URL. Must start with http:// or https://')
      }
      
      console.log(`Testing Ollama connection at ${host}`)
      
      // Test basic connectivity first
      const testResponse = await fetch(`${host}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })
      
      if (!testResponse.ok) {
        if (testResponse.status === 404) {
          throw new Error('Ollama API endpoint not found. Make sure Ollama is running and accessible.')
        } else if (testResponse.status === 0) {
          throw new Error('Connection refused. Make sure Ollama is running on the specified host.')
        } else {
          const errorText = await testResponse.text().catch(() => 'Unknown error')
          throw new Error(`Ollama API error: ${testResponse.status} ${testResponse.statusText} - ${errorText}`)
        }
      }
      
      const data = await testResponse.json()
      
      // Validate response structure
      if (!data || !data.models) {
        throw new Error('Invalid response from Ollama API. Expected models array.')
      }
      
      if (!Array.isArray(data.models)) {
        throw new Error('Invalid response format from Ollama API. Models should be an array.')
      }
      
      console.log(`Successfully connected to Ollama. Found ${data.models.length} models.`)
      
      return {
        success: true,
        models: data.models.map(model => ({
          id: model.name,
          name: model.name,
          size: model.size,
          modified_at: model.modified_at
        }))
      }
    } catch (error) {
      console.error('Ollama connection test failed:', error)
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Connection timeout. Ollama may not be running or accessible. Check if Ollama is running on the specified host.'
        }
      } else if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Network error. Check if Ollama is running and the host is correct. Common hosts: http://localhost:11434 or http://127.0.0.1:11434'
        }
      } else if (error.message.includes('CORS')) {
        return {
          success: false,
          error: 'CORS error. Make sure Ollama allows requests from this origin. You may need to configure Ollama with --host 0.0.0.0'
        }
      } else if (error.message.includes('Connection refused')) {
        return {
          success: false,
          error: 'Connection refused. Make sure Ollama is running. Start Ollama with: ollama serve'
        }
      } else {
        return {
          success: false,
          error: error.message
        }
      }
    }
  }

  static async testCustomProvider(baseUrl, apiKey, headers = {}) {
    try {
      // Try OpenAI-compatible endpoints first
      const modelsEndpoint = `${baseUrl}/v1/models`
      
      const response = await fetch(modelsEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...headers
        },
      })
      
      if (!response.ok) {
        throw new Error(`Custom provider API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return {
        success: true,
        models: data.data ? data.data.map(model => ({
          id: model.id,
          name: model.id,
          created: model.created
        })) : []
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async testMaritaca(apiKey, baseUrl = null) {
    const maritacaUrl = baseUrl || this.MARITACA_BASE_URL
    
    try {
      // Try multiple endpoints to get models
      const endpoints = [
        `${maritacaUrl}/v1/models`,
        `${maritacaUrl}/models`,
        `${maritacaUrl}/v1/engines`
      ]
      
      let modelsData = null
      let lastError = null
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            console.log(`Successfully fetched models from ${endpoint}:`, data)
            
            // Handle different response formats
            if (data.data && Array.isArray(data.data)) {
              modelsData = data.data
            } else if (data.models && Array.isArray(data.models)) {
              modelsData = data.models
            } else if (Array.isArray(data)) {
              modelsData = data
            }
            
            if (modelsData && modelsData.length > 0) {
              break
            }
          } else {
            lastError = `${response.status}: ${response.statusText}`
          }
        } catch (endpointError) {
          lastError = endpointError.message
          continue
        }
      }
      
      // If no models found from endpoints, try a test completion to verify API key
      if (!modelsData || modelsData.length === 0) {
        console.log('No models found from endpoints, testing with completion...')
        
        const testModels = ['sabia-2-medium', 'sabia-2-small', 'sabia-3', 'maritalk']
        let workingModel = null
        
        for (const testModel of testModels) {
          try {
            const response = await fetch(`${maritacaUrl}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: testModel,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
              })
            })
            
            if (response.ok) {
              workingModel = testModel
              console.log(`Successfully tested model: ${testModel}`)
              break
            }
          } catch (testError) {
            continue
          }
        }
        
        if (workingModel) {
          // Return available Maritaca models based on current knowledge
          return {
            success: true,
            models: [
              { id: 'sabia-2-medium', name: 'Sabia 2 Medium' },
              { id: 'sabia-2-small', name: 'Sabia 2 Small' },
              { id: 'sabia-3', name: 'Sabia 3' },
              { id: 'maritalk', name: 'Maritalk' }
            ]
          }
        } else {
          throw new Error(`Maritaca API error: ${lastError || 'Unable to verify connection'}`)
        }
      }
      
      // Process the models data
      const processedModels = modelsData.map(model => {
        if (typeof model === 'string') {
          return { id: model, name: model }
        } else {
          return {
            id: model.id || model.name || model.model,
            name: model.name || model.display_name || model.id || model.model,
            created: model.created,
            description: model.description
          }
        }
      })
      
      return {
        success: true,
        models: processedModels.filter(model => model.id) // Filter out invalid models
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async parseCV(cvText, provider, settings) {
    const prompt = `You are a JSON generator. Output ONLY a single JSON object that matches the schema below. Do not include any prose, markdown, or code fences. Response must begin with "{" and end with "}". If a value is unknown, use empty string "" or empty array []. Do not invent extra keys.

{
  "personal_information": {
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website_portfolio": "",
    "professional_summary": ""
  },
  "work_experience": [
    {
      "job_title": "",
      "company": "",
      "start_date": "YYYY-MM or empty string",
      "end_date": "YYYY-MM or empty string",
      "key_achievements_responsibilities": [
        ""
      ]
    }
  ],
  "education": [
    {
      "school_university": "",
      "field_of_study": "",
      "degree": "",
      "gpa": "",
      "start_date": "YYYY-MM or empty string",
      "end_date": "YYYY-MM or empty string"
    }
  ],
  "skills": [
    {
      "category": "",
      "items": [
        ""
      ]
    }
  ]
}

ReturnRules:
- JSON only; no backticks/code fences; no text before or after the JSON
- No additional properties beyond the keys shown in the schema
- Dates must be "YYYY-MM" or ""
- "current" must be boolean true/false

InputCV:
${cvText}`;

    // Define the structured output schema for the requested format
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        personal_information: {
          type: "object",
          additionalProperties: false,
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            linkedin: { type: "string" },
            website_portfolio: { type: "string" },
            professional_summary: { type: "string" }
          },
          required: ["full_name", "email", "phone", "location", "linkedin", "website_portfolio", "professional_summary"]
        },
        work_experience: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              job_title: { type: "string" },
              company: { type: "string" },
              start_date: { type: "string" },
              end_date: { type: "string" },
              key_achievements_responsibilities: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["job_title", "company", "start_date", "end_date", "key_achievements_responsibilities"]
          }
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              school_university: { type: "string" },
              field_of_study: { type: "string" },
              degree: { type: "string" },
              gpa: { type: "string" },
              start_date: { type: "string" },
              end_date: { type: "string" }
            },
            required: ["school_university", "field_of_study", "degree", "gpa", "start_date", "end_date"]
          }
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              category: { type: "string" },
              items: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["category", "items"]
          }
        }
      },
      required: ["personal_information", "work_experience", "education", "skills"]
    };

    try {
      console.log('Parsing CV with provider:', provider, 'model:', settings.model)
      
      let result
      try {
        // Try structured output first
        switch (provider.toLowerCase()) {
          case 'openai':
            result = await this.callOpenAIStructured(prompt, settings.apiKey, settings.model, schema)
            break
          case 'gemini':
            result = await this.callGeminiStructured(prompt, settings.apiKey, settings.model, schema)
            break
          case 'ollama':
            // Ollama doesn't support structured outputs, use regular method with improved prompt
            result = await this.callOllama(prompt, settings.host, settings.model, settings._ollama)
            break
          case 'maritaca':
            result = await this.callMaritacaStructured(prompt, settings.apiKey, settings.model, schema)
            break
          case 'custom':
            result = await this.callCustomProviderStructured(prompt, settings.baseUrl, settings.apiKey, settings.model, schema)
            break
          default:
            throw new Error(`Unsupported provider: ${provider}`)
        }
      } catch (structuredError) {
        console.log('Structured output failed, trying regular method:', structuredError.message)
        
        // Fallback to regular method if structured output fails
        switch (provider.toLowerCase()) {
          case 'openai':
            result = await this.callOpenAI(prompt, settings.apiKey, settings.model)
            break
          case 'gemini':
            result = await this.callGemini(prompt, settings.apiKey, settings.model)
            break
          case 'ollama':
            result = await this.callOllama(prompt, settings.host, settings.model, settings._ollama)
            break
          case 'maritaca':
            result = await this.callMaritaca(prompt, settings.apiKey, settings.model)
            break
          case 'custom':
            result = await this.callCustomProvider(prompt, settings.baseUrl, settings.apiKey, settings.model)
            break
          default:
            throw new Error(`Unsupported provider: ${provider}`)
        }
      }
      
      console.log('AI parsing result:', result)
      
      // Validate and convert the result to proper format
      if (result.success && result.data) {
        // Convert from new schema to the app's internal structure
        const normalized = this.mapNewSchemaToInternal(result.data)
        const convertedData = this.convertCVDataToProperFormat(normalized)
        return {
          success: true,
          data: convertedData
        }
      }
      
      return result
    } catch (error) {
      console.error('CV parsing error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  static async callOpenAI(prompt, apiKey, model) {
    // Determine which parameter to use based on the model
    const isNewerModel = model && (model.includes('gpt-5') || model.includes('gpt-4o') || model.includes('gpt-4-turbo-2024'))
    
    const requestBody = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      // Strongly enforce JSON output without requiring json_schema support
      response_format: { type: 'json_object' }
    }
    
    // Use max_completion_tokens for newer models, max_tokens for older ones
    if (isNewerModel) {
      requestBody.max_completion_tokens = 2000
      // Some models only support default temperature; omit to avoid 400 errors
    } else {
      requestBody.max_tokens = 2000
      // Omit temperature entirely for broad compatibility
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(`OpenAI API error: ${errorMessage}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content?.trim?.() || ''

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    try {
      return { success: true, data: this.parseJsonFlexible(content) }
    } catch (e) {
      throw new Error('OpenAI returned non-JSON content.')
    }
  }

  static async callOpenAIStructured(prompt, apiKey, model, schema) {
    const requestBody = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cv_parsing",
          schema: schema,
          strict: true
        }
      }
      // Omit temperature for compatibility across models
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(`OpenAI API error: ${errorMessage}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    return {
      success: true,
      data: JSON.parse(content)
    }
  }

  static async callGemini(prompt, apiKey, model) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data: this.parseJsonFlexible(data.candidates[0].content.parts[0].text.trim()) }
  }

  static async callGeminiStructured(prompt, apiKey, model, schema) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4000,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: schema.properties,
            required: schema.required
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data: this.parseJsonFlexible(data.candidates[0].content.parts[0].text.trim()) }
  }

  static async callOllama(prompt, host, model, options = {}) {
    try {
      // Validate inputs
      if (!host || !host.startsWith('http')) {
        throw new Error('Invalid host URL. Must start with http:// or https://')
      }
      
      if (!model) {
        throw new Error('Model must be specified for Ollama')
      }

      console.log(`Calling Ollama at ${host} with model ${model}`)
      const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 120000
      const numPredict = typeof options.numPredict === 'number' ? options.numPredict : 1024
      
      // Optional warmup for first-run model load
      if (options.warmup) {
        try {
          await fetch(`${host}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              prompt: 'ok',
              stream: false,
              options: { temperature: 0, num_predict: 16 }
            }),
            signal: AbortSignal.timeout(timeoutMs)
          })
        } catch (e) {
          console.warn('Ollama warmup attempt did not complete:', e?.message || e)
        }
      }

      const response = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0,
            num_predict: numPredict
          }
        }),
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(timeoutMs)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      
      if (!data.response) {
        throw new Error('Ollama response missing "response" field')
      }
      
      let content = data.response.trim()
      
      // Remove markdown code blocks if present (Ollama often returns ```json {...})
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Additional cleaning for common Ollama response issues
      content = content.replace(/^```\w*\s*/, '').replace(/\s*```$/, '')
      
      // Try to find JSON content if it's embedded in other text
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
      }
      
      try {
        const parsedData = this.parseJsonFlexible(content)
        return { success: true, data: parsedData }
      } catch (parseError) {
        console.error('Failed to parse Ollama response as JSON:', parseError)
        console.error('Raw response content:', content)
        console.error('Content length:', content.length)
        console.error('Content starts with:', content.substring(0, 100))
        console.error('Content ends with:', content.substring(content.length - 100))
        
        // Try to extract JSON from the response if parsing failed
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[0]
            const parsedData = this.parseJsonFlexible(extractedJson)
            console.log('Successfully extracted and parsed JSON from response')
            return { success: true, data: parsedData }
          } catch (extractError) {
            console.error('Failed to parse extracted JSON:', extractError)
            throw new Error(`Invalid JSON response from Ollama. Raw response: ${content.substring(0, 200)}...`)
          }
        }
        
        throw new Error(`Invalid JSON response from Ollama. Raw response: ${content.substring(0, 200)}...`)
      }
    } catch (error) {
      console.error('Error calling Ollama:', error)
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out. The model may be too slow or the request too complex.')
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error connecting to Ollama. Check if Ollama is running and accessible.')
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error. Make sure Ollama allows requests from this origin.')
      }
      
      throw error
    }
  }

  static async callCustomProvider(prompt, baseUrl, apiKey, model) {
    try {
      // Determine which parameter to use based on the model (for OpenAI-compatible endpoints)
      const isNewerModel = model && (model.includes('gpt-5') || model.includes('gpt-4o') || model.includes('gpt-4-turbo-2024'))
      
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }
      
      // Use max_completion_tokens for newer models, max_tokens for older ones
      if (isNewerModel) {
        requestBody.max_completion_tokens = 4000
        // Newer models may not support custom temperature, so omit it
      } else {
        requestBody.max_tokens = 4000
        requestBody.temperature = 0
      }
      
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestBody,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`Custom provider API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      let content = data.choices?.[0]?.message?.content?.trim?.() || ''

      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      try {
        return { success: true, data: this.parseJsonFlexible(content) }
      } catch (e) {
        throw new Error('Custom provider returned non-JSON content.')
      }
    } catch (error) {
      console.error('Error calling custom provider:', error)
      throw error
    }
  }

  static async callCustomProviderStructured(prompt, baseUrl, apiKey, model, schema) {
    try {
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cv_parsing",
            schema: schema,
            strict: true
          }
        },
        temperature: 0
      }
      
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Custom provider API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      return { success: true, data: this.parseJsonFlexible(content) }
    } catch (error) {
      console.error('Error calling custom provider:', error)
      throw error
    }
  }

  static async callMaritaca(prompt, apiKey, model) {
    try {
      const response = await fetch(`${this.MARITACA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(`Maritaca API error: ${errorMessage}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      return { success: true, data: this.parseJsonFlexible(content) }
    } catch (error) {
      console.error('Error calling Maritaca:', error)
      throw error
    }
  }

  static async callMaritacaStructured(prompt, apiKey, model, schema) {
    try {
      const response = await fetch(`${this.MARITACA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "cv_parsing",
              schema: schema,
              strict: true
            }
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(`Maritaca API error: ${errorMessage}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      return {
        success: true,
        data: JSON.parse(content)
      }
    } catch (error) {
      console.error('Error calling Maritaca:', error)
      throw error
    }
  }

  // General content generation method for resume tailoring
  static async generateContent(prompt, provider, settings = {}) {
    if (!provider) {
      throw new Error('AI provider must be specified')
    }
    
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          return await this.callOpenAI(prompt, settings.apiKey, settings.model)
        case 'gemini':
          return await this.callGemini(prompt, settings.apiKey, settings.model)
        case 'ollama':
          return await this.callOllama(prompt, settings.host, settings.model)
        case 'maritaca':
          return await this.callMaritaca(prompt, settings.apiKey, settings.model)
        case 'custom':
          return await this.callCustomProvider(prompt, settings.baseUrl, settings.apiKey, settings.model)
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }
    } catch (error) {
      console.error('Error generating content:', error)
      // Return error message instead of mock data
      throw new Error(`AI service failed: ${error.message}`)
    }
  }

  // DEPRECATED: Mock resume generation removed - causes fake data issues
  static async generateMockResume(prompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Parse the job description from the prompt to create a more targeted mock resume
    const jobTitle = prompt.includes('Senior Project Manager') ? 'Senior Project Manager' : 'Software Engineer'
    const company = prompt.includes('Peak') ? 'Peak' : 'TechCorp Inc.'
    
    // Try to extract actual user data from the prompt
    const userDataMatch = prompt.match(/## Personal Information\nName: (.+?)\nEmail: (.+?)\nLocation: (.+?)\nSummary: (.+?)\n\n## Skills\n(.+?)\n\n## Work Experience\n(.+?)\n\n## Education\n(.+?)\n\n## Projects\n(.+?)/s)
    
    if (userDataMatch && userDataMatch[1] !== 'Not specified') {
      // Use actual user data
      const [_, name, email, location, summary, skills, experience, education, projects] = userDataMatch
      
      const mockResume = `**Master Résumé**
A compiled, neatly formatted view of your information.

**${name}**
${email} • ${location}

**Summary**
${summary || 'Accomplished professional with experience in relevant areas.'}

**Experience**
${experience}

**Skills**
${skills.split(',').map(skill => `• ${skill.trim()}`).join('\n')}

**Education**
${education}

**Projects**
${projects}

EXPLANATION OF CHANGES

This resume has been tailored specifically for the ${jobTitle} position at ${company} using your actual resume data. The following modifications were made:

1. **Personal Information**: Used your actual name, contact details, and location.
2. **Skills Section**: Prioritized skills that match the job requirements.
3. **Experience Descriptions**: Enhanced bullet points to emphasize relevant achievements and skills.
4. **Keyword Alignment**: Incorporated key terms from the job description where they accurately reflect your experience.
5. **Content Optimization**: Maintained all factual information while optimizing for ATS systems.

The resume maintains 100% factual accuracy based on your original content while optimizing for ATS systems and recruiter screening through strategic keyword placement and relevant experience highlighting.`

      return mockResume
    }
    
    // Fallback to generic mock resume if no user data found
    const mockResume = `JOHN DOE
${jobTitle}
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Accomplished ${jobTitle.toLowerCase()} with 8+ years of experience leading cross-functional teams and delivering complex projects on time and within budget. Proven track record of managing large-scale initiatives, optimizing processes, and driving stakeholder alignment. Expert in agile methodologies, risk management, and team leadership.

TECHNICAL SKILLS
• Project Management: Agile, Scrum, Kanban, Waterfall, PMP methodologies
• Leadership: Team building, stakeholder management, conflict resolution, mentoring
• Technical: Python, SQL, AWS, Azure, JIRA, Confluence, MS Project
• Business: Strategic planning, budget management, risk assessment, vendor management
• Soft Skills: Communication, negotiation, problem-solving, decision-making

PROFESSIONAL EXPERIENCE

Senior Project Manager | TechCorp Inc. | 2021 - Present
• Lead cross-functional teams of 15+ members across multiple concurrent projects
• Manage $2M+ project budgets and deliver 95% of projects on time and within scope
• Implement agile methodologies reducing project delivery time by 30%
• Coordinate with stakeholders across engineering, product, and business teams
• Technologies: JIRA, Confluence, MS Project, AWS, Azure

Project Manager | StartupXYZ | 2019 - 2021
• Managed 5+ concurrent projects with teams of 8-12 members
• Delivered 90% of projects on time while maintaining quality standards
• Established project management processes and templates still in use today
• Led stakeholder communication and risk mitigation strategies
• Technologies: Asana, Slack, Google Workspace, basic AWS

Associate Project Manager | Corporate Solutions | 2017 - 2019
• Supported senior project managers on large-scale initiatives
• Coordinated project schedules, resources, and deliverables
• Assisted in stakeholder meetings and project documentation
• Contributed to process improvement initiatives
• Technologies: MS Project, Excel, PowerPoint, SharePoint

EDUCATION
Bachelor of Science in Business Administration
University of Technology | 2013 - 2017
GPA: 3.7/4.0

CERTIFICATIONS
• Project Management Professional (PMP)
• Certified Scrum Master (CSM)
• AWS Certified Solutions Architect Associate

PROJECTS
Enterprise Digital Transformation | TechCorp Inc. | 2022
• Led 18-month digital transformation initiative affecting 500+ employees
• Managed $1.5M budget and delivered project 2 weeks ahead of schedule
• Coordinated with 8 different departments and external vendors
• Technologies: Salesforce, Workday, custom integrations

Customer Portal Redesign | TechCorp Inc. | 2021
• Managed redesign of customer-facing portal serving 50K+ users
• Led UX/UI team and coordinated with development and QA teams
• Delivered project on time with 98% customer satisfaction score
• Technologies: React, Node.js, AWS, analytics tools

EXPLANATION OF CHANGES

This resume has been tailored specifically for the ${jobTitle} position at ${company} with the following key modifications:

1. **Professional Summary**: Rewritten to emphasize project management leadership and team management experience, directly aligning with senior project manager requirements.

2. **Skills Section**: Reorganized to prioritize project management methodologies, leadership skills, and technical tools commonly required for project management roles.

3. **Experience Descriptions**: Enhanced bullet points to emphasize team size, budget management, stakeholder coordination, and project delivery metrics - all critical for senior project management positions.

4. **Keyword Alignment**: Incorporated key terms from project management domain including "agile methodologies," "stakeholder management," "risk assessment," and "cross-functional teams."

5. **Quantified Achievements**: Maintained existing metrics while emphasizing project management outcomes like team sizes, budget amounts, and delivery timelines.

6. **Section Prioritization**: Emphasized project management experience and leadership skills while maintaining technical proficiency relevant to the role.

The resume maintains 100% factual accuracy based on the original content while optimizing for ATS systems and recruiter screening through strategic keyword placement and relevant experience highlighting.`

    return mockResume
  }

  // Map the requested external JSON shape -> internal app structure
  static mapNewSchemaToInternal(data) {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data)
      }
    } catch {
      return {}
    }
    const personal = data?.personal_information || {}
    const work = Array.isArray(data?.work_experience) ? data.work_experience : []
    const education = Array.isArray(data?.education) ? data.education : []
    const skillsBlocks = Array.isArray(data?.skills) ? data.skills : []

    // Flatten skills blocks into a single list of items
    const flatSkills = skillsBlocks.flatMap(block => Array.isArray(block?.items) ? block.items : [])

    return {
      personalInfo: {
        name: personal.full_name || '',
        email: personal.email || '',
        phone: personal.phone || '',
        location: personal.location || '',
        linkedin: personal.linkedin || '',
        website: personal.website_portfolio || '',
        summary: personal.professional_summary || ''
      },
      experiences: work.map((w, idx) => ({
        id: idx + 1,
        role: w.job_title || '',
        company: w.company || '',
        startDate: w.start_date || '',
        endDate: w.end_date || '',
        current: !w.end_date, // if no end date, assume current
        bullets: Array.isArray(w.key_achievements_responsibilities) ? w.key_achievements_responsibilities : [],
        skills: []
      })),
      education: education.map((e, idx) => ({
        id: idx + 1000,
        school: e.school_university || '',
        degree: e.degree || '',
        field: e.field_of_study || '',
        startDate: e.start_date || '',
        endDate: e.end_date || '',
        gpa: e.gpa || '',
        achievements: []
      })),
      skills: flatSkills,
      projects: [],
      achievements: []
    }
  }

  // Convert AI response to proper CV format
  static convertCVDataToProperFormat(data) {
    console.log('Converting CV data to proper format:', data)
    
    const result = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: ''
      },
      experiences: [],
      education: [],
      skills: [],
      projects: [],
      achievements: []
    }
    
    // Handle different data structures that AI might return
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        console.error('Failed to parse string data as JSON:', e)
        return result
      }
    }
    
    if (!data || typeof data !== 'object') {
      console.error('Data is not an object:', typeof data, data)
      return result
    }
    
    // Convert personalInfo
    if (data.personalInfo && typeof data.personalInfo === 'object') {
      result.personalInfo = {
        name: this.safeString(data.personalInfo.name),
        email: this.safeString(data.personalInfo.email),
        phone: this.safeString(data.personalInfo.phone),
        location: this.safeString(data.personalInfo.location),
        linkedin: this.safeString(data.personalInfo.linkedin),
        website: this.safeString(data.personalInfo.website),
        summary: this.safeString(data.personalInfo.summary)
      }
    }
    
    // Convert experiences
    if (Array.isArray(data.experiences)) {
      result.experiences = data.experiences.map((exp, index) => ({
        id: this.safeNumber(exp.id) || (Date.now() + index),
        role: this.safeString(exp.role),
        company: this.safeString(exp.company),
        startDate: this.safeString(exp.startDate),
        endDate: this.safeString(exp.endDate),
        current: this.safeBoolean(exp.current),
        bullets: this.safeArray(exp.bullets),
        skills: this.safeArray(exp.skills)
      }))
    }
    
    // Convert education
    if (Array.isArray(data.education)) {
      result.education = data.education.map((edu, index) => ({
        id: this.safeNumber(edu.id) || (Date.now() + index + 1000),
        school: this.safeString(edu.school),
        degree: this.safeString(edu.degree),
        field: this.safeString(edu.field),
        startDate: this.safeString(edu.startDate),
        endDate: this.safeString(edu.endDate),
        gpa: this.safeString(edu.gpa),
        achievements: this.safeArray(edu.achievements)
      }))
    }
    
    // Convert skills
    result.skills = this.safeArray(data.skills)
    
    // Convert projects
    result.projects = this.safeArray(data.projects)
    
    // Convert achievements
    result.achievements = this.safeArray(data.achievements)
    
    console.log('Converted CV data:', result)
    return result
  }
  
  // Helper methods for safe data conversion
  static safeString(value) {
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number') return value.toString()
    return ''
  }
  
  static safeNumber(value) {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseInt(value)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }
  
  static safeBoolean(value) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'current'
    }
    return false
  }
  
  static safeArray(value) {
    if (Array.isArray(value)) {
      return value.map(item => this.safeString(item)).filter(item => item.length > 0)
    }
    if (typeof value === 'string' && value.trim()) {
      // Try to split by common delimiters
      return value.split(/[,;|]/).map(item => this.safeString(item)).filter(item => item.length > 0)
    }
    return []
  }

  // Fallback CV parsing when AI services fail
  static parseCVFallback(cvText) {
    console.log('Using fallback CV parsing...')
    
    // Basic text extraction - look for common patterns
    const lines = cvText.split('\n').map(line => line.trim()).filter(line => line)
    
    const result = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: ''
      },
      experiences: [],
      education: [],
      skills: [],
      projects: [],
      achievements: []
    }
    
    // Try to extract basic information
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Look for name (usually first line or line with email)
      if (!result.personalInfo.name && line.includes('@') && line.includes('.')) {
        // Look for name in previous lines
        for (let j = Math.max(0, i - 3); j < i; j++) {
          if (lines[j] && lines[j].length > 2 && !lines[j].includes('@') && !lines[j].includes('http')) {
            result.personalInfo.name = lines[j]
            break
          }
        }
      }
      
      // Extract email
      if (!result.personalInfo.email && line.includes('@')) {
        const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
        if (emailMatch) {
          result.personalInfo.email = emailMatch[0]
        }
      }
      
      // Extract phone
      if (!result.personalInfo.phone && line.match(/[\d\s\-\(\)\+]+/)) {
        const phoneMatch = line.match(/[\d\s\-\(\)\+]{10,}/)
        if (phoneMatch) {
          result.personalInfo.phone = phoneMatch[0].trim()
        }
      }
      
      // Look for skills (common technical terms)
      const skillKeywords = [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'Docker', 'Git',
        'SQL', 'MongoDB', 'TypeScript', 'Vue.js', 'Angular', 'PHP', 'Ruby', 'Go',
        'C++', 'C#', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'Agile', 'Scrum'
      ]
      
      skillKeywords.forEach(skill => {
        if (line.toLowerCase().includes(skill.toLowerCase()) && !result.skills.includes(skill)) {
          result.skills.push(skill)
        }
      })
    }
    
    // If no skills found, add some generic ones
    if (result.skills.length === 0) {
      result.skills = ['Problem Solving', 'Communication', 'Teamwork']
    }
    
    return result
  }
}