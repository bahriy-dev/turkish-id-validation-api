const types = ['tckn', 'vkn', 'iban', 'phone', 'plate', 'postal-code'];

const result = {
  type: 'object',
  required: ['valid', 'value'],
  properties: {
    type: { type: 'string', enum: types },
    valid: { type: 'boolean' },
    value: { type: 'string', description: 'Normalized input' },
    reason: { type: 'string', description: 'Why validation failed' },
    details: { type: 'object', additionalProperties: true },
  },
};

const examples: Record<string, string> = {
  tckn: '10000000146',
  vkn: '1234567890',
  iban: 'TR330006100519786457841326',
  phone: '05321234567',
  plate: '34ABC123',
  'postal-code': '34710',
};

const single = Object.fromEntries(
  types.map((t) => [
    `/v1/${t}/{value}`,
    {
      get: {
        summary: `Validate a ${t.toUpperCase()}`,
        tags: ['validate'],
        parameters: [{ name: 'value', in: 'path', required: true, schema: { type: 'string' }, example: examples[t] }],
        responses: { 200: { description: 'Validation result', content: { 'application/json': { schema: result } } } },
      },
    },
  ]),
);

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'tr-validator-api',
    version: '1.0.0',
    description: 'Validation web service for Turkish identifiers used in e-commerce checkout and invoicing.',
    license: { name: 'MIT' },
  },
  paths: {
    ...single,
    '/v1/validate': {
      post: {
        summary: 'Validate up to 100 values in one request',
        tags: ['validate'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    maxItems: 100,
                    items: { type: 'object', required: ['type', 'value'], properties: { type: { type: 'string', enum: types }, value: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Batch results' }, 400: { description: 'Bad request' }, 413: { description: 'Too many items' } },
      },
    },
    '/v1/provinces': { get: { summary: 'List the 81 provinces with plate codes', tags: ['reference'], responses: { 200: { description: 'Provinces' } } } },
    '/v1/provinces/{code}': {
      get: {
        summary: 'Get a province by plate code',
        tags: ['reference'],
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: '34' }],
        responses: { 200: { description: 'Province' }, 404: { description: 'Not found' } },
      },
    },
    '/v1/banks': { get: { summary: 'Known bank codes found in TR IBANs', tags: ['reference'], responses: { 200: { description: 'Banks' } } } },
    '/health': { get: { summary: 'Health check', tags: ['ops'], responses: { 200: { description: 'OK' } } } },
  },
};
