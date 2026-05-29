# ASTERION Registration — GAS & 시트 변경 사항
> HTML 구현과 별도로 적용. 구현 완료 후 순서대로 진행.

---

## 1. SignReg 시트 컬럼 추가

기존 컬럼 끝(오른쪽)에 아래 7개 추가.
**기존 컬럼 순서 절대 변경 금지** (구글폼 연동 깨짐).

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| OrderNumber | 텍스트 | 상품주문번호 (진입 키) |
| OrdererName | 텍스트 | 주문자명 (제출 완료 시 삭제) |
| Phone4 | 텍스트 | 전화번호 뒤 4자리 |
| LastStep | 숫자 | 마지막 완료 STEP |
| DraftData | 텍스트 | 중간 저장 JSON |
| RubricStatus | 텍스트 | 루브릭 상태 JSON |
| IsCompleted | 불리언 | 제출 완료 여부 |

---

## 2. Archive 시트 컬럼 추가

| 컬럼명 | 타입 | 설명 | 삭제 시점 |
|--------|------|------|----------|
| AddInfo | 텍스트 | 제출 완료 후 고객 추가 입력 (타임스탬프 누적) | ExpireDate 도래 시 |

---

## 3. GAS doPost() dispatch 추가

```javascript
case 'checkOrderStatus':    return checkOrderStatus(payload);
case 'registerAccess':      return registerAccess(payload);
case 'saveDraftData':       return saveDraftData(payload);
case 'saveRegistration':    return saveRegistration(payload);
case 'saveAddInfo':         return saveAddInfo(payload);
case 'createPrivateRow':    return createPrivateRow(payload);
case 'validateArchiveCode': return validateArchiveCode(payload);
case 'saveEvRegistration':  return saveEvRegistration(payload);
```

---

## 4. createPrivateRow() — 신규 함수

```javascript
function createPrivateRow(payload) {
  const { regName } = payload;
  const ss    = SpreadsheetApp.openById(SIGREG_SS_ID);
  const sheet = ss.getSheetByName('PvReg');
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const tempOrderNo = 'PV_' + Date.now();
  const now = new Date();
  const newRow = new Array(headers.length).fill('');
  newRow[headers.indexOf('타임스탬프')]   = now;
  newRow[headers.indexOf('OrderNumber')] = tempOrderNo;
  newRow[headers.indexOf('OrdererName')] = regName;
  newRow[headers.indexOf('IsCompleted')] = false;
  sheet.appendRow(newRow);
  return { success: true, orderNo: tempOrderNo };
}
```

---

## 5. deleteExpiredData() 수정

AddInfo 삭제 추가:
```
GuestName → ForwardingDate → DeliveryCompletedDate
→ AddInfo  ← 신규 추가
→ TempPDF → ExpireDate → SignReg/EvReg/PvReg 행 전체
```

---

## 6. ai-chat-hub 환경변수 추가

```
NAVER_COMMERCE_CLIENT_ID
NAVER_COMMERCE_CLIENT_SECRET
HUB_INTERNAL_URL
INTERNAL_KEY
```

---

## 7. ai-chat-hub 신규 라우트

| 라우트 | 설명 |
|--------|------|
| POST /api/naver/verify-order | 네이버 주문 검증 (명세 §4-5) |
| POST /api/reg/rubric | 루브릭 실행 (명세 §7-2) |
| POST /api/reg/addinfo | AddInfo 처리 (명세 §7-3) |

---

## 8. 적용 순서

```
1. SignReg 시트 컬럼 추가 (수동)
2. Archive 시트 AddInfo 컬럼 추가 (수동)
3. GAS 함수 추가 + doPost() dispatch 추가
4. GAS 재배포
5. reg_config.js GAS_URL 확인
6. Private Registration end-to-end 테스트
7. ai-chat-hub 환경변수 + 라우트 추가
8. Signature Registration 테스트
```
