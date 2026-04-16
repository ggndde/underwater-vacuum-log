import OpenAI from 'openai';

export async function parseComment(postTitle: string, commentBody: string, commentDateISO: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const prompt = `다음은 사내 네이버 웍스 게시판에 달린 댓글(업무 히스토리)입니다.
게시글의 제목은 "[${postTitle}]"이며 이는 주로 고객사(업체명)를 의미합니다.
이 정보들을 바탕으로 다음 정보를 추출하여 정확한 JSON 형태로 반환해 주세요.

1. customerName: 캘린더에 등록될 "납품/설치 현장(납품처)" 이름입니다. 댓글 내용에 등장하는 중간 거래처(예: '아리스포츠' 등)에 절대 현혹되지 마시고, **반드시 원본 게시글의 제목("[${postTitle}]")에서 순수한 최종 납품 현장 이름만 정제하여 기입하세요.** (예를 들어 제목이 "영등포제3스포츠센터(CP) 납품 건" 이라면 -> "영등포제3스포츠센터(CP)")
2. content: 댓글 내용의 핵심 요약 및 특이사항.
3. isDelivery: 이 댓글 내용이 "납품 일정"이나 "납품 관련" 내용이면 true, 단순 AS나 방문 히스토리면 false.
4. deliveryDate: "내일", "다음주 수요일", "4/08(수) 납품" 등 **실제 납품(설치/방문) 예정일**이 내용에 있다면, 아래에 주어진 댓글 작성일을 기준으로 실제 캘린더 날짜를 완벽히 계산(추론)하여 "YYYY-MM-DD" 형태로 도출해주세요. 주의: "4/01 통화함", "3/25 미팅" 같은 단순 연락/작성일자 표기는 무시하고, **최종적으로 납품/방문하기로 약속한 날짜**만 찾으세요. 도저히 납품 날짜를 추측할 수 없으면 ""로 반환할 것.
(댓글 작성일 기준 날짜: ${new Date(commentDateISO).toLocaleDateString('ko-KR')}, 해당 요일 포함)
5. productName: 어떤 글에서 나온 댓글인지(게시글 제목 "[${postTitle}]")와 댓글 내용을 종합하여, 이 일정의 캘린더용 **대주제**(제품명, 목적 등)를 구체적으로 선정해주세요! 예를들어 "A수영장 - 수중청소기 납품", "기기 오동작 AS방문" 처럼 작성하세요. 특정 불가능하면 "수중청소기 납품"이라고 반환하세요.


[댓글 내용]
${commentBody.replace(/[\uD800-\uDFFF]/g, '')}

[반환 형식(반드시 JSON만 반환할 것)]
{
  "customerName": "업체명",
  "content": "작업 내용 요약",
  "isDelivery": false,
  "deliveryDate": "2024-04-15",
  "productName": "수중청소기"
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Keep it deterministic
    });

    const result = response.choices[0].message.content;
    if (result) {
      return JSON.parse(result) as {
        customerName: string;
        content: string;
        isDelivery: boolean;
        deliveryDate: string;
        productName: string;
      };
    }
  } catch (error) {
    console.error('Failed to parse board comment with OpenAI:', error);
  }
  return null;
}
