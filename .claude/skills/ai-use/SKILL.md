---
name: ai-use
description: Build AI-powered features into web applications using an OpenAI-compatible chat completions API. Covers classification, structured data extraction from text/photos/documents, summarization, and language translation. Use when the web application being built requires AI capabilities such as classifying content, extracting structured information, summarizing text, translating between languages, or analyzing files and images. All generated code must be pure JavaScript with no external dependencies.
---

# AI Use - Chat Completions API

Integrate AI-powered features into web applications using the LiteLLM chat completions endpoint. All code is pure JavaScript with **zero external dependencies**. The API follows the OpenAI chat completions format.

## API Configuration

| Property       | Value                                                        |
|----------------|--------------------------------------------------------------|
| **Endpoint**   | `https://my.living-apps.de/litellm/v1/chat/completions`   |
| **Method**     | `POST`                                                       |
| **Model**      | `default`                                               |
| **Auth**       | None required                                                |
| **Format**     | OpenAI-compatible chat completions                           |

## Core Helper

Every use case builds on one reusable function. Include it once in the application, call it everywhere.

```javascript
const AI_ENDPOINT = "https://my.living-apps.de/litellm/v1/chat/completions";
const AI_MODEL = "default";

async function chatCompletion(messages, options = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      ...options,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
```

## Use Cases

### 1. Classification

Classify text into predefined categories. Return the result as JSON for easy downstream processing.

```javascript
async function classify(text, categories) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "You are a classifier. Respond ONLY with valid JSON, nothing else.",
        "Output format: {\"category\": \"<one of the allowed categories>\", \"confidence\": <0-1>}",
        `Allowed categories: ${JSON.stringify(categories)}`,
      ].join("\n"),
    },
    { role: "user", content: text },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

Usage:

```javascript
const { category, confidence } = await classify(
  "The server crashed at 3am and all requests are timing out",
  ["bug", "feature-request", "question", "documentation"]
);
// { category: "bug", confidence: 0.97 }
```

### 2. Structured Data Extraction

Extract typed fields from unstructured text. Define the schema you need and let the model fill it.

```javascript
async function extract(text, schemaDescription) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "You are a data extraction engine. Respond ONLY with valid JSON matching the requested schema.",
        "If a field cannot be determined from the input, use null.",
        `Schema:\n${schemaDescription}`,
      ].join("\n"),
    },
    { role: "user", content: text },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

Usage:

```javascript
const invoice = await extract(
  "Invoice #2024-0892 from Acme Corp, dated March 15 2025. Total: EUR 1,450.00. Due in 30 days.",
  `{
    "invoice_number": "string",
    "vendor": "string",
    "date": "YYYY-MM-DD",
    "total_amount": number,
    "currency": "string",
    "due_date": "YYYY-MM-DD or null"
  }`
);
// { invoice_number: "2024-0892", vendor: "Acme Corp", date: "2025-03-15", ... }
```

### 3. Summarization

Condense text to key points. Control output length via the system prompt.

```javascript
async function summarize(text, { maxSentences = 3, language } = {}) {
  const instructions = [
    `Summarize the following text in at most ${maxSentences} sentences.`,
    "Be concise and preserve key facts.",
  ];
  if (language) {
    instructions.push(`Write the summary in ${language}.`);
  }

  return chatCompletion([
    { role: "system", content: instructions.join(" ") },
    { role: "user", content: text },
  ]);
}
```

Usage:

```javascript
const summary = await summarize(longArticleText, { maxSentences: 2 });
```

### 4. Translation

Translate text between any language pair.

```javascript
async function translate(text, targetLanguage, sourceLanguage) {
  const from = sourceLanguage ? ` from ${sourceLanguage}` : "";
  return chatCompletion([
    {
      role: "system",
      content: `Translate the following text${from} to ${targetLanguage}. Output ONLY the translation, nothing else.`,
    },
    { role: "user", content: text },
  ]);
}
```

Usage:

```javascript
const german = await translate("The meeting is at 3pm tomorrow", "German");
// "Das Meeting ist morgen um 15 Uhr"

const english = await translate("お疲れ様です", "English", "Japanese");
// "Thank you for your hard work"
```

## Working with Files

Files (images, PDFs, documents) must be base64-encoded before sending. The API accepts them inline as data URIs.

### Encoding Helpers

From a `File` object (browser file input, drag-and-drop):

```javascript
function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
```

From a URL (fetch the resource first, then encode):

```javascript
async function urlToDataUri(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to encode file"));
    reader.readAsDataURL(blob);
  });
}
```

From raw bytes (`Uint8Array` / `ArrayBuffer`):

```javascript
function bytesToDataUri(bytes, mimeType) {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
```

### Sending Images

Use the `image_url` content type with the base64 data URI:

```javascript
async function analyzeImage(imageDataUri, prompt) {
  return chatCompletion([
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: imageDataUri },
        },
      ],
    },
  ]);
}
```

Usage:

```javascript
const dataUri = await fileToDataUri(selectedImageFile);
const description = await analyzeImage(dataUri, "Describe what you see in this image.");
```

### Sending Documents (PDF, etc.)

Use the `file` content type with the base64 data URI in `file_data`:

```javascript
async function analyzeDocument(fileDataUri, prompt) {
  return chatCompletion([
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "file",
          file: { file_data: fileDataUri },
        },
      ],
    },
  ]);
}
```

Usage:

```javascript
const pdfDataUri = await fileToDataUri(uploadedPdf);
// pdfDataUri looks like: "data:application/pdf;base64,JVBERi0xLjQK..."

const extractedData = await analyzeDocument(
  pdfDataUri,
  "Extract all line items from this invoice as JSON: [{description, quantity, unit_price, total}]"
);
```

### Extracting Structured Data from Photos

Combine file handling with structured extraction:

```javascript
async function extractFromPhoto(imageDataUri, schemaDescription) {
  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "Extract structured data from the provided image.",
        "Respond ONLY with valid JSON matching the schema.",
        "Use null for fields that cannot be determined.",
        `Schema:\n${schemaDescription}`,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract the data from this image." },
        {
          type: "image_url",
          image_url: { url: imageDataUri },
        },
      ],
    },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

Usage:

```javascript
const receiptUri = await fileToDataUri(receiptPhoto);
const receipt = await extractFromPhoto(receiptUri, `{
  "store_name": "string",
  "date": "YYYY-MM-DD",
  "items": [{"name": "string", "price": number}],
  "total": number,
  "currency": "string"
}`);
```

## Multipart Content Messages

When combining text, images, and files in a single message, use an array of content parts:

```javascript
const result = await chatCompletion([
  {
    role: "user",
    content: [
      { type: "text", text: "Compare the design in the image with the requirements in the PDF." },
      { type: "image_url", image_url: { url: screenshotDataUri } },
      { type: "file", file: { file_data: specPdfDataUri } },
    ],
  },
]);
```

## API Parameters Reference

These optional parameters can be passed as the second argument to `chatCompletion`:

| Parameter          | Type              | Purpose                                                        |
|--------------------|-------------------|----------------------------------------------------------------|
| `temperature`      | `number` (0-2)    | Randomness. Use `0` for deterministic extraction/classification |
| `max_tokens`       | `number`          | Cap response length                                            |
| `top_p`            | `number` (0-1)    | Nucleus sampling alternative to temperature                    |
| `stop`             | `string[]`        | Stop sequences                                                 |
| `response_format`  | `object`          | Force JSON output: `{ type: "json_object" }`                   |
| `stream`           | `boolean`         | Enable SSE streaming (requires different response handling)     |

Example with explicit parameters:

```javascript
const result = await chatCompletion(messages, {
  temperature: 0,
  max_tokens: 500,
  response_format: { type: "json_object" },
});
```

## Error Handling

Always wrap API calls. The endpoint may be temporarily unavailable or the model may return unparseable output.

```javascript
async function safeJsonCompletion(messages, options = {}) {
  const raw = await chatCompletion(messages, options);

  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Expected JSON but got: ${raw.slice(0, 200)}`);
  }

  return JSON.parse(jsonMatch[0]);
}
```

For retries:

```javascript
async function withRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

// Usage
const data = await withRetry(() =>
  extract("some messy text...", '{"name": "string", "email": "string"}')
);
```

## Complete Integration Example

A self-contained module for a web app that classifies user feedback, extracts entities, and translates it:

```javascript
const AI_ENDPOINT = "https://my.living-apps.de/litellm/v1/chat/completions";
const AI_MODEL = "default";

async function chatCompletion(messages, options = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ model: AI_MODEL, messages, ...options }),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function processFeedback(feedbackText) {
  const [classification, entities, germanTranslation] = await Promise.all([
    chatCompletion([
      {
        role: "system",
        content:
          'Classify this feedback. Respond as JSON: {"sentiment": "positive|negative|neutral", "category": "bug|feature|praise|question"}',
      },
      { role: "user", content: feedbackText },
    ], { temperature: 0 }).then(JSON.parse),

    chatCompletion([
      {
        role: "system",
        content:
          'Extract entities. Respond as JSON: {"people": [], "products": [], "issues": []}',
      },
      { role: "user", content: feedbackText },
    ], { temperature: 0 }).then(JSON.parse),

    chatCompletion([
      {
        role: "system",
        content: "Translate to German. Output only the translation.",
      },
      { role: "user", content: feedbackText },
    ]),
  ]);

  return { classification, entities, germanTranslation };
}
```

## Real-World Example: Auto-Fill Form Fields from a Photo Upload

### Use Case

A user uploads a photo of a product (e.g. a piece of furniture, an electronic device, a vehicle) through a file input in a form. The moment the photo is selected, the application sends it to the multimodal LLM via the chat completions API. The LLM analyzes the image and returns structured data — manufacturer, model, color, size, condition, or any other relevant attributes. The application then automatically populates the corresponding form fields with the extracted values, saving the user from manual data entry.

This pattern is useful for:
- **Product listing forms** — upload a photo of an item and auto-fill brand, model, dimensions
- **Inventory management** — photograph equipment and extract serial numbers, specs
- **Insurance claims** — photograph damage and extract vehicle make, model, color, damage description
- **Receipt/label scanning** — photograph a label and extract product details

### Implementation Guide

#### 1. Derive the extraction schema from the backend data model

The form fields are typically defined by the backend data schema (e.g. a Living Apps app, a database table, or an API model). Reuse that schema directly — do not invent a separate one. Build a description object where each key is a field name from the backend and each value tells the LLM what to extract.

```javascript
const PRODUCT_SCHEMA = {
  manufacturer: "string — brand or manufacturer name",
  model: "string — product model or name",
  color: "string — primary color",
  size: "string — dimensions or size label (e.g. '42x30x15 cm', 'XL')",
  condition: "string — one of: new, like-new, good, fair, poor",
  additional_notes: "string — any other notable details visible in the photo",
};
```

The keys (`manufacturer`, `model`, `color`, ...) must correspond to the actual field identifiers used by the backend and the form inputs. If the backend schema already provides field names, types, and constraints (e.g. allowed values for enums, date formats), incorporate those directly into the schema description so the LLM returns values the backend will accept without transformation.

#### 2. Listen for file selection on the upload input

Attach a `change` event listener to the file input. When a file is selected, read it as a base64 data URI and trigger the extraction.

```javascript
document.getElementById("photo-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const dataUri = await fileToDataUri(file);
  const extracted = await extractProductFromPhoto(dataUri);
  fillFormFields(extracted);
});
```

#### 3. Send the photo to the LLM with a structured extraction prompt

Build the schema description as a string and pass it in the system prompt so the LLM knows exactly what JSON shape to return.

```javascript
async function extractProductFromPhoto(imageDataUri) {
  const schemaString = JSON.stringify(PRODUCT_SCHEMA, null, 2);

  const result = await chatCompletion([
    {
      role: "system",
      content: [
        "Analyze the product in the provided photo.",
        "Extract information and respond ONLY with valid JSON matching this schema:",
        schemaString,
        "Use null for any field that cannot be determined from the image.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract product details from this photo." },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ], { temperature: 0 });

  return JSON.parse(result);
}
```

#### 4. Populate the form fields with the extracted data

Map each key from the LLM response to the corresponding form input. Skip `null` values so partially extracted data does not overwrite existing user input.

```javascript
function fillFormFields(data) {
  const fieldMapping = {
    manufacturer: "input-manufacturer",
    model: "input-model",
    color: "input-color",
    size: "input-size",
    condition: "select-condition",
    additional_notes: "textarea-notes",
  };

  for (const [key, elementId] of Object.entries(fieldMapping)) {
    if (data[key] == null) continue;
    const el = document.getElementById(elementId);
    if (!el) continue;
    el.value = data[key];
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
```

#### 5. Add loading state and error handling

Show the user that analysis is in progress and handle failures gracefully.

```javascript
document.getElementById("photo-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const status = document.getElementById("analysis-status");
  status.textContent = "Analyzing photo...";
  status.className = "status-loading";

  try {
    const dataUri = await fileToDataUri(file);
    const extracted = await extractProductFromPhoto(dataUri);
    fillFormFields(extracted);
    status.textContent = "Fields updated from photo.";
    status.className = "status-success";
  } catch (err) {
    console.error("Photo analysis failed:", err);
    status.textContent = "Could not analyze photo. Please fill in fields manually.";
    status.className = "status-error";
  }
});
```

#### Key considerations

- **Dispatch `input` events** after setting values so that framework-managed state (React, Vue, etc.) picks up the changes. In React, you may need to use the native input setter via the prototype to trigger the synthetic event system.
- **Derive the schema from the backend data model** rather than defining it from scratch. The backend already knows the field names, types, and constraints — reuse them so the LLM returns values the backend will accept.
- **Resize large images** before encoding to base64 to reduce payload size and API latency. A 1024px-wide version is usually sufficient for product identification.
- **Let users review and edit** the auto-filled values. AI extraction is not perfect — always treat it as a suggestion, not a final answer.

## Guidelines

- **Always set `temperature: 0`** for classification, extraction, and any task where determinism matters.
- **Always request JSON output** in the system prompt when you need structured data. Include the exact schema shape.
- **Parse defensively** - use `safeJsonCompletion` or regex extraction to handle models that wrap JSON in markdown fences.
- **Parallelize independent calls** with `Promise.all` to reduce total latency.
- **Keep system prompts short and precise** - vague instructions produce vague output.
- **Use `max_tokens`** when you know the expected output size to avoid unnecessary token usage.
- **MIME types matter** for file data URIs - `data:application/pdf;base64,...` for PDFs, `data:image/png;base64,...` for PNGs, `data:image/jpeg;base64,...` for JPEGs.
- **No authentication** is needed for this endpoint. Do not add API keys or bearer tokens.
- **No external dependencies** - everything uses the browser-native `fetch`, `FileReader`, `btoa`, and `JSON` APIs.
