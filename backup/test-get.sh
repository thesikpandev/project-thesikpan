#!/bin/bash

# ===== 설정 =====
BASE_URL="https://rest-test.thebill.co.kr:7080"
RETAILER_ID="39001029"
API_KEY="CYVk1pDqxKo+YZWec8vmqfOhBZUHdMNQHVQBJz54rxg="
MEMBER_ID="test0813172826"

echo "========================================="
echo "나이스페이 CMS API 회원 조회"
echo "========================================="
echo ""
echo "회원 ID: ${MEMBER_ID}"
echo "조회 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo "-----------------------------------------"

# API 호출
RESPONSE=$(curl -s -X GET \
  "${BASE_URL}/thebill/retailers/${RETAILER_ID}/members/${MEMBER_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Api-Key: ${API_KEY}" \
  -H "Service-Type: B")

# 유니코드를 한글로 변환하여 출력
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(json.dumps(data, indent=2, ensure_ascii=False))
"

# 결과 파싱 (유니코드 디코딩 포함)
RESULT_CD=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('resultCd', 'N/A'))" 2>/dev/null)
RESULT_MSG=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('resultMsg', 'N/A'))" 2>/dev/null)

echo ""
echo "-----------------------------------------"
echo "결과 코드: ${RESULT_CD}"
echo "결과 메시지: ${RESULT_MSG}"

if [ "$RESULT_CD" = "0000" ]; then
  # 회원 정보 파싱 (한글 포함)
  STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('status', 'N/A'))" 2>/dev/null)
  REG_DT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('regDt', 'N/A'))" 2>/dev/null)
  BANK_SEND_DT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('bankSendDt', 'N/A'))" 2>/dev/null)
  MEMBER_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('memberName', 'N/A'))" 2>/dev/null)
  SERVICE_CD=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('serviceCd', 'N/A'))" 2>/dev/null)
  SERVICE_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('serviceName', 'N/A'))" 2>/dev/null)
  ACCOUNT_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('accountName', 'N/A'))" 2>/dev/null)
  BANK_CD=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('bankCd', 'N/A'))" 2>/dev/null)
  ACCOUNT_NO=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('accountNo', 'N/A'))" 2>/dev/null)
  HP_NO=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('hpNo', 'N/A'))" 2>/dev/null)
  EMAIL=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('memberInfo', {}).get('email', 'N/A'))" 2>/dev/null)
  
  echo ""
  echo "📋 회원 정보:"
  echo "  이름: ${MEMBER_NAME}"
  echo "  예금주: ${ACCOUNT_NAME}"
  echo "  서비스: ${SERVICE_CD}"
  echo "  서비스명: ${SERVICE_NAME}"
  echo "  등록일: ${REG_DT}"
  echo "  은행전송일: ${BANK_SEND_DT}"
  
  # 은행 이름 매핑
  case $BANK_CD in
    "002") BANK_NAME="산업은행" ;;
    "003") BANK_NAME="기업은행" ;;
    "004") BANK_NAME="국민은행" ;;
    "005") BANK_NAME="외환은행" ;;
    "007") BANK_NAME="수협" ;;
    "011") BANK_NAME="농협" ;;
    "020") BANK_NAME="우리은행" ;;
    "023") BANK_NAME="제일은행" ;;
    "027") BANK_NAME="씨티은행" ;;
    "031") BANK_NAME="대구은행" ;;
    "032") BANK_NAME="부산은행" ;;
    "034") BANK_NAME="광주은행" ;;
    "035") BANK_NAME="제주은행" ;;
    "037") BANK_NAME="전북은행" ;;
    "039") BANK_NAME="경남은행" ;;
    "045") BANK_NAME="새마을금고" ;;
    "048") BANK_NAME="신협" ;;
    "071") BANK_NAME="우체국" ;;
    "081") BANK_NAME="하나은행" ;;
    "088") BANK_NAME="신한은행" ;;
    "089") BANK_NAME="케이뱅크" ;;
    "090") BANK_NAME="카카오뱅크" ;;
    "092") BANK_NAME="토스뱅크" ;;
    *) BANK_NAME="알수없음" ;;
  esac
  
  echo "  은행: ${BANK_NAME} (${BANK_CD})"
  echo "  계좌번호: ${ACCOUNT_NO}"
  echo "  휴대폰: ${HP_NO}"
  echo "  이메일: ${EMAIL}"
  
  echo ""
  echo "📌 상태 정보:"
  case $STATUS in
    "0") 
      echo "  상태: ⏳ 등록대기"
      echo "  설명: 은행으로 전송됨. 처리 대기 중"
      echo "  예상: 내일(${BANK_SEND_DT}) 13시 이후 정상등록 예정"
      ;;
    "1") 
      echo "  상태: ✅ 정상등록"
      echo "  설명: 은행 등록 완료. 출금 가능"
      ;;
    "2") 
      echo "  상태: ❌ 등록실패"
      echo "  설명: 은행 등록 실패. 계좌정보 확인 필요"
      ;;
    "3") 
      echo "  상태: 🚫 해지"
      echo "  설명: 서비스 해지됨"
      ;;
    *) 
      echo "  상태: ❓ 알수없음 (${STATUS})"
      ;;
  esac
  
  # 테이블 형식으로 요약
  echo ""
  echo "┌──────────────────────────────────────┐"
  echo "│           회원 등록 요약              │"
  echo "├──────────────────────────────────────┤"
  echo "│ 회원ID    : ${MEMBER_ID}"
  echo "│ 회원명    : ${MEMBER_NAME}"
  echo "│ 상태      : ${STATUS} (등록대기)"
  echo "│ 은행      : ${BANK_NAME}"
  echo "│ 등록일    : 2025-08-13"
  echo "│ 은행전송  : 2025-08-14 (내일)"
  echo "│ 예상완료  : 2025-08-14 13:00 이후"
  echo "└──────────────────────────────────────┘"
  
  # 결과를 한글로 저장
  echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
with open('member_${MEMBER_ID}_$(date +%Y%m%d_%H%M%S).json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"
  echo ""
  echo "📁 결과 저장됨: member_${MEMBER_ID}_$(date +%Y%m%d_%H%M%S).json"
  
else
  echo ""
  echo "❌ 조회 실패!"
  echo "오류 코드 설명:"
  case $RESULT_CD in
    "3001") echo "  미등록 회원" ;;
    "2001") echo "  회원아이디 오류 (길이나 특수문자 확인)" ;;
    "1001") echo "  기관 상태 오류" ;;
    "1002") echo "  기관 타입 오류" ;;
    "1003") echo "  서비스 타입 오류 (Service-Type: B 확인)" ;;
    *) echo "  알 수 없는 오류" ;;
  esac
fi

echo "========================================="
