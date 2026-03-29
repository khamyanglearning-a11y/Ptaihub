import React, { useState, useEffect, useMemo } from 'react';
import { Home as HomeIcon, BarChart2, Settings as SettingsIcon, Search, Plus, Trash2, Edit2, LogOut, Info, Moon, Sun, ChevronRight, X, CheckCircle2, AlertCircle, CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Word, Sentence, Analytics, ActivityLog } from './types';
import { apiService } from './services/api';
import { cn } from './lib/utils';

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl p-4 shadow-sm border border-[var(--border)]", className)}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className, disabled, type = 'button' }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-[var(--muted)] text-[var(--foreground)] hover:opacity-80",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn("px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100", variants[variant], className)}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', label, className }: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
  type?: string;
  label?: string;
  className?: string;
}) => (
  <div className="w-full space-y-1">
    {label && <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider ml-1">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("w-full bg-[var(--muted)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all", className)}
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'status' | 'settings'>('home');
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  });
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isOfflineMode') === 'true';
    }
    return false;
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const offline = apiService.getOfflineData();
      setLastSync(offline.lastSync);

      if (isOfflineMode) {
        setWords(offline.words);
        setSentences(offline.sentences);
        setIsLoading(false);
      } else {
        try {
          const { words: fetchedWords, sentences: fetchedSentences } = await apiService.fetchData();
          if (fetchedWords.length > 0 || fetchedSentences.length > 0) {
            setWords(fetchedWords);
            setSentences(fetchedSentences);
          } else {
            // Fallback to offline if online fetch returns nothing (maybe error)
            setWords(offline.words);
            setSentences(offline.sentences);
          }
        } catch (err) {
          setWords(offline.words);
          setSentences(offline.sentences);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadData();
  }, [isOfflineMode]);

  const handleSync = async () => {
    setIsSyncing(true);
    const res = await apiService.syncOfflineData();
    if (res.success) {
      const offline = apiService.getOfflineData();
      setLastSync(offline.lastSync);
      if (isOfflineMode) {
        setWords(offline.words);
        setSentences(offline.sentences);
      }
      alert(`Synced ${res.count} items for offline use!`);
    } else {
      alert("Sync failed. Please check your internet connection.");
    }
    setIsSyncing(false);
  };

  const toggleOfflineMode = () => {
    const newValue = !isOfflineMode;
    setIsOfflineMode(newValue);
    localStorage.setItem('isOfflineMode', String(newValue));
  };

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const filteredWords = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return words.filter(w => 
      w.status === 'active' && (
        (w.english?.toLowerCase() || '').includes(query) ||
        (w.tai?.toLowerCase() || '').includes(query) ||
        (w.assamese?.toLowerCase() || '').includes(query) ||
        (w.pronunciation?.toLowerCase() || '').includes(query)
      )
    );
  }, [words, searchQuery]);

  const filteredSentences = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return sentences.filter(s => 
      s.status === 'active' && (
        (s.english?.toLowerCase() || '').includes(query) ||
        (s.tai?.toLowerCase() || '').includes(query) ||
        (s.pronunciation?.toLowerCase() || '').includes(query)
      )
    );
  }, [sentences, searchQuery]);

  const analytics = useMemo((): Analytics => {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalWords: words.filter(w => w.status === 'active').length,
      totalSentences: sentences.filter(s => s.status === 'active').length,
      wordsToday: words.filter(w => w.dateAdded?.startsWith(today)).length,
      sentencesToday: sentences.filter(s => s.dateAdded?.startsWith(today)).length,
      totalDeleted: words.filter(w => w.status === 'deleted').length + sentences.filter(s => s.status === 'deleted').length
    };
  }, [words, sentences]);

  const activityLog = useMemo((): ActivityLog[] => {
    const logs: Record<string, { words: number; sentences: number }> = {};
    
    words.forEach(w => {
      if (!w.dateAdded) return;
      const date = w.dateAdded.split('T')[0];
      if (!logs[date]) logs[date] = { words: 0, sentences: 0 };
      logs[date].words++;
    });
    
    sentences.forEach(s => {
      if (!s.dateAdded) return;
      const date = s.dateAdded.split('T')[0];
      if (!logs[date]) logs[date] = { words: 0, sentences: 0 };
      logs[date].sentences++;
    });

    return Object.entries(logs)
      .map(([date, counts]) => ({ date, wordsAdded: counts.words, sentencesAdded: counts.sentences }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [words, sentences]);

  return (
    <div className="min-h-screen pb-24 flex flex-col max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Tai Hub</h1>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full bg-[var(--muted)] text-[var(--foreground)]"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" size={18} />
                  <input 
                    type="text"
                    placeholder="Search words, meanings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={handleSync}
                    disabled={isSyncing || isOfflineMode}
                    className={cn(
                      "p-3 rounded-xl border border-[var(--border)] shadow-sm transition-all active:scale-95 disabled:opacity-50",
                      isSyncing ? "animate-spin text-blue-500" : "bg-[var(--card)] text-[var(--foreground)]"
                    )}
                    title="Sync for offline use"
                  >
                    <RefreshCw size={20} />
                  </button>
                  <button 
                    onClick={toggleOfflineMode}
                    className={cn(
                      "p-3 rounded-xl border border-[var(--border)] shadow-sm transition-all active:scale-95",
                      isOfflineMode ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-[var(--card)] text-[var(--muted-foreground)]"
                    )}
                    title={isOfflineMode ? "Switch to Online" : "Switch to Offline"}
                  >
                    {isOfflineMode ? <CloudOff size={20} /> : <Wifi size={20} />}
                  </button>
                </div>
              </div>

              {isOfflineMode && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-3 rounded-xl flex items-center gap-3">
                  <AlertCircle className="text-orange-500" size={18} />
                  <div className="text-xs text-orange-700 dark:text-orange-400">
                    <p className="font-bold">Offline Mode Active</p>
                    <p>Showing cached data from {lastSync ? new Date(lastSync).toLocaleString() : 'never'}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (filteredWords.length === 0 && filteredSentences.length === 0) ? (
                  <div className="text-center py-12 text-[var(--muted-foreground)]">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No results found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <>
                    {filteredWords.map(word => (
                      <div key={word.id} className={cn("bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-2")}>
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold text-blue-600">{word.english}</h3>
                          <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded-full">
                            {new Date(word.dateAdded).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Tai</p>
                            <p className="text-lg font-medium">{word.tai}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Assamese</p>
                            <p className="text-lg font-medium">{word.assamese}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Pronunciation</p>
                          <p className="italic text-[var(--muted-foreground)]">{word.pronunciation}</p>
                        </div>
                      </div>
                    ))}
                    {filteredSentences.map(sentence => (
                      <div key={sentence.id} className={cn("bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl p-4 shadow-sm border border-[var(--border)] space-y-2 border-l-4 border-l-blue-500")}>
                        <div className="flex justify-between items-start">
                          <p className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Example Sentence</p>
                          <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded-full">
                            {new Date(sentence.dateAdded).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-lg font-medium">{sentence.english}</p>
                        <p className="text-xl font-bold text-blue-600">{sentence.tai}</p>
                        <p className="italic text-[var(--muted-foreground)]">{sentence.pronunciation}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'status' && (
            <motion.div 
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-bold">Analytics</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="flex flex-col items-center justify-center py-6">
                  <span className="text-3xl font-bold text-blue-600">{analytics.totalWords}</span>
                  <span className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Total Words</span>
                </Card>
                <Card className="flex flex-col items-center justify-center py-6">
                  <span className="text-3xl font-bold text-green-600">{analytics.totalSentences}</span>
                  <span className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Total Sentences</span>
                </Card>
                <Card className="flex flex-col items-center justify-center py-6">
                  <span className="text-3xl font-bold text-orange-600">{analytics.wordsToday}</span>
                  <span className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Words Today</span>
                </Card>
                <Card className="flex flex-col items-center justify-center py-6">
                  <span className="text-3xl font-bold text-purple-600">{analytics.sentencesToday}</span>
                  <span className="text-xs text-[var(--muted-foreground)] uppercase font-bold">Sentences Today</span>
                </Card>
              </div>
              
              <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3">
                  <Trash2 className="text-red-500" size={20} />
                  <div>
                    <p className="text-sm font-bold">Total Deleted Items</p>
                    <p className="text-2xl font-bold text-red-600">{analytics.totalDeleted}</p>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">Activity Log</h3>
                <div className="space-y-3">
                  {activityLog.map(log => (
                    <div key={log.date} className="flex items-center justify-between p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                      <div>
                        <p className="font-bold">{new Date(log.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Activity recorded</p>
                      </div>
                      <div className="flex gap-2">
                        {log.wordsAdded > 0 && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg">+{log.wordsAdded} Words</span>}
                        {log.sentencesAdded > 0 && <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-lg">+{log.sentencesAdded} Sentences</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!isLoggedIn ? (
                <LoginForm onLoginSuccess={() => {
                  setIsLoggedIn(true);
                  localStorage.setItem('isLoggedIn', 'true');
                }} />
              ) : (
                <AdminPanel 
                  onLogout={() => {
                    setIsLoggedIn(false);
                    localStorage.removeItem('isLoggedIn');
                    setActiveTab('home');
                  }} 
                  words={words} 
                  sentences={sentences} 
                  refreshData={async () => {
                    const data = await apiService.fetchData();
                    setWords(data.words);
                    setSentences(data.sentences);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-lg border-t border-[var(--border)] px-6 py-3 safe-area-bottom flex justify-between items-center max-w-md mx-auto z-20">
        <NavButton 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
          icon={<HomeIcon size={24} />} 
          label="Home" 
        />
        <NavButton 
          active={activeTab === 'status'} 
          onClick={() => setActiveTab('status')} 
          icon={<BarChart2 size={24} />} 
          label="Status" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<SettingsIcon size={24} />} 
          label="Settings" 
        />
      </nav>
    </div>
  );
}

// --- Sub-components ---

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-blue-600 scale-110" : "text-[var(--muted-foreground)]"
    )}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

const LoginForm = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await apiService.login(username, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-sm mx-auto mt-10 p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <SettingsIcon size={32} />
        </div>
        <h2 className="text-2xl font-bold">Admin Login</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Enter your credentials to access the dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input 
          label="Username" 
          value={username} 
          onChange={setUsername} 
          placeholder="Enter username" 
        />
        <Input 
          label="Password" 
          type="password" 
          value={password} 
          onChange={setPassword} 
          placeholder="Enter password" 
        />
        
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full py-4 text-lg mt-4" 
          disabled={isSubmitting || !username || !password}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
      </form>
    </Card>
  );
};

const AdminPanel = ({ onLogout, words, sentences, refreshData }: { 
  onLogout: () => void; 
  words: Word[]; 
  sentences: Sentence[]; 
  refreshData: () => Promise<void>;
}) => {
  const [view, setView] = useState<'menu' | 'addWord' | 'addSentence' | 'manage' | 'changePass'>('menu');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddWord = async (data: any) => {
    setIsSubmitting(true);
    const res = await apiService.addWord(data);
    if (res.success) {
      showToast("Word added successfully");
      setView('menu');
      refreshData();
    } else {
      showToast("Failed to add word", "error");
    }
    setIsSubmitting(false);
  };

  const handleAddSentence = async (data: any) => {
    setIsSubmitting(true);
    const res = await apiService.addSentence(data);
    if (res.success) {
      showToast("Sentence added successfully");
      setView('menu');
      refreshData();
    } else {
      showToast("Failed to add sentence", "error");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (type: 'word' | 'sentence', id: string) => {
    const res = await apiService.deleteItem(type, id);
    if (res.success) {
      showToast("Item deleted");
      refreshData();
    } else {
      showToast("Failed to delete", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Admin Dashboard</h2>
        <Button variant="ghost" onClick={onLogout} className="flex items-center gap-2 text-red-500">
          <LogOut size={18} />
          <span>Logout</span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 gap-3"
          >
            <MenuButton icon={<Plus size={20} />} label="Add New Word" onClick={() => setView('addWord')} />
            <MenuButton icon={<Plus size={20} />} label="Add New Sentence" onClick={() => setView('addSentence')} />
            <MenuButton icon={<Edit2 size={20} />} label="Manage All Data" onClick={() => setView('manage')} />
            <MenuButton icon={<AlertCircle size={20} />} label="Change Password" onClick={() => setView('changePass')} />
            
            <Card className="mt-4 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
              <div className="flex items-start gap-3">
                <Info className="text-blue-500 shrink-0 mt-1" size={20} />
                <div className="space-y-1">
                  <p className="font-bold text-sm">About Developer</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Tai Hub Dictionary v1.0.0. Created for language preservation and easy access to Tai words and meanings.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {view === 'addWord' && (
          <motion.div 
            key="addWord"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AddWordForm onCancel={() => setView('menu')} onSubmit={handleAddWord} isSubmitting={isSubmitting} />
          </motion.div>
        )}

        {view === 'addSentence' && (
          <motion.div 
            key="addSentence"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <AddSentenceForm onCancel={() => setView('menu')} onSubmit={handleAddSentence} isSubmitting={isSubmitting} />
          </motion.div>
        )}

        {view === 'manage' && (
          <motion.div 
            key="manage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ManageData 
              words={words} 
              sentences={sentences} 
              onBack={() => setView('menu')} 
              onDelete={handleDelete}
            />
          </motion.div>
        )}

        {view === 'changePass' && (
          <motion.div 
            key="changePass"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ChangePasswordForm onCancel={() => setView('menu')} showToast={showToast} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-24 left-6 right-6 p-4 rounded-2xl shadow-lg flex items-center gap-3 z-50",
              toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center justify-between p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] hover:bg-[var(--muted)] transition-all active:scale-[0.98]"
  >
    <div className="flex items-center gap-3 font-bold">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
        {icon}
      </div>
      <span>{label}</span>
    </div>
    <ChevronRight size={20} className="text-[var(--muted-foreground)]" />
  </button>
);

const AddWordForm = ({ onCancel, onSubmit, isSubmitting }: { onCancel: () => void; onSubmit: (data: any) => void; isSubmitting: boolean }) => {
  const [english, setEnglish] = useState('');
  const [tai, setTai] = useState('');
  const [assamese, setAssamese] = useState('');
  const [pronunciation, setPronunciation] = useState('');

  return (
    <Card className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Add New Word</h3>
        <button onClick={onCancel} className="p-1 text-[var(--muted-foreground)]"><X size={20} /></button>
      </div>
      <Input label="English" value={english} onChange={setEnglish} placeholder="e.g. Hello" />
      <Input label="Tai" value={tai} onChange={setTai} placeholder="e.g. Ma-sung" />
      <Input label="Assamese" value={assamese} onChange={setAssamese} placeholder="e.g. নমস্কাৰ" />
      <Input label="Pronunciation" value={pronunciation} onChange={setPronunciation} placeholder="e.g. Ma-sung" />
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSubmit({ english, tai, assamese, pronunciation })} disabled={isSubmitting || !english || !tai}>
          {isSubmitting ? "Adding..." : "Add Word"}
        </Button>
      </div>
    </Card>
  );
};

const AddSentenceForm = ({ onCancel, onSubmit, isSubmitting }: { onCancel: () => void; onSubmit: (data: any) => void; isSubmitting: boolean }) => {
  const [english, setEnglish] = useState('');
  const [tai, setTai] = useState('');
  const [pronunciation, setPronunciation] = useState('');

  return (
    <Card className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Add New Sentence</h3>
        <button onClick={onCancel} className="p-1 text-[var(--muted-foreground)]"><X size={20} /></button>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider ml-1">English Sentence</label>
        <textarea 
          value={english} 
          onChange={(e) => setEnglish(e.target.value)} 
          placeholder="e.g. How are you?"
          className="w-full bg-[var(--muted)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider ml-1">Tai Sentence</label>
        <textarea 
          value={tai} 
          onChange={(e) => setTai(e.target.value)} 
          placeholder="e.g. Mai-sung-kha?"
          className="w-full bg-[var(--muted)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
        />
      </div>
      <Input label="Pronunciation" value={pronunciation} onChange={setPronunciation} placeholder="e.g. Mai-sung-kha?" />
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSubmit({ english, tai, pronunciation })} disabled={isSubmitting || !english || !tai}>
          {isSubmitting ? "Adding..." : "Add Sentence"}
        </Button>
      </div>
    </Card>
  );
};

const ManageData = ({ words, sentences, onBack, onDelete }: { words: Word[]; sentences: Sentence[]; onBack: () => void; onDelete: (type: 'word' | 'sentence', id: string) => void }) => {
  const [tab, setTab] = useState<'words' | 'sentences'>('words');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-[var(--muted)] rounded-full"><ChevronRight size={20} className="rotate-180" /></button>
        <h3 className="text-lg font-bold">Manage Data</h3>
      </div>

      <div className="flex bg-[var(--muted)] p-1 rounded-xl">
        <button 
          onClick={() => setTab('words')}
          className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", tab === 'words' ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}
        >
          Words ({words.length})
        </button>
        <button 
          onClick={() => setTab('sentences')}
          className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", tab === 'sentences' ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}
        >
          Sentences ({sentences.length})
        </button>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
        {tab === 'words' ? (
          words.map(w => (
            <div key={w.id} className="flex items-center justify-between p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
              <div>
                <p className="font-bold">{w.english}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{w.tai}</p>
              </div>
              <button onClick={() => onDelete('word', w.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          sentences.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
              <div className="max-w-[80%]">
                <p className="font-bold truncate">{s.english}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">{s.tai}</p>
              </div>
              <button onClick={() => onDelete('sentence', s.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ChangePasswordForm = ({ onCancel, showToast }: { onCancel: () => void; showToast: (m: string, t?: any) => void }) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const res = await apiService.changePassword(oldPass, newPass);
    if (res.success) {
      showToast("Password updated successfully");
      onCancel();
    } else {
      showToast(res.message || "Failed to update password", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Change Password</h3>
        <button onClick={onCancel} className="p-1 text-[var(--muted-foreground)]"><X size={20} /></button>
      </div>
      <Input label="Current Password" type="password" value={oldPass} onChange={setOldPass} />
      <Input label="New Password" type="password" value={newPass} onChange={setNewPass} />
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting || !oldPass || !newPass}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </Card>
  );
};
