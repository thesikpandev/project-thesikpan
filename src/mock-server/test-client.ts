/**
 * Test script for NICEPAY Mock Server
 * Demonstrates how to use the NicepayClient SDK
 */

import { NicepayClient } from '../services/nicepay-client';
import { NicepayConfig } from '../types/nicepay.types';

async function testNicepayAPI() {
  // Configure client for mock server
  const config: NicepayConfig = {
    serviceId: '30000000',
    apiKey: 'test-api-key-123',
    environment: 'test',
    urls: {
      base: 'localhost',
      port: 7080
    }
  };
  
  const client = new NicepayClient(config);
  
  console.log('==============================================');
  console.log('Testing NICEPAY Mock Server API');
  console.log('==============================================');
  
  try {
    // Test 1: Register a new member (Bank)
    console.log('\n1. Registering new member (Bank)...');
    const bankMember = await client.registerMember('test_bank_user', {
      memberName: '테스트유저',
      serviceCd: 'BANK',
      bankCd: '004', // 국민은행
      accountNo: '12345678901234',
      accountName: '테스트유저',
      idNo: '900101',
      hpNo: '01012345678',
      email: 'test@example.com',
      serviceName: '월간 구독 서비스'
    });
    console.log('Bank member registered:', bankMember);
    
    // Test 2: Register a new member (Card)
    console.log('\n2. Registering new member (Card)...');
    const cardMember = await client.registerMember('test_card_user', {
      memberName: '카드유저',
      serviceCd: 'CARD',
      cardNo: '1234567890123456',
      valYn: '2512', // 2025년 12월
      hpNo: '01087654321',
      email: 'card@example.com',
      serviceName: '프리미엄 서비스'
    });
    console.log('Card member registered:', cardMember);
    
    // Test 3: Get member information
    console.log('\n3. Getting member information...');
    const memberInfo = await client.getMember('test_bank_user');
    console.log('Member info:', memberInfo);
    
    // Test 4: Create payment request
    const today = client.formatDate(new Date());
    const messageNo = client.generateMessageNo(1);
    
    console.log('\n4. Creating payment request...');
    const payment = await client.createPayment(today, messageNo, {
      memberId: 'test_bank_user',
      memberName: '테스트유저',
      accountDesc: '1월',
      reqAmt: '50000',
      cashRcpYn: 'Y',
      serviceCd: 'BANK',
      userDefine: 'TEST-001'
    });
    console.log('Payment created:', payment);
    
    // Test 5: Get payment information
    console.log('\n5. Getting payment information...');
    const paymentInfo = await client.getPayment(today, messageNo);
    console.log('Payment info:', paymentInfo);
    
    // Test 6: Get settlement status
    console.log('\n6. Getting settlement status...');
    const settlement = await client.getSettlementStatus(today, 'BANK');
    console.log('Settlement status:', settlement);
    
    // Test 7: Create card payment and cancel
    const cardMessageNo = client.generateMessageNo(2);
    console.log('\n7. Creating card payment for cancellation test...');
    await client.createPayment(today, cardMessageNo, {
      memberId: 'test_card_user',
      memberName: '카드유저',
      reqAmt: '100000',
      serviceCd: 'CARD'
    });
    
    // Wait a bit for processing simulation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Cancelling card payment...');
    const cancelResult = await client.cancelCardPayment(
      today,
      cardMessageNo,
      client.formatDate(new Date())
    );
    console.log('Cancel result:', cancelResult);
    
    // Test 8: Update member information
    console.log('\n8. Updating member information...');
    const updateResult = await client.updateMember('test_bank_user', {
      hpNo: '01099999999',
      email: 'updated@example.com'
    });
    console.log('Update result:', updateResult);
    
    // Test 9: Get change history
    console.log('\n9. Getting change history...');
    const changeHistory = await client.getChangeHistory('C', today);
    console.log('Change history:', changeHistory);
    
    console.log('\n==============================================');
    console.log('All tests completed successfully!');
    console.log('==============================================');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests if executed directly
if (require.main === module) {
  testNicepayAPI().catch(console.error);
}

export { testNicepayAPI };