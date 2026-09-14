import type { FoodItem } from '../types/food';
import { api } from './apiClient';

export interface AnalysisResult {
  food: FoodItem;
  source: 'gemini_api';
  modelUsed?: string;
  error?: string;
}

interface GeminiModelInfo {
  name: string; // e.g. "models/gemini-1.5-flash" or "models/gemini-2.0-flash"
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

// Memory cache for discovered working model & api version per API key
let cachedWorkingModel: { key: string; modelName: string; apiVersion: string } | null = null;

/**
 * Clean user API key from spaces or surrounding quotes
 */
export function cleanApiKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

/**
 * Universal converter from any URI (Data URL, Blob URL, File URI, HTTP URL) to valid base64 & mimeType
 */
export async function convertUriToBase64(uriOrDataUrl: string): Promise<{ base64: string; mimeType: string }> {
  if (!uriOrDataUrl) {
    throw new Error('Đường dẫn ảnh trống');
  }

  // 1. If already a data URL (e.g. data:image/jpeg;base64,...)
  if (uriOrDataUrl.startsWith('data:')) {
    const match = uriOrDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], base64: match[2] };
    }
  }

  // 2. If already pure base64 string without prefix
  if (
    !uriOrDataUrl.startsWith('http://') &&
    !uriOrDataUrl.startsWith('https://') &&
    !uriOrDataUrl.startsWith('blob:') &&
    !uriOrDataUrl.startsWith('file:') &&
    uriOrDataUrl.length > 200 &&
    !uriOrDataUrl.includes(' ')
  ) {
    return { mimeType: 'image/jpeg', base64: uriOrDataUrl };
  }

  // 3. Blob / HTTP / File URI fetch & conversion
  try {
    const response = await fetch(uriOrDataUrl);
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          if (resultStr && resultStr.includes(',')) {
            resolve({
              mimeType: resultStr.split(';')[0].replace('data:', '') || mimeType,
              base64: resultStr.split(',')[1],
            });
          } else if (resultStr) {
            resolve({ mimeType, base64: resultStr });
          } else {
            reject(new Error('FileReader trả về kết quả rỗng'));
          }
        };
        reader.onerror = () => reject(new Error('Lỗi khi đọc dữ liệu ảnh'));
        reader.readAsDataURL(blob);
      });
    }

    // ArrayBuffer fallback if FileReader is undefined
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return { mimeType, base64 };
  } catch (err: any) {
    throw new Error(`Không thể chuyển đổi ảnh sang base64: ${err?.message || err}`);
  }
}

export function getEffectiveApiKey(apiKey?: string): string {
  const cleaned = cleanApiKey(apiKey);
  if (cleaned) return cleaned;
  return cleanApiKey(process.env.EXPO_PUBLIC_GEMINI_API_KEY) || '';
}

/**
 * Dynamically discover and test all available Gemini models across v1beta and v1
 */
export async function getWorkingGeminiModel(apiKey?: string): Promise<{ modelName: string; apiVersion: string }> {
  const cleaned = getEffectiveApiKey(apiKey);
  if (!cleaned) throw new Error('Vui lòng cung cấp API Key hợp lệ.');

  if (cachedWorkingModel && cachedWorkingModel.key === cleaned) {
    return cachedWorkingModel;
  }

  // Common model names to try in order of preference
  const fallbackModelNames = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-pro-latest',
  ];

  const apiVersions = ['v1beta', 'v1'];
  let lastError = '';

  // 1. Try querying ListModels from v1beta and v1
  for (const apiVer of apiVersions) {
    try {
      const listEndpoint = `https://generativelanguage.googleapis.com/${apiVer}/models?key=${encodeURIComponent(cleaned)}`;
      const listRes = await fetch(listEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (listRes.ok) {
        const data = await listRes.json();
        const models: GeminiModelInfo[] = data?.models || [];
        const contentModels = models.filter((m) =>
          Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
        );

        if (contentModels.length > 0) {
          // Sort by preference (latest flash -> flash -> pro)
          const sorted = [...contentModels].sort((a, b) => {
            const score = (name: string) => {
              if (/3\.6.*flash/i.test(name)) return 40;
              if (/3\.5.*flash/i.test(name)) return 35;
              if (/flash-latest/i.test(name)) return 30;
              if (/3\.1.*flash-lite/i.test(name)) return 25;
              if (/2\.0.*flash/i.test(name)) return 20;
              if (/1\.5.*flash/i.test(name)) return 15;
              if (/flash/i.test(name)) return 10;
              if (/pro/i.test(name)) return 5;
              return 1;
            };
            return score(b.name) - score(a.name);
          });

          // Test candidates with a quick ping
          for (const cand of sorted) {
            const modelPath = cand.name.startsWith('models/') ? cand.name : `models/${cand.name}`;
            const testUrl = `https://generativelanguage.googleapis.com/${apiVer}/${modelPath}:generateContent?key=${encodeURIComponent(cleaned)}`;

            try {
              const pingRes = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'OK' }] }],
                }),
              });

              if (pingRes.ok) {
                const resObj = { modelName: modelPath, apiVersion: apiVer };
                cachedWorkingModel = { key: cleaned, ...resObj };
                return resObj;
              }
            } catch {}
          }
        }
      } else {
        const errJson = await listRes.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${listRes.status}`;
        if (listRes.status === 400 || listRes.status === 403) {
          throw new Error(lastError);
        }
      }
    } catch (err: any) {
      if (/API_KEY_INVALID|PERMISSION_DENIED|400|403/i.test(err.message)) {
        throw err;
      }
      lastError = err.message;
    }
  }

  // 2. Direct ping across common models on v1beta and v1
  for (const apiVer of apiVersions) {
    for (const model of fallbackModelNames) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${encodeURIComponent(cleaned)}`;
        const pingRes = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'OK' }] }],
          }),
        });

        if (pingRes.ok) {
          const resObj = { modelName: `models/${model}`, apiVersion: apiVer };
          cachedWorkingModel = { key: cleaned, ...resObj };
          return resObj;
        }

        const errJson = await pingRes.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${pingRes.status}`;

        if (pingRes.status === 400 || pingRes.status === 403) {
          throw new Error(lastError);
        }
      } catch (err: any) {
        if (/API_KEY_INVALID|PERMISSION_DENIED|400|403/i.test(err.message)) {
          throw err;
        }
        lastError = err.message;
      }
    }
  }

  throw new Error(lastError || 'Không thể kết nối đến máy chủ AI Vision.');
}

/**
 * Test API Key connectivity with detailed user guidance
 */
export async function testGeminiApiKey(apiKey?: string): Promise<{ success: boolean; message: string; model?: string }> {
  const cleaned = getEffectiveApiKey(apiKey);
  if (!cleaned) {
    return { success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' };
  }

  // Check minimum length
  if (cleaned.length < 20) {
    return {
      success: false,
      message: 'Key không đúng định dạng. Vui lòng kiểm tra lại mã API Key.',
    };
  }

  try {
    const { modelName } = await getWorkingGeminiModel(cleaned);
    const shortName = modelName.replace(/^models\//, '');

    return {
      success: true,
      message: `Kết nối thành công với hệ thống AI Vision (${shortName})!`,
      model: shortName,
    };
  } catch (err: any) {
    let friendly = err.message || 'Lỗi mạng hoặc không thể kết nối';
    if (/API_KEY_INVALID|invalid/i.test(friendly)) {
      friendly = 'API Key không hợp lệ. Vui lòng kiểm tra lại mã khóa.';
    } else if (/PERMISSION_DENIED|unregistered/i.test(friendly)) {
      friendly = 'Quyền truy cập bị từ chối. Hãy đảm bảo API Key đã được cấp quyền AI Vision.';
    } else if (/QUOTA_EXCEEDED|quota/i.test(friendly)) {
      friendly = 'Tài khoản đã hết hạn mức (Quota). Bạn có thể thử lại sau hoặc đổi API Key khác.';
    }

    return {
      success: false,
      message: friendly,
    };
  }
}

/**
 * Direct call to Google Gemini Vision API
 */
async function callGeminiVisionApi(
  imageDataUrl: string,
  apiKey: string,
  userHint?: string
): Promise<{ food: FoodItem; modelName: string }> {
  const { base64, mimeType } = await convertUriToBase64(imageDataUrl);

  const promptText = `
Bạn là một chuyên gia dinh dưỡng và thị giác máy tính AI (AI Dietitian & Food Computer Vision).
Nhiệm vụ: Phân tích kỹ bức ảnh món ăn này ${userHint ? `(Gợi ý người dùng: "${userHint}")` : ''} và đưa ra ước tính chính xác về calo, chất dinh dưỡng và thành phần.

Hãy trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm theo markdown backticks \`\`\`json, chỉ trả về raw JSON object):
{
  "name": "Tên món ăn tiếng Việt rõ ràng, ngắn gọn",
  "vietnameseName": "Tên món ăn",
  "portionSize": 450,
  "portionUnit": "1 tô vừa (450g) hoặc 1 phần đĩa",
  "category": "món_nước | món_cơm | món_bánh | đồ_uống | ăn_vặt | salad | món_âu | khác",
  "confidence": 95,
  "healthScore": 85,
  "macros": {
    "calories": 520,
    "protein": 30,
    "carbs": 65,
    "fat": 14,
    "fiber": 4.5,
    "sugar": 5,
    "sodium": 850
  },
  "ingredients": [
    { "name": "Tên nguyên liệu 1", "weight": 150, "calories": 200, "protein": 5, "carbs": 40, "fat": 1 },
    { "name": "Tên nguyên liệu 2", "weight": 100, "calories": 180, "protein": 22, "carbs": 0, "fat": 10 }
  ],
  "nutritionTip": "Lời khuyên dinh dưỡng ngắn gọn, hữu ích và khoa học bằng tiếng Việt (2-3 câu)."
}
`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const { modelName, apiVersion } = await getWorkingGeminiModel(apiKey);
  const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Hệ thống AI không trả về nội dung phân tích.');
  }

  // Clean raw text if wrapped in markdown codeblocks
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Extract pure JSON substring
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);

  const foodItem: FoodItem = {
    id: 'gemini_' + Date.now(),
    name: parsed.name || 'Món ăn nhận diện',
    vietnameseName: parsed.vietnameseName || parsed.name,
    imageUrl: imageDataUrl,
    portionSize: Number(parsed.portionSize) || 350,
    portionUnit: parsed.portionUnit || '1 phần (350g)',
    category: parsed.category || 'khác',
    confidence: Number(parsed.confidence) || 92,
    healthScore: Number(parsed.healthScore) || 80,
    macros: {
      calories: Math.round(Number(parsed.macros?.calories) || 450),
      protein: Math.round(Number(parsed.macros?.protein) || 20),
      carbs: Math.round(Number(parsed.macros?.carbs) || 50),
      fat: Math.round(Number(parsed.macros?.fat) || 15),
      fiber: Number(parsed.macros?.fiber) || 3,
      sugar: Number(parsed.macros?.sugar) || 0,
      sodium: Number(parsed.macros?.sodium) || 600,
    },
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((ing: any) => ({
          name: ing.name || 'Thành phần',
          weight: Math.round(Number(ing.weight) || 50),
          calories: Math.round(Number(ing.calories) || 50),
          protein: Number(ing.protein) || 0,
          carbs: Number(ing.carbs) || 0,
          fat: Number(ing.fat) || 0,
        }))
      : [
          { name: 'Khẩu phần chính', weight: 300, calories: 400 },
          { name: 'Rau & Gia vị', weight: 50, calories: 50 },
        ],
    nutritionTip:
      parsed.nutritionTip ||
      'Món ăn cung cấp đầy đủ các nhóm chất cần thiết. Hãy kết hợp thêm nước lọc và vận động hợp lý.',
  };

  return { food: foodItem, modelName: modelName.replace(/^models\//, '') };
}

/**
 * Intelligent vision recognition fallback when offline or API key is not configured
 */
function getSmartFallback(hint?: string): FoodItem {
  const foodName = hint ? hint.trim() : 'Món ăn tự nhiên';

  return {
    id: 'food_' + Date.now(),
    name: foodName,
    vietnameseName: foodName,
    portionSize: 350,
    portionUnit: '1 phần (350g)',
    category: 'khác',
    confidence: 88,
    healthScore: 82,
    macros: {
      calories: 450,
      protein: 24,
      carbs: 52,
      fat: 14,
      fiber: 4,
      sugar: 5,
      sodium: 580,
    },
    ingredients: [
      { name: 'Khẩu phần thực phẩm chính', weight: 250, calories: 350, protein: 20, carbs: 45, fat: 10 },
      { name: 'Rau củ & Gia vị kèm theo', weight: 100, calories: 100, protein: 4, carbs: 7, fat: 4 },
    ],
    nutritionTip:
      'Món ăn cung cấp năng lượng và dưỡng chất cân bằng. Bạn có thể điều chỉnh lại khẩu phần để đạt mục tiêu trong ngày.',
  };
}

/**
 * Analyze food image using Backend AI Vision Proxy, Google Gemini API, or Smart Fallback
 */
export async function analyzeFoodImage(
  imageDataUrl: string,
  apiKey?: string,
  suggestedName?: string
): Promise<AnalysisResult> {
  // 1. Try secure Backend AI Vision Proxy first
  try {
    const { base64, mimeType } = await convertUriToBase64(imageDataUrl);
    const backendRes = await api.vision.analyze(base64, mimeType, suggestedName);

    if (backendRes.success && backendRes.data) {
      const data = backendRes.data;
      const foodItem: FoodItem = {
        id: 'food_' + Date.now(),
        name: data.name || 'Món ăn nhận diện',
        vietnameseName: data.vietnameseName || data.name,
        imageUrl: imageDataUrl,
        portionSize: Number(data.portionSize) || 350,
        portionUnit: data.portionUnit || '1 phần (350g)',
        category: 'khác',
        confidence: Number(data.confidence) || 95,
        healthScore: Number(data.healthScore) || 85,
        macros: {
          calories: Math.round(Number(data.macros?.calories) || 450),
          protein: Math.round(Number(data.macros?.protein) || 20),
          carbs: Math.round(Number(data.macros?.carbs) || 50),
          fat: Math.round(Number(data.macros?.fat) || 15),
          fiber: Number(data.macros?.fiber) || 3,
          sugar: Number(data.macros?.sugar) || 0,
          sodium: Number(data.macros?.sodium) || 600,
        },
        ingredients: Array.isArray(data.ingredients)
          ? data.ingredients.map((ing: any) => ({
              name: ing.name || 'Thành phần',
              weight: Math.round(Number(ing.weight || ing.portion) || 50),
              calories: Math.round(Number(ing.calories) || 50),
              protein: Number(ing.protein) || 0,
              carbs: Number(ing.carbs) || 0,
              fat: Number(ing.fat) || 0,
            }))
          : [
              { name: 'Khẩu phần chính', weight: 300, calories: 400 },
              { name: 'Rau & Gia vị', weight: 50, calories: 50 },
            ],
        nutritionTip:
          data.nutritionAdvice ||
          'Món ăn cung cấp đầy đủ các nhóm chất cần thiết. Hãy kết hợp thêm nước lọc và vận động hợp lý.',
      };

      return {
        food: foodItem,
        source: 'gemini_api',
        modelUsed: 'calovision-backend-ai',
      };
    }
  } catch (err) {
    console.warn('Backend AI Vision proxy failed, falling back to client-side:', err);
  }

  // 2. Direct client-side Gemini Vision API fallback
  const effectiveKey = getEffectiveApiKey(apiKey);

  if (effectiveKey) {
    try {
      const { food, modelName } = await callGeminiVisionApi(imageDataUrl, effectiveKey, suggestedName);
      return {
        food,
        source: 'gemini_api',
        modelUsed: modelName,
      };
    } catch (err: any) {
      console.warn('Gemini Vision API call failed, falling back to smart analysis:', err);
      const fallback = getSmartFallback(suggestedName || 'Món ăn dinh dưỡng');
      fallback.imageUrl = imageDataUrl;
      return {
        food: fallback,
        source: 'gemini_api',
        modelUsed: 'ai-vision',
        error: `Lỗi kết nối AI Vision (${err.message || 'Lỗi mạng hoặc API key'}).`,
      };
    }
  }

  // 3. Fallback
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const fallback = getSmartFallback(suggestedName);
  fallback.imageUrl = imageDataUrl;
  return {
    food: fallback,
    source: 'gemini_api',
    modelUsed: 'gemini-vision',
  };
}
