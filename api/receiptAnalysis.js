export default async function handler(req, res) {
  // CORS対応
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
 
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
 
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { imageBase64 } = req.body;
 
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
 
    // 環境変数から API キーを取得（サーバー側でのみ使用）
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return res.status(500).json({ error: 'API key not configured' });
    }
 
    // Anthropic API へのリクエスト
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: 'このレシートを読み取り、JSON形式のみで返してください。前置きや説明文やバッククォートは不要です。\n{"shop":"店名","date":"YYYY-MM-DD","items":[{"name":"品目","amount":金額(数値),"category":"カテゴリ"}]}\nカテゴリ候補：①食材、②嗜好品（菓子）、②嗜好品（酒）、③日用品、④書籍・教育、⑤衣類・美容、⑥-A子ども関連（単発）、⑥-B子ども定期課金、⑦-A体験・宿泊、⑦-Bお土産（食品）、⑦-Cお土産（グッズ）、⑧サブスク・デジタル、⑨住まい・家具、⑩-A外食（日常）、⑩-B外食（お出かけ）、⑪交通費、⑫贈答品・お祝い、⑬光熱費・通信、⑭医療費、⑮車・自動車関連、⑯特別費・家計運営コスト\n酒類（ビール等）は②嗜好品（酒）、お菓子類は②嗜好品（菓子）に分類。レジ袋は③日用品。'
              }
            ]
          }
        ]
      })
    });
 
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ error: errorData.error || 'API request failed' });
    }
 
    const data = await response.json();
    
    // レスポンスからテキストを抽出
    const textContent = data.content.find(c => c.type === 'text');
    if (!textContent) {
      return res.status(500).json({ error: 'No text response from API' });
    }
 
    // JSON をパース
    const jsonText = textContent.text.replace(/```json|```/g, '').trim();
    const parsedResult = JSON.parse(jsonText);
 
    // ブラウザに返す
    return res.status(200).json(parsedResult);
 
  } catch (error) {
    console.error('Error in receiptAnalysis:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
 




