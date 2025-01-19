# REST API Documentation

## Base URL
All endpoints are relative to: `http://localhost:3000`

## Authentication
Currently, no authentication is required. Secure through network isolation.

## Endpoints

### File Operations

#### List Files
```http
GET /files/{path}
```

Returns a list of files and directories at the specified path.

**Response**
```json
[
  {
    "name": "string",
    "isDirectory": boolean,
    "size": number,
    "modified": "ISO-8601 date string"
  }
]
```

#### Read File
```http
GET /files/{path}
```

Returns the contents of a file.

**Response**
```json
{
  "content": "string"
}
```

#### Create File/Directory
```http
POST /files/{path}
```

**Request Body**
```json
{
  "content": "string",
  "isDirectory": boolean
}
```

**Response**
```json
{
  "message": "Created successfully"
}
```

#### Update File
```http
PUT /files/{path}
```

**Request Body**
```json
{
  "content": "string"
}
```

**Response**
```json
{
  "message": "Updated successfully"
}
```

#### Delete File/Directory
```http
DELETE /files/{path}
```

**Response**
```json
{
  "message": "Deleted successfully"
}
```

### Command Execution

#### Execute Command
```http
POST /execute
```

**Request Body**
```json
{
  "command": "string",
  "args": ["string"]
}
```

**Response**
```json
{
  "stdout": "string",
  "stderr": "string"
}
```

### Server Management

#### Get Server Status
```http
GET /server/status
```

**Response**
```json
{
  "running": boolean,
  "pid": number | null
}
```

#### Start Server
```http
POST /server/start
```

**Request Body**
```json
{
  "command": "string", // default: "npm"
  "args": ["string"]   // default: ["start"]
}
```

#### Stop Server
```http
POST /server/stop
```

## Error Handling

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `403`: Forbidden (path outside app directory)
- `404`: Not Found
- `500`: Server Error

Error responses include a message:
```json
{
  "error": "Error description"
}
```
