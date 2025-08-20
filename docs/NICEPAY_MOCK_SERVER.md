# NICEPAY CMS Mock Server

## Overview

This is a complete mock implementation of the NICEPAY CMS API for development and testing purposes. It simulates all the key functionalities of the NICEPAY payment gateway including member registration, payment processing, and settlement management.

## Features

### 1. Data Models
- Complete TypeScript type definitions for all NICEPAY entities
- Support for both BANK and CARD payment methods
- Business rule enforcement (cutoff times, processing days)

### 2. Mock Server
- Full REST API implementation matching NICEPAY's specification
- In-memory data storage for testing
- Automatic status transitions simulating real processing times
- Support for both test and production-like environments

### 3. Client SDK
- Type-safe client library for easy integration
- Built-in validation and error handling
- Support for all NICEPAY API endpoints

### 4. Settlement Calendar
- Business day calculations (excluding weekends and Korean holidays)
- Accurate settlement date predictions
- Processing time simulations

## Installation

```bash
# Install dependencies
npm install

# Run the mock server
npm run mock:server

# Run with auto-reload for development
npm run mock:server:watch
```

## Configuration

Environment variables:
```bash
MOCK_SERVER_PORT=7080          # Server port (default: 7080)
NICEPAY_SERVICE_ID=30000000    # Your service ID
NICEPAY_API_KEY=test-key-123   # Your API key
MOCK_MODE=test                  # Environment mode (test/production)
```

## API Endpoints

### Evidence Files
- `POST /thebill/retailers/{serviceId}/members/{memberId}/agree` - Upload evidence file
- `POST /thebill/retailers/{serviceId}/members/{memberId}/agree-enc` - Upload Base64 file
- `DELETE /thebill/retailers/{serviceId}/members/{memberId}/agreement` - Delete file

### Member Registration
- `POST /thebill/retailers/{serviceId}/members/{memberId}` - Register member
- `GET /thebill/retailers/{serviceId}/members/{memberId}` - Get member info
- `POST /thebill/retailers/{serviceId}/members/{memberId}/modify` - Update member
- `DELETE /thebill/retailers/{serviceId}/members/{memberId}` - Delete member

### Payments
- `POST /thebill/retailers/{serviceId}/payments/{date}/{messageNo}` - Create payment
- `GET /thebill/retailers/{serviceId}/payments/{date}/{messageNo}` - Get payment
- `DELETE /thebill/retailers/{serviceId}/payments/{date}/{messageNo}` - Delete payment
- `POST /thebill/retailers/{serviceId}/payments/{date}/{messageNo}/cancel` - Cancel card payment

### Settlements
- `GET /thebill/retailers/{serviceId}/settlements/due-date` - Get settlement status

### History
- `GET /thebill/retailers/{serviceId}/members?status={C|D}&searchDt={YYYYMMDD}` - Get change history

## Usage Example

```typescript
import { NicepayClient } from './services/nicepay-client';

const client = new NicepayClient({
  serviceId: '30000000',
  apiKey: 'your-api-key',
  environment: 'test',
  urls: {
    base: 'localhost',
    port: 7080
  }
});

// Register a member
const member = await client.registerMember('user123', {
  memberName: '홍길동',
  serviceCd: 'BANK',
  bankCd: '004',
  accountNo: '12345678901234',
  accountName: '홍길동',
  idNo: '900101',
  hpNo: '01012345678'
});

// Create a payment
const payment = await client.createPayment('20240115', '000001', {
  memberId: 'user123',
  memberName: '홍길동',
  reqAmt: '50000',
  serviceCd: 'BANK'
});
```

## Business Rules

### Member Registration
- Registration before 12:00 → Processed same business day
- Registration after 12:00 → Processed next business day
- Results available from 13:00 next business day

### Payment Processing
- Must register before 17:00 on D-1 (business day)
- Bank withdrawals: Results available D+1 at 13:00
- Card payments: Approval on D-day, fees on D+1 at 13:00

### Settlement
- Bank: D+2 business days
- Card: D+1 business day

## Testing

Run the test client to verify all endpoints:

```bash
# Start the mock server first
npm run mock:server

# In another terminal, run the test client
npx tsx src/mock-server/test-client.ts
```

## Data Persistence

The mock server uses in-memory storage. Data is lost when the server restarts. For persistent testing, consider:
1. Exporting/importing data snapshots
2. Connecting to a test database
3. Using file-based storage

## Response Codes

### Success
- `0000`: Normal processing

### Common Errors
- `1001`: Organization status error
- `2001`: Member ID error
- `2002`: Duplicate member ID
- `3001`: Unregistered member
- `7777`: Parameter error
- `9999`: System error

## Development

### Project Structure
```
src/
├── types/
│   └── nicepay.types.ts         # Type definitions
├── mock-server/
│   ├── index.ts                 # Entry point
│   ├── nicepay-mock-server.ts   # Express server
│   ├── mock-data-store.ts       # Data storage
│   ├── settlement-calendar.ts    # Business day logic
│   └── test-client.ts           # Test script
└── services/
    └── nicepay-client.ts        # Client SDK
```

### Extending the Mock Server

1. **Add new endpoints**: Edit `nicepay-mock-server.ts`
2. **Modify business rules**: Update `settlement-calendar.ts`
3. **Add data models**: Extend `nicepay.types.ts`
4. **Custom validations**: Add to `nicepay-client.ts`

## Production Considerations

This mock server is for development only. For production:

1. Use the actual NICEPAY API endpoints
2. Implement proper authentication and encryption
3. Add comprehensive error handling
4. Set up monitoring and logging
5. Implement retry logic for failed requests
6. Store sensitive data securely
7. Follow PCI compliance guidelines for card data

## Support

For issues or questions about the mock server, please refer to:
- NICEPAY official documentation
- The `docs/nicepay.md` file for API specifications
- Create an issue in the project repository