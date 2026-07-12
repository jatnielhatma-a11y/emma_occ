'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, BookOpen, Copy, Languages, Mic, Play, Sparkles } from 'lucide-react';

type Language = 'English' | 'Nederlands' | 'Español' | 'Papiamentu di Kòrsou';
type TranslationMode = 'natural' | 'literal';

const phrasebook: Record<string, Partial<Record<Language, string>>> = {
  'thank you very much': {
    'Papiamentu di Kòrsou': 'Masha danki',
    Nederlands: 'Heel erg bedankt',
    Español: 'Muchas gracias',
  },
  'you are welcome': {
    'Papiamentu di Kòrsou': 'Di nada, na bo òrdu',
    Nederlands: 'Graag gedaan',
    Español: 'De nada',
  },
  'have a good day at work': {
    'Papiamentu di Kòrsou': 'Werkse',
    Nederlands: 'Werk ze',
    Español: 'Que tengas un buen día de trabajo',
  },
  'i appreciate your patience': {
    'Papiamentu di Kòrsou': 'Mi ta apresiá bo pasenshi',
    Nederlands: 'Ik waardeer je geduld',
    Español: 'Aprecio tu paciencia',
  },
  'let us work on it': {
    'Papiamentu di Kòrsou': 'Laga nos traha riba dje',
    Nederlands: 'Laten we eraan werken',
    Español: 'Trabajemos en ello',
  },
  'always at your service': {
    'Papiamentu di Kòrsou': 'Semper na bo òrdu',
    Nederlands: 'Altijd tot je dienst',
    Español: 'Siempre a tu servicio',
  },
};

const samples = [
  'Thank you very much',
  'You are welcome',
  'Have a good day at work',
  'I appreciate your patience',
  'Let us work on it',
  'Always at your service',
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[.!?]/g, '');
}

export default function YuiKorsouTranslate() {
  const [from, setFrom] = useState<Language>('English');
  const [to, setTo] = useState<Language>('Papiamentu di Kòrsou');
  const [mode, setMode] = useState<TranslationMode>('natural');
  const [input, setInput] = useState('Have a good day at work');
  const [listening, setListening] = useState(false);

  const output = useMemo(() => {
    const match = phrasebook[normalize(input)]?.[to];
    if (match) return match;
    if (!input.trim()) return '';
    if (mode === 'natural' && to === 'Papiamentu di Kòrsou') {
      return 'Preview: natural Yu’i Kòrsou translation needs the NOVA language engine.';
    }
    return 'Preview: connect the NOVA translation API for full translation coverage.';
  }, [input, to, mode]);

  function swapLanguages() {
    setFrom(to);
    setTo(from);
    setInput(output.startsWith('Preview:') ? '' : output);
  }

  function speak(text: string, language: Language) {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'Nederlands' ? 'nl-NL' : language === 'Español' ? 'es-ES' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const BrowserRecognition = (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!BrowserRecognition) return;
    const recognition = new BrowserRecognition();
    recognition.lang = from === 'Nederlands' ? 'nl-NL' : from === 'Español' ? 'es-ES' : 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => setInput(event.results?.[0]?.[0]?.transcript ?? input);
    recognition.start();
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Project Yu’i Kòrsou</p>
          <h1>NOVA Translate Lab</h1>
          <p className="subtitle">Interactive translation, pronunciation, and cultural-context prototype for Papiamentu di Kòrsou.</p>
        </div>
        <a className="connect-google" href="/">Back to Emma OCC</a>
      </header>

      <section className="panel full" style={{ marginBottom: 16 }}>
        <div className="panel-title"><Sparkles size={18}/> Translation mode</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setMode('natural')} aria-pressed={mode === 'natural'}>Yu’i Kòrsou mode</button>
          <button onClick={() => setMode('literal')} aria-pressed={mode === 'literal'}>Literal mode</button>
        </div>
        <p style={{ marginTop: 10 }}>{mode === 'natural' ? 'Prioritizes what a Yu’i Kòrsou would naturally say.' : 'Prioritizes direct word-for-word meaning for study and comparison.'}</p>
      </section>

      <section className="content-grid">
        <article className="panel wide">
          <div className="panel-title"><Languages size={18}/> Language workspace</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <select value={from} onChange={(event) => setFrom(event.target.value as Language)}>{(['English','Nederlands','Español','Papiamentu di Kòrsou'] as Language[]).map((language) => <option key={language}>{language}</option>)}</select>
            <button onClick={swapLanguages} title="Swap languages"><ArrowLeftRight size={17}/></button>
            <select value={to} onChange={(event) => setTo(event.target.value as Language)}>{(['Papiamentu di Kòrsou','English','Nederlands','Español'] as Language[]).map((language) => <option key={language}>{language}</option>)}</select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={8} style={{ width: '100%', resize: 'vertical' }} aria-label="Source text"/>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={startListening}><Mic size={16}/>{listening ? ' Listening…' : ' Speak'}</button>
                <button onClick={() => speak(input, from)}><Play size={16}/> Listen</button>
              </div>
            </div>
            <div>
              <div className="panel" style={{ minHeight: 194, padding: 16 }}><h2 style={{ marginTop: 0 }}>{output || 'Translation appears here'}</h2><p>{to === 'Papiamentu di Kòrsou' ? 'Written form stays correct; spoken pronunciation will use the Kòrsou voice profile.' : 'Translation preview.'}</p></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => speak(output, to)}><Play size={16}/> Listen</button>
                <button onClick={() => navigator.clipboard?.writeText(output)}><Copy size={16}/> Copy</button>
              </div>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title"><BookOpen size={18}/> Quick phrases</div>
          <div style={{ display: 'grid', gap: 8 }}>{samples.map((sample) => <button key={sample} onClick={() => { setFrom('English'); setTo('Papiamentu di Kòrsou'); setInput(sample); }}>{sample}</button>)}</div>
        </article>

        <article className="panel">
          <div className="panel-title"><Mic size={18}/> Live translation roadmap</div>
          <p><b>Phase 1:</b> typed translation and cultural notes.</p>
          <p><b>Phase 2:</b> microphone input and spoken output.</p>
          <p><b>Phase 3:</b> two-person conversation mode with automatic language detection.</p>
          <p><b>Phase 4:</b> native-speaker review loop and correction memory.</p>
        </article>

        <article className="panel full">
          <div className="panel-title"><Sparkles size={18}/> Language-engine principles</div>
          <div className="kpi-list">
            <span>Writing<b>Correct Papiamentu orthography</b></span>
            <span>Speaking<b>Kòrsou pronunciation profile</b></span>
            <span>Meaning<b>Natural over literal</b></span>
            <span>Governance<b>Native-speaker reviewed</b></span>
          </div>
        </article>
      </section>
    </main>
  );
}
