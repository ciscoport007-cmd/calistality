import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdmin } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Yetkisiz eri\u015fim' }, { status: 403 });
    }

    const body = await request.json();
    const { llmProvider, llmApiKey, llmBaseUrl, llmModel, llmCustomModel } = body;

    if (!llmApiKey && llmProvider !== 'custom') {
      return NextResponse.json({ error: 'API anahtar\u0131 zorunludur' }, { status: 400 });
    }

    const model = llmModel === '__custom__' ? llmCustomModel : (llmModel || llmCustomModel);
    if (!model) {
      return NextResponse.json({ error: 'Model se\u00e7imi zorunludur' }, { status: 400 });
    }

    const baseUrl = llmBaseUrl || 'https://api.openai.com/v1';

    // Anthropic farkl\u0131 API format\u0131 kullan\u0131r
    if (llmProvider === 'anthropic') {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': llmApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Merhaba! L\u00fctfen sadece "Ba\u011flant\u0131 ba\u015far\u0131l\u0131!" yaz.' }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Anthropic API hatas\u0131: ${errorData.error?.message || response.statusText}` },
          { status: 400 }
        );
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Ba\u011flant\u0131 ba\u015far\u0131l\u0131!';
      return NextResponse.json({ response: text, model, provider: llmProvider });
    }

    // Google Gemini farkl\u0131 API format\u0131
    if (llmProvider === 'google') {
      const url = `${baseUrl}/models/${model}:generateContent?key=${llmApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Merhaba! L\u00fctfen sadece "Ba\u011flant\u0131 ba\u015far\u0131l\u0131!" yaz.' }] }],
          generationConfig: { maxOutputTokens: 100 },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: `Gemini API hatas\u0131: ${errorData.error?.message || response.statusText}` },
          { status: 400 }
        );
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ba\u011flant\u0131 ba\u015far\u0131l\u0131!';
      return NextResponse.json({ response: text, model, provider: llmProvider });
    }

    // OpenAI uyumlu API (OpenAI, Mistral, Groq, DeepSeek, OpenRouter, Custom)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (llmApiKey) {
      headers['Authorization'] = `Bearer ${llmApiKey}`;
    }
    // OpenRouter ek header
    if (llmProvider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://qdms.app';
      headers['X-Title'] = 'QDMS';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Merhaba! L\u00fctfen sadece "Ba\u011flant\u0131 ba\u015far\u0131l\u0131!" yaz.' }],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || errorData.error || response.statusText;
      return NextResponse.json(
        { error: `API hatas\u0131 (${response.status}): ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}` },
        { status: 400 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Ba\u011flant\u0131 ba\u015far\u0131l\u0131!';

    return NextResponse.json({
      response: text,
      model: data.model || model,
      provider: llmProvider,
    });
  } catch (error: any) {
    console.error('LLM test error:', error);
    return NextResponse.json(
      { error: `LLM test s\u0131ras\u0131nda hata: ${error.message || 'Bilinmeyen hata'}` },
      { status: 500 }
    );
  }
}
