How Context Caching Works
In a standard API call, the model has to "re-read" your entire system prompt and any uploaded documents (like a 200-page textbook) every single time the student asks a question. This is slow and expensive.

Context Caching allows you to pre-process that massive "foundation" of data once and store it. When the student speaks, you only send the new audio/text. Gemini "attaches" it to the already-loaded cache instantly.

How to do it (Technical Steps):
Upload & Cache: You send your "base" context (e.g., the school’s curriculum, a specific textbook, or complex system instructions) to the client.caches.create() method.

TTL (Time To Live): You set an expiration time (default is 1 hour). As long as the cache is alive, you can reference it by its name.

Reference: In your student's turn-by-turn communication, you pass the cached_content ID in the request config.

Code Sketch (Python):
Python
# Create the cache once for the school textbook
school_cache = client.caches.create(
    model='models/gemini-3-flash-preview',
    config=types.CreateCachedContentConfig(
        display_name='algebra_101_textbook',
        system_instruction="You are a helpful math tutor. Use only the provided textbook.",
        contents=[textbook_pdf_file],
        ttl="3600s" # Keep it alive for an hour
    )
)

# Use it in the student pipeline
response = client.generate_content(
    model='models/gemini-3-flash-preview',
    contents="How do I solve for X in chapter 4?",
    config=types.GenerateContentConfig(cached_content=school_cache.name)
)


For additional documentation referencing, visit: https://ai.google.dev/gemini-apidocs/caching?lang=node