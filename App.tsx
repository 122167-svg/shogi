
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ========== データ型定義 ==========
type View = 'main' | 'student' | 'member' | 'thanks' | 'admin' | 'external' | 'adminLogin';

interface Student {
  grade: string;
  class: string;
  studentId: string;
  shogiStrength: string;
  timestamp: string;
}
interface ExternalVisitorGroup {
  count: number;
  shogiStrength: string;
  timestamp: string;
}
interface MemberStatus {
  [key: string]: {
    checkedIn: boolean;
    lastChanged: string;
  };
}
interface LogEntry {
  name: string;
  type: 'in' | 'out';
  timestamp: string;
}


// ========== 事前定義データ ==========
const MEMBERS = [
  '熱田 望',   '池田 大翔',   '岩間 悠希', '白石 怜大',
  '高椋 煌生', '布施 皓己',   '吉井 千智', '秋山 七星',
  '大庭 悠誠', '熊谷 流星',   '佐藤 勘太', '下田 聖',
  '遅 志丞',   '皆川 哲弥',   '宮崎 惺也', '山崎 泰蔵',
  '片山 幸典', '葛石 知佑',   '金 悠鉉',   '小林 慈人',
  '坂内 元気', '下村 篤生',   '染谷 尚太朗', '高木 翔玄',
  '棚瀬 侑真', '中野 琥太郎', '西内 幸輝', '野田 慧',
  '秀村 紘嗣', '船津 太一',   '槇 啓秀',   '松井 俐真',
  '森本 直樹', '山田 悠聖',   '若林 空',   '小畑 貴慈',
  '龍口 直史'
];
const GRADES = ['中1', '中2', '中3', '高1', '高2', '高3'];
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SHOGI_RANKS = ['特にない', '10級', '9級', '8級', '7級', '6級', '5級', '4級', '3級', '2級', '1級', '初段', '二段', '三段'];
const ADMIN_PASSWORD = 'shogi';

// ========== カスタムフック ==========
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}


// ========== UIコンポーネント ==========

const NumericKeypad: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const handleKeyPress = (key: string) => {
    if (value.length >= 3) return;
    onValueChange(value + key);
  };
  const handleBackspace = () => onValueChange(value.slice(0, -1));
  const handleClear = () => onValueChange('');
  const buttonClass = "w-full h-14 bg-stone-700 hover:bg-stone-600 rounded-lg text-2xl font-bold flex items-center justify-center transition-transform transform active:scale-95";

  return (
    <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-2">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
        <button key={key} type="button" onClick={() => handleKeyPress(key)} className={buttonClass}>{key}</button>
      ))}
      <button type="button" onClick={handleClear} className={`${buttonClass} bg-red-800 hover:bg-red-700`}>C</button>
      <button type="button" onClick={() => handleKeyPress('0')} className={buttonClass}>0</button>
      <button type="button" onClick={handleBackspace} className={`${buttonClass} bg-stone-600 hover:bg-stone-500`}>⌫</button>
    </div>
  );
};

const AdminLogin: React.FC<{ onLogin: (password: string) => void; onBack: () => void }> = ({ onLogin, onBack }) => {
    const [password, setPassword] = useState('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onLogin(password);
    };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
        <button onClick={onBack} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
        <h2 className="text-3xl font-bold mb-8 text-amber-100">管理者ログイン</h2>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center focus:ring-2 focus:ring-amber-400 focus:outline-none"
            placeholder="パスワード"
          />
          <button type="submit" className="w-full text-xl font-semibold py-4 px-4 bg-amber-700 hover:bg-amber-600 rounded-lg transition-transform transform active:scale-95 shadow-lg">
            ログイン
          </button>
        </form>
      </div>
    );
};

const AdminView: React.FC<{
  log: LogEntry[],
  studentVisitors: Student[],
  externalVisitors: ExternalVisitorGroup[],
  onBack: () => void
}> = ({ log, studentVisitors, externalVisitors, onBack }) => {
  const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
  const totalVisitors = externalCount + studentVisitors.length;

  const downloadCSV = (data: any[], filename: string, headers: Record<string, string>) => {
    if (data.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }
    const headerKeys = Object.keys(headers);
    const headerValues = Object.values(headers);
    
    const csvRows = [headerValues.join(',')];

    for (const row of data) {
      const values = headerKeys.map(key => {
        let value = row[key];
        if (value === null || value === undefined) {
          value = '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-white p-4">
      <button onClick={onBack} className="fixed top-4 left-4 text-stone-300 hover:text-white z-10 bg-stone-800/50 rounded-full px-4 py-2">&larr; 戻る</button>
      <div className="max-w-6xl mx-auto pt-12">
        <h2 className="text-3xl font-bold mb-8 text-amber-100 text-center">管理者画面</h2>
        <div className="bg-stone-800 p-6 rounded-lg mb-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-amber-200 mb-4 border-b border-stone-600 pb-2">来場者サマリー</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div><p className="text-lg text-stone-400">合計来場者数</p><p className="text-4xl font-bold text-white">{totalVisitors}</p></div>
            <div><p className="text-lg text-stone-400">外部の方</p><p className="text-4xl font-bold text-white">{externalCount}</p></div>
            <div><p className="text-lg text-stone-400">在校生</p><p className="text-4xl font-bold text-white">{studentVisitors.length}</p></div>
          </div>
        </div>
        <div className="bg-stone-800 p-6 rounded-lg mb-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-amber-200 mb-4 border-b border-stone-600 pb-2">データエクスポート (CSV)</h3>
          <p className="text-stone-400 mb-4">各データをCSVファイルとしてダウンロードします。</p>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => downloadCSV(studentVisitors, '在校生来場者.csv', { timestamp: '受付日時', grade: '学年', class: 'クラス', studentId: '出席番号', shogiStrength: '棋力' })}
              className="flex-1 text-lg font-semibold py-3 px-4 bg-blue-800 hover:bg-blue-700 rounded-lg transition-transform transform active:scale-95 shadow-lg"
            >
              在校生データ
            </button>
            <button
              onClick={() => downloadCSV(externalVisitors, '外部来場者.csv', { timestamp: '受付日時', count: '人数', shogiStrength: '棋力' })}
              className="flex-1 text-lg font-semibold py-3 px-4 bg-stone-700 hover:bg-stone-600 rounded-lg transition-transform transform active:scale-95 shadow-lg"
            >
              外部来場者データ
            </button>
            <button
              onClick={() => downloadCSV(log.map(l => ({ ...l, type: l.type === 'in' ? '出勤' : '退勤' })), '部員出退勤履歴.csv', { timestamp: '日時', name: '部員名', type: '種別' })}
              className="flex-1 text-lg font-semibold py-3 px-4 bg-green-800 hover:bg-green-700 rounded-lg transition-transform transform active:scale-95 shadow-lg"
            >
              部員出退勤履歴
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-stone-800 p-6 rounded-lg shadow-lg"><h3 className="text-2xl font-semibold text-amber-200 mb-4 border-b border-stone-600 pb-2">在校生 来場者一覧</h3><div className="max-h-[50vh] overflow-y-auto">{studentVisitors.length===0?<p className="text-center text-stone-400 py-4">在校生の来場者はいません。</p>:<table className="w-full text-left"><thead className="sticky top-0 bg-stone-800"><tr><th className="p-2">受付日時</th><th className="p-2">学年</th><th className="p-2">クラス</th><th className="p-2">番号</th><th className="p-2">棋力</th></tr></thead><tbody>{studentVisitors.slice().reverse().map((s,i)=>(<tr key={i} className="border-t border-stone-700"><td className="p-2 text-sm text-stone-300">{new Date(s.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{s.grade}</td><td className="p-2">{s.class}</td><td className="p-2">{s.studentId}</td><td className="p-2">{s.shogiStrength}</td></tr>))}</tbody></table>}</div></div>
            <div className="bg-stone-800 p-6 rounded-lg shadow-lg"><h3 className="text-2xl font-semibold text-amber-200 mb-4 border-b border-stone-600 pb-2">外部 来場者一覧</h3><div className="max-h-[50vh] overflow-y-auto">{externalVisitors.length===0?<p className="text-center text-stone-400 py-4">外部の来場者はいません。</p>:<table className="w-full text-left"><thead className="sticky top-0 bg-stone-800"><tr><th className="p-2">受付日時</th><th className="p-2">人数</th><th className="p-2">棋力</th></tr></thead><tbody>{externalVisitors.slice().reverse().map((g,i)=>(<tr key={i} className="border-t border-stone-700"><td className="p-2 text-sm text-stone-300">{new Date(g.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{g.count}名</td><td className="p-2">{g.shogiStrength}</td></tr>))}</tbody></table>}</div></div>
        </div>
        <div className="bg-stone-800 p-6 rounded-lg shadow-lg mt-8"><h3 className="text-2xl font-semibold text-amber-200 mb-4 border-b border-stone-600 pb-2">部員 出退勤履歴</h3><div className="max-h-[50vh] overflow-y-auto">{log.length===0?<p className="text-center text-stone-400 py-4">履歴はありません。</p>:<div className="space-y-2">{log.slice().reverse().map((e,i)=>(<div key={i} className="flex justify-between items-center p-2 border-b border-stone-700 last:border-b-0"><div><p className="font-semibold">{e.name}</p><p className="text-sm text-stone-400">{new Date(e.timestamp).toLocaleString('ja-JP')}</p></div><span className={`px-3 py-1 text-sm rounded-full font-bold ${e.type==='in'?'bg-green-600 text-white':'bg-stone-500 text-stone-100'}`}>{e.type==='in'?'出勤':'退勤'}</span></div>))}</div>}</div></div>
      </div>
    </div>
  );
};

const MainScreen: React.FC<{ onSelect: (selection: 'student' | 'member' | 'external') => void; onAdminAccess: () => void }> = ({ onSelect, onAdminAccess }) => {
  const longPressTimer = useRef<number | null>(null);
  const handlePressStart = () => { longPressTimer.current = window.setTimeout(() => onAdminAccess(), 2000); };
  const handlePressEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-amber-100 select-none cursor-pointer" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}>将棋部 文化祭受付</h1>
      <p className="text-lg text-stone-300 mb-12">該当するボタンを押してください</p>
      <div className="w-full max-w-sm space-y-6">
        <button onClick={() => onSelect('external')} className="w-full text-2xl font-semibold py-8 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg">外部の方</button>
        <button onClick={() => onSelect('student')} className="w-full text-2xl font-semibold py-8 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">在校生の方</button>
        <button onClick={() => onSelect('member')} className="w-full text-2xl font-semibold py-8 px-4 bg-green-800 hover:bg-green-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">将棋部員専用画面</button>
      </div>
    </div>
  );
};

const StudentForm: React.FC<{ onSubmit: (student: Omit<Student, 'timestamp'>) => void, onBack: () => void }> = ({ onSubmit, onBack }) => {
  const [grade, setGrade] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [shogiStrength, setShogiStrength] = useState(SHOGI_RANKS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grade && studentClass && studentId && shogiStrength) {
      onSubmit({ grade, class: studentClass, studentId, shogiStrength });
    } else { alert('すべての項目を入力してください。'); }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <button onClick={onBack} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
      <h2 className="text-3xl font-bold mb-8 text-amber-100">在校生 受付</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div><label htmlFor="grade" className="block text-lg mb-2 text-stone-300">学年</label><select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} required className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        <div><label htmlFor="class" className="block text-lg mb-2 text-stone-300">クラス</label><select id="class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{CLASSES.map(c => <option key={c} value={c}>{c}組</option>)}</select></div>
        <div><label className="block text-lg mb-2 text-stone-300">出席番号</label><div className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-2xl h-14 flex items-center justify-center">{studentId || <span className="text-stone-500">番号を入力</span>}</div></div>
        <NumericKeypad value={studentId} onValueChange={setStudentId} />
        <div><label htmlFor="shogiStrength" className="block text-lg mb-2 text-stone-300">棋力</label><select id="shogiStrength" value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} required className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <button type="submit" className="w-full text-xl font-semibold py-4 px-4 bg-blue-800 hover:bg-blue-700 rounded-lg transition-transform transform active:scale-95 shadow-lg !mt-6">送信</button>
      </form>
    </div>
  );
};

const ExternalForm: React.FC<{ onSubmit: (data: Omit<ExternalVisitorGroup, 'timestamp'>) => void; onBack: () => void }> = ({ onSubmit, onBack }) => {
    const [count, setCount] = useState<number | null>(null);
    const [customCount, setCustomCount] = useState('');
    const [shogiStrength, setShogiStrength] = useState(SHOGI_RANKS[0]);
    const [step, setStep] = useState<'count' | 'custom' | 'strength'>('count');

    const handleCountSelect = (num: number) => {
        setCount(num);
        setStep('strength');
    };

    const handleCustomSubmit = () => {
        const num = parseInt(customCount, 10);
        if (num > 0) {
            handleCountSelect(num);
        } else { alert('人数を正しく入力してください。'); }
    };

    const handleFinalSubmit = () => {
        if (count && shogiStrength) {
            onSubmit({ count, shogiStrength });
        }
    };

    if (step === 'strength' && count !== null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
                <h2 className="text-3xl font-bold mb-4 text-amber-100">{count}名様ですね</h2>
                <p className="text-lg text-stone-300 mb-12">よろしければ棋力をお聞かせください</p>
                <div className="w-full max-w-sm space-y-6">
                    <select value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} className="w-full p-4 bg-stone-800 border border-stone-600 rounded-md text-xl focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    <button onClick={handleFinalSubmit} className="w-full text-xl font-semibold py-4 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }

    if (step === 'custom') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
                <h2 className="text-3xl font-bold mb-8 text-amber-100">人数の入力</h2>
                <div className="w-full max-w-sm space-y-6">
                    <div className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-2xl h-14 flex items-center justify-center mb-4">{customCount || <span className="text-stone-500">人数を入力</span>}</div>
                    <NumericKeypad value={customCount} onValueChange={setCustomCount} />
                    <button onClick={handleCustomSubmit} className="w-full text-xl font-semibold py-4 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <button onClick={onBack} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
            <h2 className="text-3xl font-bold mb-8 text-amber-100">ようこそ！</h2>
            <p className="text-lg text-stone-300 mb-12">保護者の方を含め、何名様でいらっしゃいましたか？</p>
            <div className="w-full max-w-sm grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleCountSelect(num)} className="text-2xl font-semibold py-8 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg">{num}名</button>))}
                <button onClick={() => setStep('custom')} className="text-2xl font-semibold py-8 px-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">その他</button>
            </div>
        </div>
    );
};

const MemberCheckin: React.FC<{ memberStatus: MemberStatus, onToggle: (name: string) => void, onBack: () => void }> = ({ memberStatus, onToggle, onBack }) => {
    useEffect(() => {
        let timer: number;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = window.setTimeout(() => {
                onBack();
            }, 60000); // 1 minute of inactivity
        };
        document.addEventListener('mousemove', resetTimer);
        document.addEventListener('keypress', resetTimer);
        document.addEventListener('touchstart', resetTimer);
        resetTimer();
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousemove', resetTimer);
            document.removeEventListener('keypress', resetTimer);
            document.removeEventListener('touchstart', resetTimer);
        };
    }, [onBack]);
    
    return (
        <div className="min-h-screen bg-stone-900 text-white p-4">
            <button onClick={onBack} className="absolute top-4 left-4 text-stone-300 hover:text-white">&larr; 戻る</button>
            <div className="max-w-md mx-auto">
                <h2 className="text-3xl font-bold mb-8 text-amber-100 text-center">部員 出退勤</h2>
                <div className="space-y-3 max-h-[85vh] overflow-y-auto">{MEMBERS.map(name => {const s=memberStatus[name]||{checkedIn:false};return(<div key={name} onClick={()=>onToggle(name)} className={`w-full flex justify-between items-center p-4 rounded-lg cursor-pointer transition-colors ${s.checkedIn ?'bg-green-600':'bg-stone-700 hover:bg-stone-600'}`}><span className="text-lg font-semibold">{name}</span><span className={`px-3 py-1 text-sm rounded-full font-bold ${s.checkedIn ?'bg-white text-green-700':'bg-stone-500 text-stone-100'}`}>{s.checkedIn ?'出勤中':'退勤中'}</span></div>);})}</div>
            </div>
        </div>
    );
};

const CompletionScreen: React.FC<{ onFinish: () => void; visitorType: 'student' | 'external' | null }> = ({ onFinish, visitorType }) => {
  useEffect(() => {
    const timer = setTimeout(() => onFinish(), 8000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const messages = {
    external: "パンフレットを取って、将棋サロンをお楽しみください。少しでも不明点があれば、近くにいる班員にお気軽にお声掛けください。",
    student: "希望する場合はパンフレットを取ってください。混雑時は外部の方優先で対応させていただきます。予めご了承ください。将棋部では、体験入部・入部を一年中受け付けています。少しでも興味があれば、1人でも友達とでもいいので気軽に来てください。",
  };
  const message = visitorType ? messages[visitorType] : "将棋部の展示をお楽しみください！";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4 text-center">
      <h2 className="text-5xl font-bold text-amber-100">受付完了</h2>
      <p className="text-xl mt-6 text-stone-300 max-w-2xl leading-relaxed">{message}</p>
      <p className="text-md mt-8 text-stone-400">自動でTOP画面に戻ります。</p>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  const [lastVisitorType, setLastVisitorType] = useState<'student' | 'external' | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const [externalVisitors, setExternalVisitors] = useLocalStorage<ExternalVisitorGroup[]>('shogi_externalVisitors', []);
  const [studentVisitors, setStudentVisitors] = useLocalStorage<Student[]>('shogi_studentVisitors', []);
  const [memberStatus, setMemberStatus] = useLocalStorage<MemberStatus>('shogi_memberStatus', {});
  const [memberLog, setMemberLog] = useLocalStorage<LogEntry[]>('shogi_memberLog', []);
  
  const handleSelect = useCallback((selection: 'student' | 'member' | 'external') => setView(selection), []);
  const handleReturnToMain = useCallback(() => setView('main'), []);

  const handleStudentSubmit = useCallback((student: Omit<Student, 'timestamp'>) => {
    setStudentVisitors(prev => [...prev, { ...student, timestamp: new Date().toISOString() }]);
    setLastVisitorType('student');
    setView('thanks');
  }, [setStudentVisitors]);

  const handleExternalSubmit = useCallback((data: Omit<ExternalVisitorGroup, 'timestamp'>) => {
    setExternalVisitors(prev => [...prev, { ...data, timestamp: new Date().toISOString() }]);
    setLastVisitorType('external');
    setView('thanks');
  }, [setExternalVisitors]);

  const handleMemberToggle = useCallback((name: string) => {
    const newTimestamp = new Date().toISOString();
    const currentStatus = memberStatus[name] || { checkedIn: false };
    setMemberLog(prev => [...prev, { name, type: !currentStatus.checkedIn ? 'in' : 'out', timestamp: newTimestamp }]);
    setMemberStatus(prev => ({...prev, [name]: { checkedIn: !prev[name]?.checkedIn, lastChanged: newTimestamp }}));
  }, [memberStatus, setMemberLog, setMemberStatus]);

  const handleAdminAccess = useCallback(() => setView('adminLogin'), []);
  const handleAdminLogin = useCallback((password: string) => {
    if (password === ADMIN_PASSWORD) {
        setIsAdminAuthenticated(true);
        setView('admin');
    } else { alert('パスワードが違います。'); }
  }, []);

  switch (view) {
    case 'student': return <StudentForm onSubmit={handleStudentSubmit} onBack={handleReturnToMain} />;
    case 'external': return <ExternalForm onSubmit={handleExternalSubmit} onBack={handleReturnToMain} />;
    case 'member': return <MemberCheckin memberStatus={memberStatus} onToggle={handleMemberToggle} onBack={handleReturnToMain} />;
    case 'thanks': return <CompletionScreen onFinish={handleReturnToMain} visitorType={lastVisitorType} />;
    case 'adminLogin': return <AdminLogin onLogin={handleAdminLogin} onBack={handleReturnToMain} />;
    case 'admin': return isAdminAuthenticated ? <AdminView log={memberLog} studentVisitors={studentVisitors} externalVisitors={externalVisitors} onBack={handleReturnToMain} /> : <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
    default: return <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
  }
};

export default App;
