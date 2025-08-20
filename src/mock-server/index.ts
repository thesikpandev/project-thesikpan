/**
 * NICEPAY Mock Server Entry Point
 */

import { startMockServer } from './nicepay-mock-server';
import { MockDataStore } from './mock-data-store';

// Environment configuration
const config = {
  port: process.env.MOCK_SERVER_PORT || 7080,
  serviceId: process.env.NICEPAY_SERVICE_ID || '30000000',
  apiKey: process.env.NICEPAY_API_KEY || 'test-api-key-123',
  environment: process.env.MOCK_MODE || 'test'
};

console.log('==============================================');
console.log('NICEPAY CMS Mock Server');
console.log('==============================================');
console.log(`Environment: ${config.environment}`);
console.log(`Service ID: ${config.serviceId}`);
console.log(`Port: ${config.port}`);
console.log('==============================================');

// Initialize mock data store with test data
const dataStore = new MockDataStore();
console.log('Generating test data...');
dataStore.generateTestData(config.serviceId);

const stats = dataStore.getStats();
console.log(`Test data generated:`);
console.log(`  - Members: ${stats.totalMembers}`);
console.log(`  - Payments: ${stats.totalPayments}`);
console.log(`  - Evidence Files: ${stats.totalEvidenceFiles}`);
console.log('==============================================');

// Start the mock server
startMockServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down mock server...');
  process.exit(0);
});