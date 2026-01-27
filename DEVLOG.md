# Coffee & Desk Archive - 개발일지

## 프로젝트 개요
개인용 사진 아카이브 웹앱. 커피/책상 사진을 업로드하면 AI가 자동으로 분석하고 피드로 정리.

---

## 2024-01-27 (Day 1) - 기획 및 리서치

### 논의 내용

**1. 프로젝트 목표**
- 커피 사진 → AI가 메뉴 + 카페 위치 자동 인식 → 피드로 아카이빙
- 책상 사진 → AI가 날짜/시간 + 장소 + 이미지 설명(캡션) → 피드로 아카이빙

**2. 주요 기능**
- 사진 업로드 (아이폰에서 PWA로 사용)
- EXIF에서 GPS 추출 → Reverse Geocoding으로 장소 태깅
- AI Vision으로 메뉴/이미지 분석
- 비밀번호 보호 (본인만 접근)

**3. 기술 스택 (확정 예정)**
- 프론트엔드: React + Vite (추천)
- AI: Claude Vision API
- 원본 저장: Cloudflare R2 (10GB 무료)
- 리사이즈 이미지/데이터: 정적 파일로 저장
- 호스팅: jaeyongpark.net/coffee, jaeyongpark.net/desk

**4. 저장 구조**
```
업로드 시:
1. 원본 → Cloudflare R2 (백업용, 나중에 찾기 쉽게)
2. 리사이즈 → 웹 표시용
3. AI 분석 → 메타데이터 저장
```

**5. 배포 방식**
- GitHub repo: `coffee-desk-log` (코드 관리)
- 빌드 후 jaeyongpark.net 서버에 업로드 (기존 Bluehost 활용 가능)

### 리서치 결과

**참고 사례**
- Art in my Coffee (Tumblr) - 커피 라떼아트 사진 아카이브
- Ben Lowy - 아이폰 일상 포토저널
- 개인 포토 블로그들은 대부분 심플한 그리드 레이아웃 사용

**자동 태깅 기술**
- 위치: EXIF GPS + Reverse Geocoding (GeoImgr, Pic2Map 등)
- 메뉴 인식: Claude Vision, GPT-4 Vision, LogMeal API 등

### 다음 단계
- [ ] GitHub repo `coffee-desk-log` 생성
- [ ] 기술 스택 최종 확정 (React + Vite)
- [ ] 프로토타입 개발 시작
- [ ] Cloudflare R2 설정

---

## 메모
- jaeyongpark.net은 현재 싱글페이지 + 하위폴더에 워드프레스 몇 개 있는 구조
- Bluehost 사용 중
- PWA로 아이폰 홈 화면에 앱처럼 추가해서 사용 예정
