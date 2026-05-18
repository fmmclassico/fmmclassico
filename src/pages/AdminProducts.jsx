import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, X, Pencil, Plus, Trash2, ImagePlus,
  Loader2, Check, Eye, EyeOff, RotateCcw, Video,
  Bold, AlignLeft, AlignCenter, AlignRight, Wand2, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// ── Category / Brand / Subcategory Data ──────────────────────────────────────

const MAIN_CATEGORY_GROUPS = [
  { label: 'Phones', id: 'phones' },
  { label: 'Phone Accessories', id: 'phone_accessories' },
  { label: 'Electronics', id: 'electronics' },
  { label: 'Home Appliances', id: 'home_appliances_group' },
];

const GROUP_CATEGORIES = {
  phones: [{ value: 'phones', label: 'Phones' }],
  phone_accessories: [
    { value: 'phone_cases', label: 'Phone Cases' },
    { value: 'chargers', label: 'Chargers' },
    { value: 'earphones', label: 'Earphones' },
    { value: 'cables', label: 'Cables' },
    { value: 'power_banks', label: 'Power Banks' },
    { value: 'screen_protectors', label: 'Screen Protectors' },
    { value: 'holders', label: 'Holders & Mounts' },
    { value: 'speakers', label: 'Speakers' },
    { value: 'smart_watches', label: 'Smart Watches' },
  ],
  electronics: [{ value: 'electronic_appliances', label: 'Electronic Appliances' }],
  home_appliances_group: [{ value: 'home_appliances', label: 'Home Appliances' }],
};

const GROUP_BRANDS = {
  phones: ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Other'],
  phone_accessories: ['Apple', 'Samsung', 'Oraimo', 'JBL', 'Sony', 'LG', 'Other'],
  electronics: ['Samsung', 'Sony', 'LG', 'TCL', 'Hisense', 'Midea', 'Other'],
  home_appliances_group: ['Samsung', 'LG', 'Hisense', 'TCL', 'Midea', 'Roch', 'Silver Crest', 'Nasco', 'Hoffman', 'Other'],
};

const BRAND_SUBCATEGORIES = {
  phones: {
    Apple: ['iPhone SE', 'iPhone 11', 'iPhone 12 Series', 'iPhone 13 Series', 'iPhone 14 Series', 'iPhone 15 Series'],
    Samsung: ['Galaxy A Series', 'Galaxy S Series', 'Galaxy Z Fold/Flip'],
    Tecno: ['Spark Series', 'Camon Series', 'Phantom Series', 'Pop Series'],
    Infinix: ['Hot Series', 'Note Series', 'Smart Series', 'Zero Series'],
    Itel: ['A Series', 'S Series', 'P Series (Big Battery)'],
  },
  phone_cases: { Apple: ['iPhone Cases'], Samsung: ['Galaxy Cases'], Oraimo: ['Universal Cases'] },
  chargers: {
    Apple: ['Apple 20W Charger', 'MagSafe Charger', 'Apple Car Charger'],
    Samsung: ['Samsung Fast Charger', 'Samsung Wireless Charger'],
    Oraimo: ['Fast Charger 20W', 'Car Charger', 'Wireless Charger', 'Multi-port Charger'],
  },
  earphones: {
    Apple: ['AirPods', 'AirPods Pro', 'AirPods Max'],
    Samsung: ['Galaxy Buds', 'Galaxy Buds Pro'],
    Oraimo: ['FreePods (Wireless Earbuds)', 'Neckband Earphones', 'Wired Earphones', 'Bluetooth Headphones'],
    JBL: ['JBL Tune Earbuds', 'JBL Free X', 'JBL Live Series', 'JBL Wired Earphones'],
    Sony: ['Sony WF Series (Earbuds)', 'Sony WH Series (Headphones)', 'Sony Wired Earphones'],
  },
  cables: {
    Apple: ['Lightning Cable', 'USB-C to Lightning'],
    Samsung: ['USB-C Cable', 'Samsung Data Cable'],
    Oraimo: ['USB-C Cable', 'Lightning Cable', 'Micro USB Cable', 'Braided Cable'],
  },
  power_banks: {
    Oraimo: ['Power Bank 10,000mAh', 'Power Bank 20,000mAh', 'Solar Power Bank'],
    Samsung: ['Samsung Power Bank'],
  },
  screen_protectors: { Apple: ['iPhone Screen Protector'], Samsung: ['Galaxy Screen Protector'] },
  holders: { Oraimo: ['Car Phone Holder', 'Desk Stand'], Samsung: ['Samsung Phone Stand'] },
  speakers: {
    JBL: ['JBL Go', 'JBL Flip', 'JBL Charge', 'JBL Xtreme', 'JBL PartyBox'],
    Sony: ['Sony Portable Speaker', 'Sony Party Speaker'],
    Oraimo: ['Bluetooth Speaker', 'Mini Speaker'],
  },
  smart_watches: {
    Apple: ['Apple Watch SE', 'Apple Watch Series 8', 'Apple Watch Ultra'],
    Samsung: ['Galaxy Watch'],
    Oraimo: ['Oraimo Watch', 'Oraimo Watch Pro'],
  },
  electronic_appliances: {
    Samsung: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    Sony: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Soundbar', 'Home Theatre'],
    LG: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'OLED TV', 'Soundbar'],
    TCL: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'Android TV', '4K UHD TV'],
    Hisense: ['Smart TV 32"', 'Smart TV 43"', 'Smart TV 55"', 'Smart TV 65"', 'QLED TV'],
    Midea: ['Air Conditioner Split Unit', 'Air Purifier'],
  },
  home_appliances: {
    Samsung: ['Refrigerator', 'Washing Machine', 'Microwave', 'Air Conditioner'],
    LG: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave'],
    Hisense: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Microwave'],
    TCL: ['Refrigerator', 'Washing Machine', 'Air Conditioner'],
    Midea: ['Refrigerator', 'Washing Machine', 'Air Conditioner', 'Microwave', 'Rice Cooker', 'Blender'],
    Roch: ['Refrigerator (Single Door)', 'Refrigerator (Double Door)', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Standing Fan', 'Air Conditioner'],
    'Silver Crest': ['Blender', 'Rice Cooker', 'Electric Kettle', 'Microwave', 'Toaster', 'Sandwich Maker', 'Food Processor', 'Juicer', 'Standing Fan'],
    Nasco: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Blender', 'Rice Cooker', 'Electric Kettle', 'Standing Fan', 'Air Conditioner'],
    Hoffman: ['Refrigerator', 'Chest Freezer', 'Washing Machine', 'Air Conditioner', 'Standing Fan', 'Blender', 'Rice Cooker', 'Electric Kettle'],
  },
};

const EMPTY_FORM = {
  name: '', description: '', price: '', original_price: '',
  main_group: '', category: '', brand: '', customBrand: '', subcategory: '',
  stock: '', featured: false, flash_sale: false,
  donkomi: false, review_enabled: true, rating: '', reviews_count: '',
  image_url: '', image_urls: [], video_url: '', flash_sale_end: '',
  hidden: false, deleted: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadFile(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Strip all data-* attributes (and other junk attrs) from an HTML string.
 * This prevents pasted or AI-generated content from injecting data-start,
 * data-end, data-section-id etc. into the saved description.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return html
    // Remove all data-* attributes
    .replace(/\s+data-[\w-]+=(?:"[^"]*"|'[^']*')/g, '')
    // Remove leftover empty attribute strings
    .replace(/\s+(?:class|id|style)=(?:"[^"]*"|'[^']*')/g, '')
    // Collapse excess whitespace between tags
    .replace(/>\s{2,}</g, '>\n<')
    .trim();
}

/**
 * Call the Anthropic API.
 * When running inside Claude.ai artifacts, NO API key is needed —
 * the platform injects auth automatically. Including a key header would
 * actually cause a CORS / auth conflict, so we omit it entirely.
 */
async function callClaude({ system, userMessage, maxTokens = 1000, useWebSearch = false }) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userMessage }],
  };
  if (system) body.system = system;

  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (useWebSearch) {
    headers['anthropic-beta'] = 'web-search-2025-03-05';
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();

  // Collect all text blocks (handles mixed tool_use + text responses)
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text || '')
    .join('')
    .trim();

  return text;
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const isUserTyping = useRef(false);
  const lastExternalValue = useRef(value);

  // Initialise content once on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeHtml(value || '');
      lastExternalValue.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when an external value change arrives (e.g. AI writes a description)
  // but NOT while the user is actively typing
  useEffect(() => {
    if (
      editorRef.current &&
      value !== lastExternalValue.current &&
      !isUserTyping.current
    ) {
      editorRef.current.innerHTML = sanitizeHtml(value || '');
      lastExternalValue.current = value;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current?.innerHTML || '';
    lastExternalValue.current = html;
    onChange(html);
  };

  const handleInput = () => {
    isUserTyping.current = true;
    const html = editorRef.current?.innerHTML || '';
    lastExternalValue.current = html;
    onChange(html);
    clearTimeout(handleInput._timer);
    handleInput._timer = setTimeout(() => { isUserTyping.current = false; }, 300);
  };

  // FIX: Strip data-* and other junk attributes on paste so they are never saved
  const handlePaste = (e) => {
    e.preventDefault();
    let html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      html = sanitizeHtml(html);
      document.execCommand('insertHTML', false, html);
    } else {
      document.execCommand('insertText', false, text);
    }
    const result = editorRef.current?.innerHTML || '';
    lastExternalValue.current = result;
    onChange(result);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <button type="button" title="Bold" onClick={() => exec('bold')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Italic" onClick={() => exec('italic')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors font-serif italic text-sm font-bold">I</button>
        <button type="button" title="Underline" onClick={() => exec('underline')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors underline text-sm font-bold">U</button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Align Left" onClick={() => exec('justifyLeft')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Align Center" onClick={() => exec('justifyCenter')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Align Right" onClick={() => exec('justifyRight')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <select
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
        </select>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button type="button" title="Bullet List" onClick={() => exec('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-sm font-bold">• List</button>
        <button type="button" title="Numbered List" onClick={() => exec('insertOrderedList')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-sm font-bold">1. List</button>
        <button type="button" title="Clear Formatting" onClick={() => exec('removeFormat')}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors text-xs text-gray-500">Clear</button>
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[150px] px-3 py-2 text-sm text-gray-700 focus:outline-none"
        style={{ lineHeight: '1.6' }}
      />
    </div>
  );
}

// ── Video Preview ─────────────────────────────────────────────────────────────
function VideoPreview({ url }) {
  if (!url) return null;

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Product Video"
        />
      </div>
    );
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Product Video"
        />
      </div>
    );
  }

  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || url.includes('blob:')) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black">
        <video src={url} controls className="w-full h-full" />
      </div>
    );
  }

  return (
    <p className="text-xs text-orange-500 mt-1">
      ⚠ Could not preview this URL. It will still be saved.
    </p>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AiPanel({ form, setForm }) {
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiFullLoading, setAiFullLoading] = useState(false);
  const [aiTypeLoading, setAiTypeLoading] = useState(false);
  const [aiBrandLoading, setAiBrandLoading] = useState(false);

  const effectiveBrand = form.brand === 'Other' ? form.customBrand : form.brand;
  const allBrands = [...new Set(Object.values(GROUP_BRANDS).flat().filter(b => b !== 'Other'))];

  // Resolve a detected brand string → { brand, customBrand }
  const resolveBrand = (detected) => {
    const trimmed = (detected || '').trim();
    const knownMatch = allBrands.find(b => b.toLowerCase() === trimmed.toLowerCase());
    if (knownMatch) return { brand: knownMatch, customBrand: '' };
    if (trimmed) return { brand: 'Other', customBrand: trimmed };
    return {};
  };

  // ── 1. Generate Description only ─────────────────────────────────────────
  const handleAiDescription = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiDescLoading(true);
    try {
      const raw = await callClaude({
        system: `You are a professional product copywriter for an electronics and accessories store in Ghana.
Write compelling, accurate product descriptions in clean HTML using ONLY these tags: <h2>, <p>, <ul>, <li>, <strong>, <br>.
Do NOT use <html>, <body>, <head>, <style>, <h1>, or ANY attributes on any tag (no class, id, data-*, style etc.).
Structure: 1-2 paragraph overview, Key Features as <ul><li> list, Specifications as <ul><li> list if known.
Return ONLY the HTML content — no preamble, no explanation, no markdown fences, no code blocks.`,
        userMessage: `Write a full HTML product description for:
Product: ${form.name}
Brand: ${effectiveBrand || 'Unknown'}
Category: ${form.category || 'Electronics'}
Product Type: ${form.subcategory || ''}

Make it professional and appealing for online shoppers in Ghana. Use real specs and features.`,
        maxTokens: 1000,
        useWebSearch: true,
      });

      setForm(f => ({ ...f, description: sanitizeHtml(raw) }));
      toast.success('✨ AI description generated!');
    } catch (err) {
      toast.error(`AI description failed: ${err.message}`);
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── 2. Auto-fill ALL fields ───────────────────────────────────────────────
  const handleAiFullDetect = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiFullLoading(true);
    try {
      const raw = await callClaude({
        system: `You are a product classification and content expert for an electronics store in Ghana.
Return ONLY a valid JSON object with exactly these keys:
{
  "brand": "detected brand name or empty string",
  "main_group": "one of: phones | phone_accessories | electronics | home_appliances_group",
  "category": "one of: phones | phone_cases | chargers | earphones | cables | power_banks | screen_protectors | holders | speakers | smart_watches | electronic_appliances | home_appliances",
  "subcategory": "specific product type",
  "description": "full HTML using ONLY <h2><p><ul><li><strong><br> — NO attributes on any tag whatsoever"
}
CRITICAL RULES:
- Return ONLY raw JSON. No markdown, no backticks, no explanation.
- In the description HTML, do NOT add class, id, style, data-*, or any other attribute to any tag.`,
        userMessage: `Product name: "${form.name}"
Known brands: ${allBrands.join(', ')}

Detect all fields and write a clean HTML description with actual specs.`,
        maxTokens: 1500,
        useWebSearch: true,
      });

      // Strip accidental markdown fences then extract the JSON object
      let jsonString = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);

      const updates = {};
      if (parsed.brand) Object.assign(updates, resolveBrand(parsed.brand));
      if (parsed.main_group) updates.main_group = parsed.main_group;
      if (parsed.category) updates.category = parsed.category;
      if (parsed.subcategory) updates.subcategory = parsed.subcategory;
      if (parsed.description) updates.description = sanitizeHtml(parsed.description);

      setForm(f => ({ ...f, ...updates }));
      toast.success('✨ AI filled in all product details!');
    } catch (err) {
      toast.error(`AI auto-fill failed: ${err.message}`);
    } finally {
      setAiFullLoading(false);
    }
  };

  // ── 3. Detect Product Type only ───────────────────────────────────────────
  const handleAiDetectType = async () => {
    if (!form.name) { toast.error('Enter product name first'); return; }
    setAiTypeLoading(true);
    try {
      const options = ((BRAND_SUBCATEGORIES[form.category] || {})[effectiveBrand] || []);
      const optionsList = options.length ? options.join('\n- ') : 'Other';
      const detected = await callClaude({
        system: `You are a product classification expert.
Reply with ONLY the exact product type from the provided list.
No explanation, no punctuation, nothing else.
If none match, reply: Other`,
        userMessage: `Product: "${form.name}"
Brand: "${effectiveBrand || ''}"
Category: "${form.category || ''}"

Available product types:
- ${optionsList}

Which type matches best?`,
        maxTokens: 50,
      });
      const trimmed = detected.trim();
      const match = options.find(o => o.toLowerCase() === trimmed.toLowerCase()) || trimmed;
      setForm(f => ({ ...f, subcategory: match }));
      toast.success(`AI detected type: ${match}`);
    } catch (err) {
      toast.error(`AI type detection failed: ${err.message}`);
    } finally {
      setAiTypeLoading(false);
    }
  };

  // ── 4. Detect Brand only ──────────────────────────────────────────────────
  const handleAiDetectBrand = async () => {
    if (!form.name) { toast.error('Enter product name first'); return; }
    setAiBrandLoading(true);
    try {
      const detected = await callClaude({
        system: `You are a product expert. Given a product name, identify the brand.
If it matches one from the provided list (case-insensitive), return that exact name from the list.
If it is a different brand not in the list, return the brand name as-is.
Reply with ONLY the brand name — no explanation, no punctuation, no quotes.`,
        userMessage: `Product name: "${form.name}"
Known brands: ${allBrands.join(', ')}
What is the brand?`,
        maxTokens: 30,
      });
      const resolved = resolveBrand(detected);
      setForm(f => ({ ...f, ...resolved }));
      const displayName = resolved.brand === 'Other' ? resolved.customBrand : resolved.brand;
      toast.success(`AI detected brand: ${displayName}`);
    } catch (err) {
      toast.error(`AI brand detection failed: ${err.message}`);
    } finally {
      setAiBrandLoading(false);
    }
  };

  return (
    <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <span className="font-semibold text-sm text-purple-800">AI Assistant</span>
        <span className="text-xs text-purple-500">— Enter product name above, then use any button</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Auto-fill Everything */}
        <button
          type="button"
          onClick={handleAiFullDetect}
          disabled={aiFullLoading || !form.name}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {aiFullLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="h-3.5 w-3.5" />}
          {aiFullLoading ? 'Searching & Detecting…' : '✨ Auto-fill Everything'}
        </button>

        {/* Generate Description */}
        <button
          type="button"
          onClick={handleAiDescription}
          disabled={aiDescLoading || !form.name}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {aiDescLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {aiDescLoading ? 'Writing…' : 'Generate Description'}
        </button>

        {/* Detect Brand */}
        <button
          type="button"
          onClick={handleAiDetectBrand}
          disabled={aiBrandLoading || !form.name}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {aiBrandLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="h-3.5 w-3.5" />}
          {aiBrandLoading ? 'Detecting…' : 'Detect Brand'}
        </button>

        {/* Detect Product Type */}
        <button
          type="button"
          onClick={handleAiDetectType}
          disabled={aiTypeLoading || !form.name}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {aiTypeLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Wand2 className="h-3.5 w-3.5" />}
          {aiTypeLoading ? 'Detecting…' : 'Detect Product Type'}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [user, setUser] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.removeQueries({ queryKey: ['products'] });
    queryClient.removeQueries({ queryKey: ['products-admin'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-admin'] });
  };

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAdmin(u?.role === 'admin');
    }).catch(() => {});
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => base44.entities.Product.list('-created_date', 500),
    enabled: isAdmin,
  });

  const products = allProducts.filter(p => !p.deleted);
  const trashedProducts = allProducts.filter(p => p.deleted);
  const displayed = activeTab === 'active' ? products : trashedProducts;

  // ── Save / Update mutation ────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Resolve brand: if "Other" use customBrand value, else use brand
      const finalBrand =
        data.brand === 'Other' && data.customBrand?.trim()
          ? data.customBrand.trim()
          : data.brand === 'Other'
            ? ''
            : data.brand;

      // Strip UI-only fields before saving
      const { main_group, customBrand, ...rest } = data;

      const payload = {
        ...rest,
        brand: finalBrand,
        // Sanitize description before saving so no stray attributes persist
        description: sanitizeHtml(data.description || ''),
        // Numeric fields
        price: parseFloat(data.price) || 0,
        original_price:
          data.original_price !== '' && data.original_price != null
            ? parseFloat(data.original_price)
            : undefined,
        stock:
          data.stock !== '' && data.stock != null
            ? parseInt(data.stock, 10)
            : undefined,
        rating:
          data.rating !== '' && data.rating != null
            ? parseFloat(data.rating)
            : undefined,
        reviews_count:
          data.reviews_count !== '' && data.reviews_count != null
            ? parseInt(data.reviews_count, 10)
            : undefined,
        // Booleans
        featured: Boolean(data.featured),
        flash_sale: Boolean(data.flash_sale),
        donkomi: Boolean(data.donkomi),
        review_enabled: data.review_enabled !== false,
        hidden: Boolean(data.hidden),
        deleted: Boolean(data.deleted),
      };

      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, payload);
      }
      return base44.entities.Product.create(payload);
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => {
      toast.error(`Save failed: ${err?.message || 'Unknown error'}`);
      console.error('Save error:', err);
    },
  });

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const softDelete = async (id) => {
    await base44.entities.Product.update(id, { deleted: true, hidden: true });
    invalidate();
    toast.success('Product moved to Trash');
  };

  const restore = async (id) => {
    await base44.entities.Product.update(id, { deleted: false, hidden: false });
    invalidate();
    toast.success('Product restored');
  };

  const permanentDelete = async (id) => {
    if (!confirm('Permanently delete? This cannot be undone.')) return;
    await base44.entities.Product.delete(id);
    invalidate();
    toast.success('Permanently deleted');
  };

  const toggleVisibility = async (product) => {
    const next = !product.hidden;
    await base44.entities.Product.update(product.id, { hidden: next });
    invalidate();
    toast.success(next ? 'Product hidden from users' : 'Product now visible to users');
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Move ${selectedIds.length} product(s) to trash?`)) return;
    setBulkDeleting(true);
    await Promise.all(selectedIds.map(id =>
      base44.entities.Product.update(id, { deleted: true, hidden: true })
    ));
    invalidate(); setSelectedIds([]); setBulkDeleting(false);
    toast.success(`${selectedIds.length} product(s) moved to trash`);
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    await Promise.all(selectedIds.map(id =>
      base44.entities.Product.update(id, { deleted: false, hidden: false })
    ));
    invalidate(); setSelectedIds([]); setBulkDeleting(false);
    toast.success(`${selectedIds.length} product(s) restored`);
  };

  // ── Upload handlers ───────────────────────────────────────────────────────
  const handleUploadMain = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, image_url: url }));
      toast.success('Main image uploaded!');
    } catch { toast.error('Image upload failed'); }
    finally { setUploadingMain(false); e.target.value = ''; }
  };

  const handleUploadExtra = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingExtra(true);
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f)));
      setForm(f => ({ ...f, image_urls: [...(f.image_urls || []), ...urls].slice(0, 5) }));
      toast.success(`${urls.length} image(s) uploaded!`);
    } catch { toast.error('Extra image upload failed'); }
    finally { setUploadingExtra(false); e.target.value = ''; }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, video_url: url }));
      toast.success('Video uploaded!');
    } catch { toast.error('Video upload failed'); }
    finally { setUploadingVideo(false); e.target.value = ''; }
  };

  // ── Edit / New ────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
    setEditingProduct(product);
    const cat = product.category || '';
    let main_group = '';
    if (cat === 'phones') main_group = 'phones';
    else if (cat === 'electronic_appliances') main_group = 'electronics';
    else if (cat === 'home_appliances') main_group = 'home_appliances_group';
    else if (cat) main_group = 'phone_accessories';

    const knownBrands = Object.values(GROUP_BRANDS).flat();
    const savedBrand = product.brand || '';
    const isKnownBrand = knownBrands.includes(savedBrand);

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      original_price: product.original_price ?? '',
      main_group,
      category: cat,
      brand: isKnownBrand ? savedBrand : (savedBrand ? 'Other' : ''),
      customBrand: isKnownBrand ? '' : savedBrand,
      subcategory: product.subcategory || '',
      stock: product.stock ?? '',
      featured: product.featured || false,
      flash_sale: product.flash_sale || false,
      donkomi: product.donkomi || false,
      review_enabled: product.review_enabled !== false,
      rating: product.rating ?? '',
      reviews_count: product.reviews_count ?? '',
      image_url: product.image_url || '',
      image_urls: product.image_urls || [],
      video_url: product.video_url || '',
      flash_sale_end: product.flash_sale_end || '',
      hidden: product.hidden || false,
      deleted: product.deleted || false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNew = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === displayed.length ? [] : displayed.map(p => p.id));

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!isAdmin && user) return (
    <div className="p-8 text-center text-gray-500">Admin access required.</div>
  );
  if (!user) return (
    <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
        <Button onClick={handleNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setActiveTab('active'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Active ({products.length})
        </button>
        <button
          onClick={() => { setActiveTab('trash'); setSelectedIds([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'trash' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Trash ({trashedProducts.length})
        </button>
      </div>

      {/* Bulk actions bar */}
      {displayed.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selectedIds.length === displayed.length && displayed.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            {selectedIds.length === displayed.length ? 'Deselect All' : 'Select All'}
          </label>
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
              {activeTab === 'active' ? (
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5">
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Move to Trash
                </Button>
              ) : (
                <Button size="sm" onClick={handleBulkRestore} disabled={bulkDeleting}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore Selected
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <Card className="p-5 mb-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-800">
              {editingProduct ? 'Edit Product' : 'New Product'}
            </h2>
            <button onClick={() => setShowForm(false)}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            {/* Main Image */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="main" className="w-full h-full object-cover" />
                    : <ImagePlus className="h-8 w-8 text-gray-300" />}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors w-fit">
                      {uploadingMain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingMain ? 'Uploading…' : form.image_url ? 'Replace Image' : 'Upload Image'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMain} disabled={uploadingMain} />
                  </label>
                  {form.image_url && <p className="text-xs text-green-600 font-medium">✓ Image uploaded</p>}
                </div>
              </div>
            </div>

            {/* Extra Images + Video */}
            <div className="md:col-span-2">
              <Label className="font-semibold mb-2 block">Extra Images (up to 5) &amp; Product Video</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(form.image_urls || []).map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`extra-${i}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(form.image_urls || []).length < 5 && (
                  <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-400 transition-colors gap-0.5">
                    {uploadingExtra
                      ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      : <><Plus className="h-4 w-4 text-gray-400" /><span className="text-[9px] text-gray-400">Image</span></>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadExtra} disabled={uploadingExtra} />
                  </label>
                )}
                {/* Video slot */}
                <label className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed border-purple-300 flex flex-col items-center justify-center hover:border-purple-500 transition-colors gap-0.5 relative">
                  {uploadingVideo
                    ? <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                    : form.video_url
                      ? <>
                          <Video className="h-5 w-5 text-purple-500" />
                          <span className="text-[9px] text-purple-600 font-semibold">Replace</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setForm(f => ({ ...f, video_url: '' })); }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg px-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      : <>
                          <Video className="h-4 w-4 text-purple-400" />
                          <span className="text-[9px] text-purple-400">Video</span>
                        </>}
                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploadingVideo} />
                </label>
              </div>
              {form.video_url && !uploadingVideo && (
                <p className="text-xs text-purple-600 font-medium mt-1">✓ Video uploaded</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                Slots: {(form.image_urls || []).length}/5 images · {form.video_url ? '1/1' : '0/1'} video
              </p>
            </div>

            {/* Product Name */}
            <div className="md:col-span-2">
              <Label>Product Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. P9 Wireless Bluetooth Headset"
              />
            </div>

            {/* AI Panel */}
            <AiPanel form={form} setForm={setForm} />

            {/* Step 1 — Main Category */}
            <div>
              <Label>Step 1 — Main Category *</Label>
              <Select
                value={form.main_group}
                onValueChange={v => setForm(f => ({ ...f, main_group: v, category: '', brand: '', customBrand: '', subcategory: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger>
                <SelectContent>
                  {MAIN_CATEGORY_GROUPS.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2 — Subcategory */}
            <div>
              <Label>Step 2 — Subcategory *</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v, brand: '', customBrand: '', subcategory: '' }))}
                disabled={!form.main_group}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.main_group ? 'Select subcategory' : 'Select main category first'} />
                </SelectTrigger>
                <SelectContent>
                  {(GROUP_CATEGORIES[form.main_group] || []).map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3 — Brand */}
            <div>
              <Label>Step 3 — Brand *</Label>
              <Select
                value={form.brand}
                onValueChange={v => setForm(f => ({ ...f, brand: v, customBrand: '', subcategory: '' }))}
                disabled={!form.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.category ? 'Select brand' : 'Select subcategory first'} />
                </SelectTrigger>
                <SelectContent>
                  {(GROUP_BRANDS[form.main_group] || []).map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.brand === 'Other' && (
                <div className="mt-2">
                  <Input
                    value={form.customBrand || ''}
                    onChange={e => setForm(f => ({ ...f, customBrand: e.target.value }))}
                    placeholder="Type brand name e.g. Anker, Baseus, Xiaomi…"
                    className="border-orange-300 focus:ring-orange-400"
                  />
                  <p className="text-xs text-orange-500 mt-0.5">Enter the brand name manually</p>
                </div>
              )}
            </div>

            {/* Step 4 — Product Type */}
            <div>
              <Label>Step 4 — Product Type</Label>
              <Select
                value={form.subcategory}
                onValueChange={v => setForm(f => ({ ...f, subcategory: v }))}
                disabled={!form.brand}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.brand ? 'Select product type' : 'Select brand first'} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    (BRAND_SUBCATEGORIES[form.category] || {})[
                      form.brand === 'Other' ? form.customBrand : form.brand
                    ] || []
                  ).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div>
              <Label>Price (₵) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Original Price */}
            <div>
              <Label>Original Price (₵) — for discount display</Label>
              <Input
                type="number"
                value={form.original_price}
                onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Stock */}
            <div>
              <Label>Stock Quantity <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
              <Input
                type="number"
                value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="Leave blank if unlimited"
              />
            </div>

            {/* Video URL */}
            <div className="md:col-span-2">
              <Label>
                Video URL{' '}
                <span className="text-gray-400 font-normal text-xs">(YouTube, Vimeo, or direct link)</span>
              </Label>
              <Input
                value={form.video_url || ''}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=... or https://..."
              />
              <VideoPreview url={form.video_url} />
            </div>

            {/* Description — Rich Text Editor */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">
                  Description
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    Paste rich text or use toolbar — formatting is preserved
                  </span>
                </Label>
              </div>
              <RichTextEditor
                value={form.description}
                onChange={v => setForm(f => ({ ...f, description: v }))}
              />
              {/* Preview rendered description */}
              {form.description && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer select-none">
                    👁 Preview rendered description
                  </summary>
                  <div
                    className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.description) }}
                  />
                </details>
              )}
            </div>

            {/* Tags / Flags */}
            <div className="md:col-span-2">
              <Label className="font-semibold block mb-2">Product Tags</Label>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'featured', label: '⭐ Featured' },
                  { key: 'flash_sale', label: '⚡ Flash Sale (CLASSICO Deals)' },
                  { key: 'donkomi', label: '🔥 Donkomi' },
                  { key: 'review_enabled', label: '💬 Reviews Enabled' },
                  { key: 'hidden', label: '🙈 Hidden from Users' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form[key] ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                      onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                    >
                      {form[key] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {form.flash_sale && (
                <div className="mt-3">
                  <Label>Flash Sale End Date/Time (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={form.flash_sale_end || ''}
                    onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.price || !form.category}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {saveMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Check className="h-4 w-4" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setEditingProduct(null); setForm(EMPTY_FORM); }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ── PRODUCTS GRID ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {activeTab === 'active'
            ? <p>No products yet. Click "Add Product" to get started.</p>
            : <p>Trash is empty.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {displayed.map(product => {
            const isSelected = selectedIds.includes(product.id);
            const activeTags = [
              product.featured  && { key: 'featured',  label: 'Featured', color: 'bg-purple-500' },
              product.flash_sale && { key: 'flash_sale', label: 'Flash',    color: 'bg-orange-500' },
              product.donkomi   && { key: 'donkomi',   label: 'Donkomi',  color: 'bg-green-500'  },
              product.hidden    && { key: 'hidden',    label: 'Hidden',   color: 'bg-gray-500'   },
            ].filter(Boolean);

            return (
              <Card
                key={product.id}
                className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''} ${product.hidden ? 'opacity-60' : ''}`}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>}
                  {product.hidden && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <EyeOff className="h-6 w-6 text-white opacity-80" />
                    </div>
                  )}
                  <div className="absolute top-1.5 right-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      className="w-4 h-4 cursor-pointer accent-blue-600"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  {activeTags.length > 0 && (
                    <div className="absolute top-1 left-1 flex flex-col gap-1">
                      {activeTags.map(tag => (
                        <Badge key={tag.key} className={`text-[9px] px-1 py-0 ${tag.color} text-white`}>
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </p>
                  <p className="text-sm font-black text-gray-900">₵{product.price?.toLocaleString()}</p>
                  {product.stock != null && (
                    <p className="text-[10px] text-gray-400">Stock: {product.stock}</p>
                  )}

                  {/* Render HTML description safely (sanitized when saved) */}
                  {product.description && (
                    <div
                      className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  )}

                  {activeTab === 'active' && (
                    <>
                      {/* Quick-toggle badges */}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {[
                          { key: 'featured',   label: '⭐', title: 'Featured'   },
                          { key: 'flash_sale', label: '⚡', title: 'Flash Sale' },
                          { key: 'donkomi',    label: '🔥', title: 'Donkomi'    },
                        ].map(({ key, label, title }) => (
                          <button
                            key={key}
                            title={`Toggle ${title}`}
                            onClick={() =>
                              base44.entities.Product.update(product.id, { [key]: !product[key] }).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['products-admin'] });
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                toast.success(`${title} ${!product[key] ? 'enabled' : 'disabled'}`);
                              })
                            }
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold transition-colors ${product[key] ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Action row */}
                      <div className="flex gap-1 mt-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <button
                          title={product.hidden ? 'Show to users' : 'Hide from users'}
                          onClick={() => toggleVisibility(product)}
                          className={`h-7 w-7 flex items-center justify-center rounded-md border text-xs transition-colors ${product.hidden ? 'bg-yellow-50 border-yellow-300 text-yellow-600 hover:bg-yellow-100' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                        >
                          {product.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          title="Move to Trash"
                          onClick={() => softDelete(product.id)}
                          className="h-7 w-7 flex items-center justify-center rounded-md border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}

                  {activeTab === 'trash' && (
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => restore(product.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </Button>
                      <button
                        title="Delete permanently"
                        onClick={() => permanentDelete(product.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-md border bg-red-50 border-red-200 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
