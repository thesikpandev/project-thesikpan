#!/bin/bash

# ===== 설정 =====
BASE_URL="https://rest-test.thebill.co.kr:7080"
RETAILER_ID="39001029"
API_KEY="CYVk1pDqxKo+YZWec8vmqfOhBZUHdMNQHVQBJz54rxg="

# 짧은 회원 ID 생성 (최대 20자)
TIMESTAMP=$(date +%m%d%H%M%S)  # 월일시분초만 사용
MEMBER_ID="test${TIMESTAMP}"    # test + 10자리 = 14자리

echo "========================================="
echo "나이스페이 CMS API 테스트"
echo "========================================="
echo ""
echo "[1] 유저 등록 테스트"
echo "회원 ID: ${MEMBER_ID} (길이: ${#MEMBER_ID}자)"
echo "-----------------------------------------"

curl -X POST \
  "${BASE_URL}/thebill/retailers/${RETAILER_ID}/members/${MEMBER_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Api-Key: ${API_KEY}" \
  -H "Service-Type: B" \
  -d '{
    "memberName": "테스트유저",
    "serviceCd": "BANK",
    "bankCd": "004",
    "accountNo": "12345678901234",
    "accountName": "테스트",
    "idNo": "900101",
    "hpNo": "01012345678",
    "email": "test@example.com",
    "serviceName": "월간구독"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  | python3 -m json.tool

echo ""
echo "========================================="
