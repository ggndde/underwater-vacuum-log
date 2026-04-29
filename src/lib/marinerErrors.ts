export interface MarinerError {
    code: number
    name: string
    cause: string
    solution: string
    category: string
}

export const MARINER_ERRORS: MarinerError[] = [
    // ── 펌프 컨트롤러 ─────────────────────────────────────────────────────────
    {
        code: 101,
        name: 'Pump blocked',
        cause: '펌프 모터 막힘 — 프로펠러와 펌프 하우징 사이 이물질',
        solution: '전원 OFF 후 프로펠러 아래 이물질 제거',
        category: '펌프',
    },
    {
        code: 102,
        name: 'Pump overvoltage',
        cause: '펌프 모터 과전압',
        solution: '서비스 센터 연락',
        category: '펌프',
    },
    {
        code: 103,
        name: 'Pump undervoltage',
        cause: '펌프 모터 저전압 / 전원 공급 부족',
        solution: '케이블-컨트롤러 연결 확인; 해결 안 되면 서비스 센터 연락',
        category: '펌프',
    },
    {
        code: 104,
        name: 'Pump filter error',
        cause: '펌프 모터 필터 오류',
        solution: '서비스 센터 연락',
        category: '펌프',
    },
    // ── 좌측 모터 컨트롤러 ────────────────────────────────────────────────────
    {
        code: 112,
        name: 'Water ingress (left)',
        cause: '좌측 구동 하우징에 물 침투',
        solution: '즉시 로봇을 물에서 꺼내고 서비스 센터 연락',
        category: '좌측 모터',
    },
    {
        code: 113,
        name: 'Drive left overload',
        cause: '좌측 롤러 바퀴 또는 구동 벨트 오염/막힘',
        solution: '좌측 롤러 바퀴 및 구동 벨트 청소; 각 롤러 축 방향 유격 최소 1mm 확인',
        category: '좌측 모터',
    },
    {
        code: 114,
        name: 'Drive left position error',
        cause: '장치가 수평 위치가 아닌 상태에서 기동',
        solution: '수평 위치에서 장치 재기동',
        category: '좌측 모터',
    },
    // ── 우측 모터 컨트롤러 ────────────────────────────────────────────────────
    {
        code: 117,
        name: 'Water ingress (right)',
        cause: '우측 구동 하우징에 물 침투',
        solution: '즉시 로봇을 물에서 꺼내고 서비스 센터 연락',
        category: '우측 모터',
    },
    {
        code: 118,
        name: 'Drive right overload',
        cause: '우측 롤러 바퀴 또는 구동 벨트 오염/막힘',
        solution: '우측 롤러 바퀴 및 구동 벨트 청소; 각 롤러 축 방향 유격 최소 1mm 확인',
        category: '우측 모터',
    },
    {
        code: 119,
        name: 'Drive right position error',
        cause: '장치가 수평 위치가 아닌 상태에서 기동',
        solution: '수평 위치에서 장치 재기동',
        category: '우측 모터',
    },
    // ── 방향 센서 ─────────────────────────────────────────────────────────────
    {
        code: 121,
        name: 'Sensor error front',
        cause: '전방 방향 전환/바닥 감지 센서 오작동',
        solution: '서비스 센터 연락',
        category: '센서',
    },
    {
        code: 122,
        name: 'Sensor error rear',
        cause: '후방 방향 전환/바닥 감지 센서 오작동',
        solution: '서비스 센터 연락',
        category: '센서',
    },
    {
        code: 123,
        name: 'No suitable position for drift compensation',
        cause: '드리프트 보정을 위한 충분히 수평적인 위치에 도달 전에 트랙 끝 감지',
        solution: '로봇 위치 확인 및 재기동',
        category: '센서',
    },
    {
        code: 124,
        name: 'Compass drift not constant',
        cause: '컴퍼스 드리프트 불안정',
        solution: '서비스 센터 연락',
        category: '센서',
    },
    {
        code: 125,
        name: 'No response from compass',
        cause: '컴퍼스 응답 없음',
        solution: '서비스 센터 연락',
        category: '센서',
    },
    {
        code: 130,
        name: 'Compass hardware error',
        cause: '컴퍼스 하드웨어 오류',
        solution: '서비스 센터 연락',
        category: '센서',
    },
    // ── N 패턴 중단 코드 ──────────────────────────────────────────────────────
    {
        code: 140,
        name: 'Unexpected track end while submerging',
        cause: '경사 진입 중 예상치 못한 트랙 끝 감지',
        solution: '풀 형태 확인; 청소 패턴 설정 재조정',
        category: 'N패턴',
    },
    {
        code: 141,
        name: 'Unexpected track end on an incline',
        cause: '경사 구간에서 예상치 못한 트랙 끝 감지',
        solution: '풀 경사도 확인; 청소 패턴 설정 재조정',
        category: 'N패턴',
    },
    {
        code: 142,
        name: 'Track offset not possible',
        cause: '벽 접촉 미감지 / 라이너 풀 흡착 / 바닥 장애물(노즐, 바리어 등)',
        solution: '①펌프 출력 단계적으로 낮추기 ②충격 센서 또는 모터 전류 감지 감도 조정 ③장애물 확인',
        category: 'N패턴',
    },
    // ── H 패턴 중단 코드 ──────────────────────────────────────────────────────
    {
        code: 163,
        name: 'Incline detected before level position',
        cause: '방향 전환 후 후진 중 수평 위치 도달 전에 트랙 끝 감지',
        solution: '장치 수평 여부 확인; "Inc Curve Range" 설정 확인; 방향 전환 감도(전류/충격) 낮추기',
        category: 'H패턴',
    },
    {
        code: 164,
        name: 'Max track length reached before offset',
        cause: '반대 벽에서 출발 후 오프셋 전에 최대 트랙 길이 도달',
        solution: '풀 규격 및 트랙 설정 재조정; 서비스 센터에 녹화 영상 전송',
        category: 'H패턴',
    },
    // ── 공통 상태 메시지 ──────────────────────────────────────────────────────
    {
        code: 181,
        name: 'Robot left water',
        cause: '로봇이 물 밖으로 나간 후 40초 내 복귀 안 됨',
        solution: '①수동으로 로봇을 물 안으로 이동 ②펌프 전원 공급 및 케이블-컨트롤러 연결 확인 ③프로펠러와 펌프 하우징 사이 오염 제거 ④펌프 전류 소비량 7A 미만 시 서비스 센터 연락 ⑤X 패턴 대신 N 또는 H 패턴 사용',
        category: '공통',
    },
    {
        code: 189,
        name: 'Cable length out of tolerance',
        cause: '케이블 테스트 결과 허용 범위 초과',
        solution: '케이블 커넥터 연결 상태 확인',
        category: '공통',
    },
    {
        code: 190,
        name: 'Wire break: ROBOT → REMOTE',
        cause: '로봇에서 리모트로의 신호선 단선',
        solution: '전원 OFF; 케이블 커넥터 올바르게 삽입됐는지 확인; 커넥터 부식 여부 확인',
        category: '공통',
    },
    {
        code: 191,
        name: 'Wire break: REMOTE → ROBOT',
        cause: '리모트에서 로봇으로의 신호선 단선',
        solution: '전원 OFF; 케이블 커넥터 올바르게 삽입됐는지 확인; 커넥터 부식 여부 확인',
        category: '공통',
    },
]

const errorMap = new Map(MARINER_ERRORS.map(e => [e.code, e]))

export function lookupError(code: number): MarinerError | undefined {
    return errorMap.get(code)
}
