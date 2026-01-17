/**
 * Dify API接続テストスクリプト
 * 
 * 使い方:
 * node test-dify.js
 */

const DIFY_API_KEY = 'app-eE6OZ32SJp1Q3qAg8gU8eGvE';
const DIFY_ENDPOINT = 'https://api.dify.ai/v1/workflows/run';

// テスト用の最小限の入力
const testInputs = {
    prompt: 'テストクエスト',
    difficulty: 'medium',
    spot_count: 5,
    theme_tags: '',
    genre_support: '',
    tone_support: '',
    protagonist: '',
    objective: '',
    ending: '',
    when: '',
    where: '',
    purpose: '',
    with_whom: '',
    center_lat: '',
    center_lng: '',
    radius_km: '1',
};

console.log('🔍 Dify API接続テスト開始...\n');
console.log('エンドポイント:', DIFY_ENDPOINT);
console.log('APIキー:', DIFY_API_KEY.substring(0, 10) + '...');
console.log('入力:', JSON.stringify(testInputs, null, 2));
console.log('\n📡 リクエスト送信中...\n');

fetch(DIFY_ENDPOINT, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        inputs: testInputs,
        response_mode: 'blocking',
        user: 'test-user',
    }),
})
    .then(async (response) => {
        console.log('📥 レスポンス受信:');
        console.log('ステータス:', response.status, response.statusText);
        console.log('ヘッダー:', Object.fromEntries(response.headers.entries()));
        console.log('');

        const text = await response.text();

        if (!response.ok) {
            console.error('❌ エラーレスポンス:');
            console.error(text);
            process.exit(1);
        }

        try {
            const data = JSON.parse(text);
            console.log('✅ 成功！');
            console.log('');
            console.log('📊 レスポンス概要:');
            console.log('- workflow_run_id:', data.workflow_run_id);
            console.log('- task_id:', data.task_id);
            console.log('- status:', data.data?.status);
            console.log('- elapsed_time:', data.data?.elapsed_time, 's');
            console.log('- total_tokens:', data.data?.total_tokens);

            if (data.data?.outputs) {
                console.log('');
                console.log('📤 出力データ:');
                console.log(JSON.stringify(data.data.outputs, null, 2));
            }

            if (data.data?.error) {
                console.error('');
                console.error('⚠️ ワークフローエラー:', data.data.error);
            }
        } catch (e) {
            console.error('❌ JSONパースエラー:');
            console.error(text);
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ ネットワークエラー:');
        console.error(error.message);
        process.exit(1);
    });
