"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'scoring' | 'policies'>('policies');
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [candidateList, setCandidateList] = useState<any[]>([]);
  const [onboardingPlan, setOnboardingPlan] = useState<any>(null);
  const [policySummary, setPolicySummary] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Policy Chat State
  const [chatAnswer, setChatAnswer] = useState("");

  // Fetch candidates from MongoDB
  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/skills/list');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCandidateList(data);
      }
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  const generateOnboarding = async (candidateId: string) => {
    setLoading(true);
    setActiveTab('onboarding'); 
    try {
      const res = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId })
      });
      const data = await res.json();
      setOnboardingPlan(data);
    } catch (err) {
      console.error("Failed to generate roadmap");
    }
    setLoading(false);
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Are you sure you want to remove this candidate?")) return;
    
    try {
      const res = await fetch(`/api/skills/delete?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Refresh the list locally without a full page reload
        setCandidateList(prev => prev.filter(c => c._id !== id));
      }
    } catch (err) {
      console.error("Delete failed");
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleAISubmit = async (e: React.FormEvent<HTMLFormElement>, endpoint: string) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/${endpoint}`, { method: "POST", body: formData });
      const data = await res.json();
      
      if (endpoint === 'skills/score') {
        setScoreResult(data);
        fetchCandidates();
      } else if (endpoint === 'policies/upload') {
        // If your upload API returns a summary, display it
        if(data.summary) setPolicySummary(data.summary);
        alert("Policy Synced Successfully!");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
    setLoading(false);
  };

  const filteredCandidates = candidateList.filter(cand => {
  const searchLower = searchQuery.toLowerCase();
  
  // Check Candidate Name
  const nameMatch = cand.candidateName?.toLowerCase().includes(searchLower);
  
  // Check ALL matched skills in the database array
  const skillMatch = cand.matchedSkills?.some((skill: string) => 
    skill.toLowerCase().includes(searchLower)
  );

  // Check ALL missing skills (useful if you're looking for someone to train up)
  const missingSkillMatch = cand.missingSkills?.some((skill: string) => 
    skill.toLowerCase().includes(searchLower)
  );

  return nameMatch || skillMatch || missingSkillMatch;
});

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black text-black dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 p-6 text-white hidden md:block border-r border-zinc-800">
        <h2 className="text-xl font-bold mb-8 text-indigo-400">HR AI Portal</h2>
        <nav className="space-y-2">
          {['onboarding', 'scoring', 'policies'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)} 
              className={`capitalize flex items-center w-full text-left p-3 rounded-lg transition ${activeTab === tab ? 'bg-zinc-800 text-white border-l-4 border-indigo-500' : 'text-zinc-400 hover:bg-zinc-800'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-8 md:p-16 bg-white dark:bg-black overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-bold mb-2">HR Management Dashboard</h1>
            <p className="text-zinc-500">Manage policies and evaluate talent with AI.</p>
          </header>

          {/* KNOWLEDGE BASE TAB */}
          {activeTab === 'policies' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 dark:bg-zinc-900 dark:border-zinc-700">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><span>📄</span> Upload New Policy (PDF)</h3>
                <form onSubmit={(e) => handleAISubmit(e, 'policies/upload')}>
                  <input type="file" name="file" accept=".pdf" required className="block w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                  <button disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-zinc-400">
                    {loading ? "Processing..." : "Sync to AI"}
                  </button>
                </form>
                {policySummary && (
                  <div className="mt-4 p-4 bg-white dark:bg-black border rounded-lg italic text-sm text-zinc-600">
                    <strong>Auto-Summary:</strong> {policySummary}
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 dark:bg-zinc-900 dark:border-zinc-800">
                <h3 className="font-semibold text-indigo-900 mb-4 dark:text-indigo-300">Policy Chatbot</h3>
                <div className="flex flex-col gap-3">
                  <input id="policy-query" placeholder="Ask a question..." className="w-full p-4 border rounded-xl dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button 
                    onClick={async () => {
                      const q = (document.getElementById('policy-query') as HTMLInputElement).value;
                      if (!q) return;
                      setLoading(true);
                      const res = await fetch('/api/policies/chat', { method: 'POST', body: JSON.stringify({ question: q }) });
                      const data = await res.json();
                      setChatAnswer(data.answer);
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-800"
                  > {loading ? "Searching..." : "Ask AI Agent"} </button>
                </div>
                {chatAnswer && <div className="mt-6 p-5 bg-white rounded-xl border shadow-sm text-zinc-800 animate-in zoom-in-95">{chatAnswer}</div>}
              </div>
            </div>
          )}

          {/* SKILL SCORING TAB */}
          {activeTab === 'scoring' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-8 rounded-xl border shadow-sm dark:bg-zinc-900">
                <h3 className="font-bold text-xl mb-6">Analyze Candidate Fit</h3>
                <form onSubmit={(e) => handleAISubmit(e, 'skills/score')} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Job Description</label>
                    <textarea name="jd" rows={4} className="w-full p-3 border rounded-xl dark:bg-black" placeholder="Paste requirements..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Candidate Resume (PDF)</label>
                    
                    {/* The real input is hidden */}
                    <input 
                      type="file" 
                      name="resume" 
                      id="resume-upload"
                      accept=".pdf" 
                      required 
                      className="hidden" 
                      onChange={(e) => {
                        // This updates the text next to the button when a file is picked
                        const fileName = e.target.files?.[0]?.name;
                        const display = document.getElementById('file-name-display');
                        if (display) display.innerText = fileName || "No file selected";
                      }}
                    />

                    <div className="flex items-center gap-3">
                      {/* This label is styled as the button and triggers the hidden input */}
                      <label 
                        htmlFor="resume-upload" 
                        className="inline-flex items-center justify-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium cursor-pointer transition-all border border-zinc-700 shadow-sm"
                      >
                        <span className="mr-2"></span>
                        Upload Resume
                      </label>
                      
                      {/* This span shows the user which file they picked */}
                      <span id="file-name-display" className="text-sm text-zinc-500 truncate max-w-[200px]">
                        No file chosen
                      </span>
                    </div>
                  </div>
                  <button disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg">
                    {loading ? "Analyzing Experience..." : "Calculate Match Score"}
                  </button>
                </form>
              </div>

              {scoreResult && (
                <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-white shadow-2xl animate-in zoom-in-95">
                   <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{scoreResult.candidateName || "Candidate Profile"}</h2>
                      <p className="text-zinc-400 italic">{scoreResult.summary}</p>
                    </div>
                    <div className="text-5xl font-black text-green-500">{scoreResult.matchPercentage}%</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-zinc-800/50 p-4 rounded-xl">
                      <h4 className="font-bold text-green-400 mb-3">✅ Matched Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {scoreResult.matchedSkills?.map((s: any, i: number) => (
                          <span key={i} className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs border border-green-800">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-xl">
                      <h4 className="font-bold text-red-400 mb-3">⚠️ Missing Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {scoreResult.missingSkills?.map((s: any, i: number) => (
                          <span key={i} className="bg-red-900/30 text-red-400 px-3 py-1 rounded-full text-xs border border-red-800">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TALENT POOL SECTION */}
              <div className="pt-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="font-bold text-2xl">Stored Talent Pool</h3>
                  
                  <div className="flex gap-2 w-full md:w-auto">
                    {/* SEARCH BAR */}
                    <input 
                      type="text" 
                      placeholder="Search by name or skill..." 
                      className="p-2 border rounded-lg text-sm dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button onClick={fetchCandidates} className="text-indigo-500 hover:text-indigo-400 text-sm font-medium px-2">Refresh</button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {filteredCandidates.length === 0 && (
                    <p className="text-zinc-500 text-center py-10 border border-dashed rounded-xl">
                      {searchQuery ? "No candidates match your search." : "No candidates scored yet."}
                    </p>
                  )}
                  
                  {filteredCandidates.map((cand) => (
                    <div key={cand._id} className="p-5 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex justify-between items-center hover:border-indigo-500 transition group">
                      <div>
                        <h4 className="font-bold text-lg">{cand.candidateName || "Unknown Candidate"}</h4>
                        <p className="text-xs text-zinc-500 mb-2">Applied for: {cand.appliedFor?.substring(0, 50)}...</p>
                        <div className="flex flex-wrap gap-2">
                          {cand.matchedSkills?.slice(0, 5).map((s:string, i:number) => (
                            <span key={i} className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 px-2 py-1 rounded-md font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`text-3xl font-black ${cand.matchPercentage > 70 ? 'text-green-600' : 'text-amber-500'}`}>
                            {cand.matchPercentage}%
                          </div>
                          <button 
                            onClick={() => deleteCandidate(cand._id)}
                            className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => generateOnboarding(cand._id)}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-md"
                        > 
                          Generate Roadmap 
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ONBOARDING TAB */}
          {activeTab === 'onboarding' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!onboardingPlan && !loading && (
                <div className="p-20 text-center border-2 border-dashed rounded-3xl text-zinc-500">
                  <h3 className="text-xl font-bold mb-2">Ready to hire?</h3>
                  <p>Go to "Skill Scoring" and click <b>Generate Roadmap</b> for a candidate.</p>
                </div>
              )}
              {loading && <div className="p-20 text-center animate-pulse">Crafting personalized 30-day training roadmap...</div>}
              {onboardingPlan && (
                <div className="space-y-6">
                  <header className="bg-indigo-900 p-8 rounded-2xl text-white shadow-xl">
                    <h2 className="text-3xl font-bold">{onboardingPlan.planTitle}</h2>
                    <p className="text-indigo-200 mt-2">Personalized 30-Day Training Roadmap</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {onboardingPlan.weeks?.map((w: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 shadow-sm">
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Week {w.week}</span>
                        <h4 className="font-bold text-lg my-3">{w.focus}</h4>
                        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {w.tasks?.map((task: string, idx: number) => <li key={idx} className="flex gap-2"><span>✔</span>{task}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => window.print()} className="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50">Print Onboarding Guide</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}