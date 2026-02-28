import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Loader2, Save, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

const DEFAULT_DATA = {
    hero: {
        title: "The AI environment for <br /> frontend engineering.",
        subtitle: "UI Forge is a premium desktop application that connects directly to your local React codebase. Design, edit, and orchestrate components visually and conversationally—without ever leaving your repository.",
        buttonPrimary: { text: "Download for macOS", link: "#download", tooltip: "Coming soon", enabled: true },
        buttonSecondary: { text: "View Pricing", link: "#pricing", enabled: true }
    },
    featuresSection: {
        enabled: true,
        title: "Designed for real codebases.",
        subtitle: "No proprietary platforms. No vendor lock-in. UI Forge edits the exact React and CSS files you already have on your machine.",
        items: [
            { id: "1", icon: "GitBranch", title: "Single Source of Truth", desc: "UI Forge connects to your local Git repository. It reads your precise React components, Next.js setups, and CSS modules. Changes made in the app are written directly to your files. No proprietary platforms, no vendor lock-in." },
            { id: "2", icon: "Wand2", title: "Conversational UI Editing", desc: "Stop wrestling with nested CSS flexboxes. Select a component and tell the AI what you want to achieve. UI Forge precisely injects the code into your existing module schema, retaining your architecture." },
            { id: "3", icon: "Layout", title: "Universal Properties Panel", desc: "Visually inspect margins, padding, typography, grids, and color maps. Tweak properties directly via GUI sliders and visual pickers, safely isolated inside an interactive sandbox environment." }
        ]
    },
    workflowSection: {
        enabled: true,
        title: "How UI Forge Works",
        subtitle: "Adopt UI Forge into your workflow in less than a minute.",
        items: [
            { id: "1", step: "01", title: "Select Repo", desc: "No migration needed. Open your existing React or Next.js repository inside the app." },
            { id: "2", step: "02", title: "Index Assets", desc: "Our engine seamlessly maps your components, CSS modules, and design tokens instantly." },
            { id: "3", step: "03", title: "Visual Edit", desc: "Redesign using the isolated sandbox and conversational AI assistant effortlessly." },
            { id: "4", step: "04", title: "Native Save", desc: "Your tweaks are instantly persisted back into your raw .tsx and .css files." }
        ]
    },
    pricingSection: {
        enabled: true,
        title: "Simple, transparent pricing",
        subtitle: "Start building for free, upgrade when you need unlimited intelligence and team collaboration.",
        buttonLabels: {
            free: "Get Started",
            pro: "Upgrade to Pro",
            team: "Upgrade to Team",
            enterprise: "Contact Sales"
        },
        buttonEnabled: {
            free: true,
            pro: true,
            team: true,
            enterprise: true
        },
        priceLabels: {
            free: "Forever",
            pro: "Per user / month",
            team: "Per user / month",
            enterprise: "Contact sales"
        },
        annualToggleEnabled: false,
        trialLabels: { free: "", pro: "7 days free trial", team: "14 days free trial", enterprise: "" }
    },
    faqSection: {
        enabled: true,
        title: "Frequently Asked Questions",
        subtitle: "Everything you need to know about UI Forge.",
        items: [
            { id: "1", q: "Does UI Forge store my code in the cloud?", a: "No. UI Forge is a local-first application. It reads and writes directly to your local file system. We do not upload your proprietary codebase to our servers." },
            { id: "2", q: "Which frameworks are supported?", a: "Currently, UI Forge provides first-class support for React and Next.js projects using standard CSS Modules or plain CSS. Tailwind support is on our roadmap." },
            { id: "3", q: "How does the AI editing work?", a: "When you request an AI edit, UI Forge securely sends only the component code you are editing and your prompt to our LLM provider. The AI generates the modifications, which are instantly mapped back to your local files." },
            { id: "4", q: "Can I use UI Forge alongside VS Code or WebStorm?", a: "Absolutely. In fact, it's designed to complement them. Since UI Forge edits your local files, any changes you make in UI Forge appear instantly in your IDE, and vice-versa." },
            { id: "5", q: "What happens if I cancel my Professional/Ultra plan?", a: "You will drop down to the Hobby plan automatically at the end of your billing cycle. You'll retain access to the app for 1 local repository and your previous visual edits remain perfectly safe in your own Git repository." }
        ]
    },
    footer: {
        text: "© 2026 UI Forge. Build faster."
    }
};

export default function LandingTab({ db, profile }: { db: any, profile: any }) {
    const [data, setData] = useState<any>(null);
    const [editData, setEditData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.role === 'master_admin') {
            const unsub = onSnapshot(doc(db, 'content', 'landing'), (snapshot) => {
                if (snapshot.exists() && Object.keys(snapshot.data()).length > 0) {
                    setData(snapshot.data());
                } else {
                    setData(DEFAULT_DATA);
                }
                setLoading(false);
            });
            return () => unsub();
        }
    }, [profile?.role, db]);

    const handleSave = async () => {
        if (!editData) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'content', 'landing'), editData);
            setEditData(null);
        } catch (err) {
            console.error(err);
            alert('Failed to save landing content');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-zinc-500 animate-pulse p-4">Loading landing config...</div>;

    const current = editData || data;
    const isEditing = !!editData;

    const updateSection = (section: string, field: string, value: any) => {
        setEditData((prev: any) => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const updateSubField = (section: string, base: string, field: string, value: any) => {
        setEditData((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [base]: { ...prev[section][base], [field]: value }
            }
        }));
    };

    const updateArrayItem = (section: string, index: number, field: string, value: any) => {
        setEditData((prev: any) => {
            const newItems = [...prev[section].items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, [section]: { ...prev[section], items: newItems } };
        });
    };

    const removeArrayItem = (section: string, index: number) => {
        setEditData((prev: any) => {
            const newItems = [...prev[section].items];
            newItems.splice(index, 1);
            return { ...prev, [section]: { ...prev[section], items: newItems } };
        });
    };

    const addArrayItem = (section: string, defaultItem: any) => {
        setEditData((prev: any) => {
            const newItems = [...(prev[section].items || []), defaultItem];
            return { ...prev, [section]: { ...prev[section], items: newItems } };
        });
    };

    const PLAN_ORDER = ['free', 'pro', 'team', 'enterprise'];

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Landing Page Content</h2>
                {!isEditing ? (
                    <button
                        onClick={() => setEditData(JSON.parse(JSON.stringify(data)))}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        <Pencil className="w-4 h-4" /> Edit Layout & Content
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (window.confirm("Discard changes?")) setEditData(null);
                            }}
                            className="text-sm font-medium text-zinc-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-8 pb-16 disabled-form-container" style={{ pointerEvents: isEditing ? 'auto' : 'none', opacity: isEditing ? 1 : 0.8 }}>

                {/* HERO SECTION */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                        <h3 className="font-semibold text-lg text-zinc-100">Hero Section</h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Main Title (HTML allowed)</label>
                            <input type="text" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-blue-500"
                                value={current.hero.title} onChange={e => updateSection('hero', 'title', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Subtitle</label>
                            <textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 h-24"
                                value={current.hero.subtitle} onChange={e => updateSection('hero', 'subtitle', e.target.value)} />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Primary Button */}
                            <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-zinc-300">Primary Button</h4>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={current.hero.buttonPrimary.enabled} onChange={e => updateSubField('hero', 'buttonPrimary', 'enabled', e.target.checked)} className="accent-blue-500" /> Enabled
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Text</label>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500"
                                        value={current.hero.buttonPrimary.text ?? (DEFAULT_DATA.hero.buttonPrimary as any).text} onChange={e => updateSubField('hero', 'buttonPrimary', 'text', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Link (href or #id)</label>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500"
                                        value={current.hero.buttonPrimary.link ?? (DEFAULT_DATA.hero.buttonPrimary as any).link} onChange={e => updateSubField('hero', 'buttonPrimary', 'link', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Tooltip (optional)</label>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500"
                                        value={current.hero.buttonPrimary.tooltip ?? (DEFAULT_DATA.hero.buttonPrimary as any).tooltip ?? ''} onChange={e => updateSubField('hero', 'buttonPrimary', 'tooltip', e.target.value)} />
                                </div>
                            </div>

                            {/* Secondary Button */}
                            <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-zinc-300">Secondary Button</h4>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" checked={current.hero.buttonSecondary.enabled} onChange={e => updateSubField('hero', 'buttonSecondary', 'enabled', e.target.checked)} className="accent-blue-500" /> Enabled
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Text</label>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500"
                                        value={current.hero.buttonSecondary.text ?? (DEFAULT_DATA.hero.buttonSecondary as any).text} onChange={e => updateSubField('hero', 'buttonSecondary', 'text', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Link</label>
                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500"
                                        value={current.hero.buttonSecondary.link ?? (DEFAULT_DATA.hero.buttonSecondary as any).link} onChange={e => updateSubField('hero', 'buttonSecondary', 'link', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MULTIPLE SECTIONS BULD (Features, Workflow, FAQ, Pricing) */}
                {['featuresSection', 'workflowSection', 'pricingSection', 'faqSection'].map((sectionKey) => {
                    const sec = current[sectionKey];
                    const hasItems = Array.isArray(sec.items);

                    return (
                        <div key={sectionKey} className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all ${!sec.enabled ? 'opacity-50 grayscale border-zinc-800/50' : ''}`}>
                            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                                <h3 className="font-semibold text-lg text-zinc-100 flex items-center gap-2">
                                    {!sec.enabled ? <EyeOff className="w-4 h-4 text-zinc-500" /> : <Eye className="w-4 h-4 text-blue-400" />}
                                    {sectionKey.replace('Section', '').toUpperCase()}
                                </h3>
                                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                                    <input type="checkbox" checked={sec.enabled} onChange={e => updateSection(sectionKey, 'enabled', e.target.checked)} className="accent-blue-500" />
                                    Show Section
                                </label>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Section Title</label>
                                        <input type="text" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500"
                                            value={sec.title} onChange={e => updateSection(sectionKey, 'title', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-500 mb-1">Section Subtitle</label>
                                        <input type="text" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500"
                                            value={sec.subtitle} onChange={e => updateSection(sectionKey, 'subtitle', e.target.value)} />
                                    </div>
                                </div>

                                {/* Pricing Section Configurations */}
                                {sectionKey === 'pricingSection' && (
                                    <>
                                        <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
                                            <h4 className="text-sm font-semibold text-zinc-300">Plan Configurations</h4>
                                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {PLAN_ORDER.map((planKey) => (
                                                    <div key={planKey} className="p-4 bg-zinc-950/50 border border-zinc-800/50 rounded-lg space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-white uppercase tracking-wider">{planKey}</span>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Button</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={sec.buttonEnabled?.[planKey] ?? (DEFAULT_DATA.pricingSection.buttonEnabled as any)[planKey]}
                                                                    onChange={e => updateSubField('pricingSection', 'buttonEnabled', planKey, e.target.checked)}
                                                                    className="accent-blue-500"
                                                                />
                                                            </label>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Button Text</label>
                                                                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                                                                    value={sec.buttonLabels?.[planKey] ?? ''}
                                                                    onChange={e => updateSubField('pricingSection', 'buttonLabels', planKey, e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Price Label</label>
                                                                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                                                                    value={sec.priceLabels?.[planKey] ?? ''}
                                                                    onChange={e => updateSubField('pricingSection', 'priceLabels', planKey, e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Trial/Badge Text</label>
                                                                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-white"
                                                                    value={sec.trialLabels?.[planKey] ?? ''}
                                                                    onChange={e => updateSubField('pricingSection', 'trialLabels', planKey, e.target.value)}
                                                                    placeholder="e.g. 7 days free trial"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-6 border-t border-zinc-800 pt-6">
                                                <div className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800 p-4 rounded-lg">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-white mb-1">Enable Annual Billing Toggle</h4>
                                                        <p className="text-xs text-zinc-500">Shows a switch to let users toggle between monthly and yearly pricing views.</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={sec.annualToggleEnabled ?? false} onChange={e => updateSection('pricingSection', 'annualToggleEnabled', e.target.checked)} />
                                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Array List Editor for Items */}
                                {hasItems && (
                                    <div className="mt-8 pt-6 border-t border-zinc-800">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-semibold text-zinc-300">Section Items ({sec.items.length})</h4>
                                            {isEditing && (
                                                <button onClick={() => {
                                                    const newId = Date.now().toString();
                                                    if (sectionKey === 'featuresSection') addArrayItem(sectionKey, { id: newId, icon: "Check", title: "New Feature", desc: "" });
                                                    if (sectionKey === 'workflowSection') addArrayItem(sectionKey, { id: newId, step: "0X", title: "New Step", desc: "" });
                                                    if (sectionKey === 'faqSection') addArrayItem(sectionKey, { id: newId, q: "New Question?", a: "" });
                                                }} className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors text-zinc-200">
                                                    <Plus className="w-3.5 h-3.5" /> Add Item
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {sec.items.map((item: any, i: number) => (
                                                <div key={item.id || i} className="flex gap-4 items-start p-4 bg-zinc-950/40 rounded-lg border border-zinc-800/50">
                                                    {sectionKey === 'featuresSection' && (
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex gap-4">
                                                                <div className="w-1/3">
                                                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Icon Name</label>
                                                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white" value={item.icon || ''} onChange={e => updateArrayItem(sectionKey, i, 'icon', e.target.value)} />
                                                                </div>
                                                                <div className="w-2/3">
                                                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Feature Title</label>
                                                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white" value={item.title || ''} onChange={e => updateArrayItem(sectionKey, i, 'title', e.target.value)} />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Description</label>
                                                                <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white h-16" value={item.desc || ''} onChange={e => updateArrayItem(sectionKey, i, 'desc', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {sectionKey === 'workflowSection' && (
                                                        <div className="flex-1 space-y-3">
                                                            <div className="flex gap-4">
                                                                <div className="w-1/4">
                                                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Step #</label>
                                                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white text-center" value={item.step || ''} onChange={e => updateArrayItem(sectionKey, i, 'step', e.target.value)} />
                                                                </div>
                                                                <div className="w-3/4">
                                                                    <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Step Title</label>
                                                                    <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white" value={item.title || ''} onChange={e => updateArrayItem(sectionKey, i, 'title', e.target.value)} />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Description</label>
                                                                <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-white h-16" value={item.desc || ''} onChange={e => updateArrayItem(sectionKey, i, 'desc', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {sectionKey === 'faqSection' && (
                                                        <div className="flex-1 space-y-3">
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Question</label>
                                                                <input type="text" className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white font-medium" value={item.q || ''} onChange={e => updateArrayItem(sectionKey, i, 'q', e.target.value)} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Answer</label>
                                                                <textarea className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white h-24" value={item.a || ''} onChange={e => updateArrayItem(sectionKey, i, 'a', e.target.value)} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isEditing && (
                                                        <button onClick={() => removeArrayItem(sectionKey, i)} className="text-zinc-500 hover:text-red-400 p-2 mt-4 bg-zinc-900 rounded-lg border border-zinc-800 transition-colors" title="Remove Item">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* FOOTER SECTION */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                        <h3 className="font-semibold text-lg text-zinc-100">Footer</h3>
                    </div>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Copyright Text</label>
                        <input type="text" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-blue-500"
                            value={current.footer?.text || ''} onChange={e => updateSection('footer', 'text', e.target.value)} />
                    </div>
                </div>

            </div>
        </>
    );
}
