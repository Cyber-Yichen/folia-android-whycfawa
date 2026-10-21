import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AI_PROVIDER_PRESETS } from '../../../../shared/aiProviderPresets.mjs';
import { readAiSettings, writeAiSettings, type AiSettings } from '../../../services/aiSettings';
import { testConfiguredAiConnection, type AiConnectionTestResult } from '../../../services/aiThemeClient';
import { listAiModels, type AiModel } from '../../../services/ai/modelDiscovery';
import { CustomSelect } from '../../shared/CustomSelect';
import { useSettingsModalStore } from '../../../stores/useSettingsModalStore';

// Provider presets and manual fallback share the Android native completion configuration.
type Props = { settingsCardClass: string; isDaylight: boolean };
const AiProviderSettings: React.FC<Props> = ({ settingsCardClass, isDaylight }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const configId = React.useId();
    const initialAnchor = useSettingsModalStore(state => state.settingsModalState.initialAnchor);
    useEffect(() => {
        if (initialAnchor?.id === 'aiProvider') setExpanded(true);
    }, [initialAnchor?.id, initialAnchor?.seq]);
    const [settings, setSettings] = useState(readAiSettings);
    const [models, setModels] = useState<AiModel[]>([]);
    const [loading, setLoading] = useState(false);
    const [manual, setManual] = useState(true);
    const [modelError, setModelError] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);
    const generation = useRef(0);
    useEffect(() => () => { generation.current += 1; }, []);
    const update = (patch: Partial<AiSettings>, connectionChanged = true) => {
        generation.current += 1;
        setSettings(writeAiSettings(patch));
        setTestResult(null); setTesting(false); setLoading(false);
        if (connectionChanged) { setModels([]); setManual(true); setModelError(false); }
    };
    const gemini = settings.provider === 'gemini';
    const model = gemini ? settings.geminiModel : settings.openaiApiModel;
    const key = gemini ? settings.geminiApiKey : settings.openaiApiKey;
    const chooseModel = (value: string) => update(gemini ? { geminiModel: value } : { openaiApiModel: value }, false);
    const discover = async () => {
        const current = ++generation.current;
        setLoading(true); setModelError(false); setTestResult(null); setTesting(false);
        const result = await listAiModels(settings);
        if (current !== generation.current) return;
        setLoading(false);
        if (result.ok) { setModels(result.models); setManual(false); }
        else { setModels([]); setManual(true); setModelError(true); }
    };
    const runTest = async () => {
        const current = ++generation.current;
        setTesting(true); setLoading(false); setTestResult(null);
        const result = await testConfiguredAiConnection();
        if (current !== generation.current) return;
        setTesting(false); setTestResult(result);
    };
    const inputClass = 'w-full min-h-11 rounded-lg border border-current/10 bg-current/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-current';
    const field = (label: string, value: string, change: (value: string) => void, type = 'text') => (
        <label className="block space-y-1 text-left"><span className="text-xs opacity-60">{label}</span>
            <input type={type} value={value} onChange={event => change(event.target.value)} autoComplete="off" spellCheck={false} className={inputClass} /></label>
    );
    const modelOptions = models.map(entry => ({ value: entry.id, label: entry.name === entry.id ? entry.id : entry.name + ' · ' + entry.id }));
    if (model && !models.some(entry => entry.id === model)) modelOptions.unshift({ value: model, label: model });
    return <div className={'rounded-xl border p-4 ' + settingsCardClass}>
        <button type="button" aria-expanded={expanded} aria-controls={configId} onClick={() => setExpanded(value => !value)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-current">
            <span className="flex items-center gap-2"><Sparkles size={16} />{t('ui.aiTheme')}</span>
            <ChevronDown size={16} className={'transition-transform motion-reduce:transition-none ' + (expanded ? 'rotate-180' : '')} aria-hidden="true" />
        </button>
        {expanded && <div id={configId} className="space-y-4 pt-4">
            <CustomSelect ariaLabel={t('options.aiProvider')} value={settings.preset} isDaylight={isDaylight}
                options={AI_PROVIDER_PRESETS.map(preset => ({ value: preset.id, label: preset.label || t('options.aiCustomProvider') }))}
                onChange={id => {
                    const preset = AI_PROVIDER_PRESETS.find(entry => entry.id === id)!;
                    update({
                        preset: id, provider: preset.protocol === 'gemini' ? 'gemini' : 'openai',
                        apiProtocol: preset.protocol === 'anthropic' ? 'anthropic' : 'openai',
                        openaiApiUrl: id === 'custom' ? settings.openaiApiUrl : preset.baseUrl,
                        openaiApiModel: settings.preset === id ? settings.openaiApiModel : '',
                    });
                }} />
            {settings.preset === 'custom' && field(t('options.openaiApiUrl'), settings.openaiApiUrl, value => update({ openaiApiUrl: value }))}
            {field(gemini ? t('options.geminiApiKey') : t('options.openaiApiKey'), key, value => update(gemini ? { geminiApiKey: value } : { openaiApiKey: value }), 'password')}
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                    <span>{t('options.aiModel')}</span>
                    <button type="button" disabled={loading || !key.trim()} onClick={() => void discover()} className="flex min-h-11 items-center gap-2 rounded-lg px-3 disabled:opacity-40">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}{t('options.aiRefreshModels')}
                    </button>
                </div>
                {!manual && models.length > 0
                    ? <CustomSelect ariaLabel={t('options.aiModel')} value={model} options={modelOptions} onChange={chooseModel} isDaylight={isDaylight} />
                    : field(t('options.aiModel'), model, chooseModel)}
                {models.length > 0 && <button type="button" className="min-h-11 text-xs underline opacity-70" onClick={() => setManual(value => !value)}>{t(manual ? 'options.aiChooseModel' : 'options.aiManualModel')}</button>}
                {modelError && <p role="status" className="text-xs opacity-60">{t('options.aiModelsUnavailable')}</p>}
            </div>
            {!gemini && field(t('options.openaiApiTemperature'), settings.openaiApiTemperature, value => update({ openaiApiTemperature: value }, false), 'number')}
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={testing || !key.trim() || (settings.apiProtocol === 'anthropic' && !model.trim())} onClick={() => void runTest()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-current/5 px-4 text-xs disabled:opacity-40">
                    {testing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}{t(testing ? 'options.aiTestRunning' : 'options.aiTestConnection')}
                </button>
                {testResult && <span role="status" className="inline-flex items-center gap-2 text-xs">
                    {testResult.ok ? <Check size={15} /> : <X size={15} />}{t(testResult.ok ? 'options.aiTestSuccess' : 'options.aiTestFailed')}
                    {testResult.ok && ' · ' + testResult.durationMs + ' ms'}
                </span>}
            </div>
        </div>}
    </div>;
};
export default AiProviderSettings;
