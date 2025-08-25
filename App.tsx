import React, { useState, useEffect, useCallback } from 'react';

declare const JSZip: any;

// ========== データ型定義 ==========
type View = 'main' | 'student' | 'member' | 'thanks' | 'admin' | 'external' | 'adminLogin' | 'resetConfirmation';

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
type NotificationMessage = { message: string; type: 'success' | 'error' };

interface Member {
  name: string;
  furigana: string;
}

// ========== 事前定義データ ==========
const MEMBERS: Member[] = [
  { name: '熱田 望', furigana: 'あつたのぞむ' },
  { name: '池田 大翔', furigana: 'いけだひろと' },
  { name: '岩間 悠希', furigana: 'いわまゆうき' },
  { name: '白石 怜大', furigana: 'しらいしれお' },
  { name: '高椋 煌生', furigana: 'たかむくこうせい' },
  { name: '布施 皓己', furigana: 'ふせこうき' },
  { name: '吉井 千智', furigana: 'よしいちさと' },
  { name: '秋山 七星', furigana: 'あきやまななせ' },
  { name: '大庭 悠誠', furigana: 'おおばゆうせい' },
  { name: '熊谷 流星', furigana: 'くまがいりゅうせい' },
  { name: '佐藤 勘太', furigana: 'さとうかんた' },
  { name: '下田 聖', furigana: 'しもだせい' },
  { name: '遅 志丞', furigana: 'ちしじょう' },
  { name: '皆川 哲弥', furigana: 'みながわてつや' },
  { name: '宮崎 惺也', furigana: 'みやざきせいや' },
  { name: '山崎 泰蔵', furigana: 'やまざきたいぞう' },
  { name: '片山 幸典', furigana: 'かたやまゆきのり' },
  { name: '葛石 知佑', furigana: 'くずいしともひろ' },
  { name: '金 悠鉉', furigana: 'きむゆうひょん' },
  { name: '小林 慈人', furigana: 'こばやしよしひと' },
  { name: '坂内 元気', furigana: 'さかうちげんき' },
  { name: '下村 篤生', furigana: 'しもむらあつき' },
  { name: '染谷 尚太朗', furigana: 'そめやしょうたろう' },
  { name: '高木 翔玄', furigana: 'たかぎしょうげん' },
  { name: '棚瀬 侑真', furigana: 'たなせゆうま' },
  { name: '中野 琥太郎', furigana: 'なかのこたろう' },
  { name: '西内 幸輝', furigana: 'にしうちこうき' },
  { name: '野田 慧', furigana: 'のださとし' },
  { name: '秀村 紘嗣', furigana: 'ひでむらひろつぐ' },
  { name: '船津 太一', furigana: 'ふなつたいち' },
  { name: '槇 啓秀', furigana: 'まきひろひで' },
  { name: '松井 俐真', furigana: 'まついりしん' },
  { name: '森本 直樹', furigana: 'もりもとなおき' },
  { name: '山田 悠聖', furigana: 'やまだゆうせい' },
  { name: '若林 空', furigana: 'わかばやしそら' },
  { name: '小畑 貴慈', furigana: 'おばたたかちか' },
  { name: '龍口 直史', furigana: 'たつぐちなおふみ' },
];

const GRADES = ['中1', '中2', '中3', '高1', '高2', '高3'];
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SHOGI_RANKS = ['特にない', '１１級以下', '10級', '9級', '8級', '7級', '6級', '5級', '4級', '3級', '2級', '1級', '初段', '二段', '三段', '4段以上'];
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

const Notification: React.FC<{ notification: NotificationMessage | null }> = ({ notification }) => {
  if (!notification) return null;
  const baseStyle = "fixed bottom-8 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-2xl text-white z-[100] text-lg";
  const typeStyle = notification.type === 'success' ? 'bg-green-600' : 'bg-red-700';
  return (
    <div className={`${baseStyle} ${typeStyle}`} role="alert">
      {notification.message}
    </div>
  );
};

const NumericKeypad: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const handleKeyPress = (key: string) => {
    if (value.length >= 3) return;
    onValueChange(value + key);
  };
  const handleBackspace = () => onValueChange(value.slice(0, -1));
  const handleClear = () => onValueChange('');
  const buttonClass = "w-full h-20 bg-stone-700 hover:bg-stone-600 rounded-lg text-4xl font-bold flex items-center justify-center transition-transform transform active:scale-95 text-white";

  return (
    <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-3">
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800">&larr; 戻る</button>
        <h2 className="text-3xl font-bold mb-8 text-gray-900">管理者ログイン</h2>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-white border border-gray-300 rounded-md text-center text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="パスワード"
          />
          <button type="submit" className="w-full text-xl font-semibold py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
            ログイン
          </button>
        </form>
      </div>
    );
};

const AdminView: React.FC<{
  log: LogEntry[];
  studentVisitors: Student[];
  externalVisitors: ExternalVisitorGroup[];
  memberStatus: MemberStatus;
  onBack: () => void;
  onNavigateToReset: () => void;
  setNotification: (notification: NotificationMessage | null) => void;
}> = ({ log, studentVisitors, externalVisitors, memberStatus, onBack, onNavigateToReset, setNotification }) => {
  const [adminSubView, setAdminSubView] = useState<'menu' | 'students' | 'externals' | 'members'>('menu');
  const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
  const totalVisitors = externalCount + studentVisitors.length;

  const handleBatchCsvBackup = () => {
    try {
      const zip = new JSZip();

      const convertToCsv = (data: any[], headers: Record<string, string>): string => {
        const headerKeys = Object.keys(headers);
        const headerValues = Object.values(headers);
        const csvRows = [headerValues.join(',')];
        for (const row of data) {
            const values = headerKeys.map(key => {
                let value = row[key];
                if (value === null || value === undefined) value = '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            });
            csvRows.push(values.join(','));
        }
        return '\uFEFF' + csvRows.join('\r\n');
      };

      if (studentVisitors.length > 0) {
        const studentCsv = convertToCsv(studentVisitors.map(s => ({...s, timestamp: new Date(s.timestamp).toLocaleString('ja-JP')})), { timestamp: '受付日時', grade: '学年', class: 'クラス', studentId: '出席番号', shogiStrength: '棋力' });
        zip.file('在校生来場者.csv', studentCsv);
      }

      if (externalVisitors.length > 0) {
        const externalCsv = convertToCsv(externalVisitors.map(e => ({...e, timestamp: new Date(e.timestamp).toLocaleString('ja-JP')})), { timestamp: '受付日時', count: '人数', shogiStrength: '棋力' });
        zip.file('外部来場者.csv', externalCsv);
      }

      if (log.length > 0) {
        const logCsv = convertToCsv(log.map(l => ({ ...l, type: l.type === 'in' ? '出勤' : '退勤', timestamp: new Date(l.timestamp).toLocaleString('ja-JP') })), { timestamp: '日時', name: '部員名', type: '種別' });
        zip.file('部員出退勤履歴.csv', logCsv);
      }

      const memberStatusData = Object.keys(memberStatus).map(name => ({
        name,
        status: memberStatus[name].checkedIn ? '出勤中' : '退勤中',
        lastChanged: new Date(memberStatus[name].lastChanged).toLocaleString('ja-JP'),
      }));
      if (memberStatusData.length > 0) {
        const memberStatusCsv = convertToCsv(memberStatusData, { name: '部員名', status: '現在の状態', lastChanged: '最終更新日時' });
        zip.file('部員ステータス.csv', memberStatusCsv);
      }

      zip.generateAsync({ type: 'blob' }).then((blob: any) => {
        if (blob.size === 0) {
          setNotification({ message: 'エクスポートするデータがありません。', type: 'error' });
          return;
        }
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        link.setAttribute('href', url);
        link.setAttribute('download', `shogi_backup_${timestamp}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setNotification({ message: 'CSV一括バックアップが完了しました。', type: 'success' });
      });

    } catch (error) {
      console.error('ZIP export failed:', error);
      setNotification({ message: 'バックアップファイルの作成に失敗しました。', type: 'error' });
    }
  };


  if (adminSubView !== 'menu') {
    const listTitle: { [key: string]: string } = {
        students: '在校生 来場者一覧',
        externals: '外部 来場者一覧',
        members: '部員 出退勤履歴',
    };
    return (
      <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
        <button onClick={() => setAdminSubView('menu')} className="fixed top-4 left-4 text-gray-600 hover:text-gray-900 z-10 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50">&larr; 管理者メニューに戻る</button>
        <div className="max-w-6xl mx-auto pt-16">
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">{listTitle[adminSubView]}</h3>
            <div className="max-h-[75vh] overflow-y-auto">
              {adminSubView === 'students' && (
                studentVisitors.length === 0 ? <p className="text-center text-gray-500 py-4">在校生の来場者はいません。</p> : <table className="w-full text-left"><thead className="sticky top-0 bg-gray-50"><tr><th className="p-2">受付日時</th><th className="p-2">学年</th><th className="p-2">クラス</th><th className="p-2">番号</th><th className="p-2">棋力</th></tr></thead><tbody>{studentVisitors.slice().reverse().map((s, i) => (<tr key={i} className="border-t border-gray-200"><td className="p-2 text-sm text-gray-600">{new Date(s.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{s.grade}</td><td className="p-2">{s.class}</td><td className="p-2">{s.studentId}</td><td className="p-2">{s.shogiStrength}</td></tr>))}</tbody></table>
              )}
              {adminSubView === 'externals' && (
                externalVisitors.length === 0 ? <p className="text-center text-gray-500 py-4">外部の来場者はいません。</p> : <table className="w-full text-left"><thead className="sticky top-0 bg-gray-50"><tr><th className="p-2">受付日時</th><th className="p-2">人数</th><th className="p-2">棋力</th></tr></thead><tbody>{externalVisitors.slice().reverse().map((g, i) => (<tr key={i} className="border-t border-gray-200"><td className="p-2 text-sm text-gray-600">{new Date(g.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{g.count}名</td><td className="p-2">{g.shogiStrength}</td></tr>))}</tbody></table>
              )}
              {adminSubView === 'members' && (
                log.length === 0 ? <p className="text-center text-gray-500 py-4">履歴はありません。</p> : <div className="space-y-2">{log.slice().reverse().map((e, i) => (<div key={i} className="flex justify-between items-center p-2 border-b border-gray-200 last:border-b-0"><div><p className="font-semibold">{e.name}</p><p className="text-sm text-gray-500">{new Date(e.timestamp).toLocaleString('ja-JP')}</p></div><span className={`px-3 py-1 text-sm rounded-full font-bold ${e.type === 'in' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'}`}>{e.type === 'in' ? '出勤' : '退勤'}</span></div>))}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <button onClick={onBack} className="fixed top-4 left-4 text-gray-600 hover:text-gray-900 z-10 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50">&larr; 戻る</button>
      <div className="max-w-4xl mx-auto pt-12 pb-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">管理者画面</h2>
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">来場者サマリー</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div><p className="text-lg text-gray-500">合計来場者数</p><p className="text-4xl font-bold text-gray-900">{totalVisitors}</p></div>
            <div><p className="text-lg text-gray-500">外部の方</p><p className="text-4xl font-bold text-gray-900">{externalCount}</p></div>
            <div><p className="text-lg text-gray-500">在校生</p><p className="text-4xl font-bold text-gray-900">{studentVisitors.length}</p></div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg mb-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ閲覧</h3>
          <p className="text-gray-500 mb-6">表示したい項目を選択してください。</p>
          <div className="w-full max-w-md mx-auto space-y-4">
            <button onClick={() => setAdminSubView('students')} className="w-full text-xl font-semibold py-6 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-transform transform active:scale-95 shadow-lg">在校生 来場者一覧</button>
            <button onClick={() => setAdminSubView('externals')} className="w-full text-xl font-semibold py-6 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-transform transform active:scale-95 shadow-lg">外部 来場者一覧</button>
            <button onClick={() => setAdminSubView('members')} className="w-full text-xl font-semibold py-6 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl transition-transform transform active:scale-95 shadow-lg">部員 出退勤履歴</button>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ管理</h3>
            <p className="text-gray-500 mb-4">全データを複数のCSVファイルにまとめ、ZIP形式で一括ダウンロードします。</p>
            <button onClick={handleBatchCsvBackup} className="w-full text-lg font-semibold py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
                全データをCSVで一括バックアップ
            </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8 shadow-lg">
          <h3 className="text-2xl font-semibold text-red-800 mb-4 border-b border-red-200 pb-2">危険ゾーン</h3>
          <p className="text-red-600 mb-4">この操作は元に戻せません。すべての来場者データと部員の出退勤履歴が削除されます。</p>
          <button onClick={onNavigateToReset} className="w-full md:w-auto text-lg font-semibold py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">全データをリセット</button>
        </div>
      </div>
    </div>
  );
};

const MainScreen: React.FC<{ onSelect: (selection: 'student' | 'member' | 'external') => void; onAdminAccess: () => void }> = ({ onSelect, onAdminAccess }) => {
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const handlePressStart = () => { setLongPressTimer(window.setTimeout(() => onAdminAccess(), 2000)); };
  const handlePressEnd = () => { if (longPressTimer) clearTimeout(longPressTimer); };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <h1 className="text-6xl font-bold mb-6 text-amber-100 select-none cursor-pointer text-center" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}>巣園祭2025 将棋サロン 受付</h1>
      <p className="text-2xl text-stone-300 mb-16">該当するボタンを押してください</p>
      <div className="w-full max-w-md space-y-8">
        <button onClick={() => onSelect('external')} className="w-full text-4xl font-semibold py-12 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg">外部の方</button>
        <button onClick={() => onSelect('student')} className="w-full text-4xl font-semibold py-12 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">在校生の方</button>
        <button onClick={() => onSelect('member')} className="w-full text-4xl font-semibold py-12 px-4 bg-green-800 hover:bg-green-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">将棋部員専用画面</button>
      </div>
    </div>
  );
};

const StudentForm: React.FC<{ onSubmit: (student: Omit<Student, 'timestamp'>) => void; onBack: () => void; setNotification: (notification: NotificationMessage | null) => void; }> = ({ onSubmit, onBack, setNotification }) => {
  const [grade, setGrade] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [shogiStrength, setShogiStrength] = useState(SHOGI_RANKS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grade && studentClass && studentId && shogiStrength) {
      onSubmit({ grade, class: studentClass, studentId, shogiStrength });
    } else { 
      setNotification({ message: 'すべての項目を入力してください。', type: 'error' }); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <button onClick={onBack} className="absolute top-6 left-6 text-stone-300 hover:text-white text-2xl">&larr; 戻る</button>
      <h2 className="text-5xl font-bold mb-10 text-amber-100">在校生 受付</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div><label htmlFor="grade" className="block text-xl mb-3 text-stone-300">学年</label><select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} required className="w-full p-4 text-xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        <div><label htmlFor="class" className="block text-xl mb-3 text-stone-300">クラス</label><select id="class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required className="w-full p-4 text-xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{CLASSES.map(c => <option key={c} value={c}>{c}組</option>)}</select></div>
        <div><label className="block text-xl mb-3 text-stone-300">出席番号</label><div className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-4xl h-20 flex items-center justify-center">{studentId || <span className="text-stone-500">番号</span>}</div></div>
        <NumericKeypad value={studentId} onValueChange={setStudentId} />
        <div><label htmlFor="shogiStrength" className="block text-xl mb-3 text-stone-300">棋力</label><select id="shogiStrength" value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} required className="w-full p-4 text-xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <button type="submit" className="w-full text-3xl font-semibold py-5 px-4 bg-blue-800 hover:bg-blue-700 rounded-lg transition-transform transform active:scale-95 shadow-lg !mt-8">送信</button>
      </form>
    </div>
  );
};

const ExternalForm: React.FC<{ onSubmit: (data: Omit<ExternalVisitorGroup, 'timestamp'>) => void; onBack: () => void; setNotification: (notification: NotificationMessage | null) => void; }> = ({ onSubmit, onBack, setNotification }) => {
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
        } else { 
            setNotification({ message: '人数を正しく入力してください。', type: 'error' });
        }
    };

    const handleFinalSubmit = () => {
        if (count && shogiStrength) {
            onSubmit({ count, shogiStrength });
        }
    };

    if (step === 'strength' && count !== null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-6 left-6 text-stone-300 hover:text-white text-2xl">&larr; 戻る</button>
                <h2 className="text-5xl font-bold mb-6 text-amber-100">{count}名様ですね</h2>
                <p className="text-2xl text-stone-300 mb-16">よろしければ棋力をお聞かせください</p>
                <div className="w-full max-w-md space-y-8">
                    <select value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} className="w-full p-5 text-2xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    <button onClick={handleFinalSubmit} className="w-full text-3xl font-semibold py-5 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }

    if (step === 'custom') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-6 left-6 text-stone-300 hover:text-white text-2xl">&larr; 戻る</button>
                <h2 className="text-5xl font-bold mb-10 text-amber-100">人数の入力</h2>
                <div className="w-full max-w-md space-y-8">
                    <div className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-4xl h-20 flex items-center justify-center mb-4">{customCount || <span className="text-stone-500">人数</span>}</div>
                    <NumericKeypad value={customCount} onValueChange={setCustomCount} />
                    <button onClick={handleCustomSubmit} className="w-full text-3xl font-semibold py-5 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <button onClick={onBack} className="absolute top-6 left-6 text-stone-300 hover:text-white text-2xl">&larr; 戻る</button>
            <h2 className="text-5xl font-bold mb-6 text-amber-100">ようこそ！</h2>
            <p className="text-2xl text-stone-300 mb-16 text-center">保護者の方を含め、何名様でいらっしゃいましたか？</p>
            <div className="w-full max-w-md grid grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleCountSelect(num)} className="text-4xl font-semibold py-12 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg">{num}名</button>))}
                <button onClick={() => setStep('custom')} className="text-4xl font-semibold py-12 px-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-transform transform active:scale-95 shadow-lg">その他</button>
            </div>
        </div>
    );
};

const MemberCheckin: React.FC<{ memberStatus: MemberStatus, onToggle: (name: string) => void, onBack: () => void }> = ({ memberStatus, onToggle, onBack }) => {
    const [selectedKanaRow, setSelectedKanaRow] = useState<string>('すべて');

    useEffect(() => {
        let timer: number;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = window.setTimeout(() => onBack(), 60000);
        };
        const eventListeners = ['mousemove', 'keypress', 'touchstart'];
        eventListeners.forEach(event => document.addEventListener(event, resetTimer));
        resetTimer();
        return () => {
            clearTimeout(timer);
            eventListeners.forEach(event => document.removeEventListener(event, resetTimer));
        };
    }, [onBack]);

    const KANA_ROWS: { [key: string]: string } = {
      'あ': 'あいうえお',
      'か': 'かきくけこがぎぐげご',
      'さ': 'さしすせそざじずぜぞ',
      'た': 'たちつてとだぢづでど',
      'な': 'なにぬねの',
      'は': 'はひふへほばびぶべぼぱぴぷぺぽ',
      'ま': 'まみむめも',
      'や': 'やゆよ',
      'ら': 'らりるれろ',
      'わ': 'わをん',
    };
    const KANA_GYO_KEYS = Object.keys(KANA_ROWS);
    
    const filteredMembers = MEMBERS.filter(member => {
        if (selectedKanaRow === 'すべて') return true;
        const targetRow = KANA_ROWS[selectedKanaRow];
        if (!targetRow) return false;
        return targetRow.includes(member.furigana[0]);
    });
    
    return (
        <div className="min-h-screen bg-stone-900 text-white p-4">
            <button onClick={onBack} className="absolute top-6 left-6 text-stone-300 hover:text-white text-2xl">&larr; 戻る</button>
            <div className="max-w-lg mx-auto">
                <h2 className="text-5xl font-bold mb-6 text-amber-100 text-center">部員 出退勤</h2>
                <div className="flex flex-wrap justify-center gap-2 mb-6 text-lg">
                    <button 
                        onClick={() => setSelectedKanaRow('すべて')} 
                        className={`px-4 py-2 rounded-full transition-colors ${selectedKanaRow === 'すべて' ? 'bg-amber-400 text-stone-900 font-bold' : 'bg-stone-700 hover:bg-stone-600 text-white'}`}
                    >
                        すべて
                    </button>
                    {KANA_GYO_KEYS.map(gyo => (
                        <button 
                            key={gyo} 
                            onClick={() => setSelectedKanaRow(gyo)} 
                            className={`px-4 py-2 rounded-full transition-colors ${selectedKanaRow === gyo ? 'bg-amber-400 text-stone-900 font-bold' : 'bg-stone-700 hover:bg-stone-600 text-white'}`}
                        >
                            {gyo}行
                        </button>
                    ))}
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map(member => {
                            const s = memberStatus[member.name] || { checkedIn: false };
                            return (
                                <div 
                                    key={member.name} 
                                    onClick={() => onToggle(member.name)} 
                                    className={`w-full flex justify-between items-center p-6 rounded-lg cursor-pointer transition-colors ${s.checkedIn ? 'bg-green-600' : 'bg-stone-700 hover:bg-stone-600'}`}
                                >
                                    <span className="text-2xl font-semibold">{member.name}</span>
                                    <span className={`px-4 py-2 text-base rounded-full font-bold ${s.checkedIn ? 'bg-white text-green-700' : 'bg-stone-500 text-stone-100'}`}>
                                        {s.checkedIn ? '出勤中' : '退勤中'}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-stone-400 text-xl pt-10">該当する部員がいません。</p>
                    )}
                </div>
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-6 text-center">
      <h2 className="text-7xl font-bold text-amber-100">受付完了</h2>
      <p className="text-3xl mt-10 text-stone-300 max-w-4xl leading-relaxed">{message}</p>
      <p className="text-lg mt-12 text-stone-400">自動でTOP画面に戻ります。</p>
    </div>
  );
};

const ResetConfirmationView: React.FC<{ onConfirm: (password: string) => void; onBack: () => void }> = ({ onConfirm, onBack }) => {
    const [password, setPassword] = useState('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onConfirm(password);
    };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4 text-center">
          <div className="bg-white border-2 border-red-300 rounded-2xl p-8 shadow-2xl max-w-lg w-full">
              <h2 className="text-4xl font-bold mb-4 text-red-900">最終確認</h2>
              <p className="text-xl mb-8 text-red-700">この操作は部長に許可された場合にのみ有効です。</p>
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 bg-white border border-red-300 rounded-md text-center text-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      placeholder="専用パスワード"
                      autoFocus
                  />
                  <button type="submit" className="w-full text-xl font-semibold py-4 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
                      実行
                  </button>
              </form>
          </div>
          <button onClick={onBack} className="mt-12 text-2xl font-semibold py-4 px-8 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl transition-transform transform active:scale-95 shadow-lg">
              &larr; 管理者画面に戻る
          </button>
      </div>
    );
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  const [lastVisitorType, setLastVisitorType] = useState<'student' | 'external' | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [externalVisitors, setExternalVisitors] = useLocalStorage<ExternalVisitorGroup[]>('shogi_externalVisitors', []);
  const [studentVisitors, setStudentVisitors] = useLocalStorage<Student[]>('shogi_studentVisitors', []);
  const [memberStatus, setMemberStatus] = useLocalStorage<MemberStatus>('shogi_memberStatus', {});
  const [memberLog, setMemberLog] = useLocalStorage<LogEntry[]>('shogi_memberLog', []);
  
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
  
  const handleConfirmReset = useCallback((password: string) => {
    if (password === '306') {
        setExternalVisitors([]);
        setStudentVisitors([]);
        setMemberStatus({});
        setMemberLog([]);
        setNotification({ message: 'すべてのデータがリセットされました。', type: 'success' });
        setView('admin');
    } else {
        setNotification({ message: 'パスワードが違います。', type: 'error' });
    }
  }, [setExternalVisitors, setStudentVisitors, setMemberStatus, setMemberLog]);
  
  const handleNavigateToReset = useCallback(() => setView('resetConfirmation'), []);

  const handleAdminAccess = useCallback(() => setView('adminLogin'), []);
  const handleAdminLogin = useCallback((password: string) => {
    if (password === ADMIN_PASSWORD) {
        setIsAdminAuthenticated(true);
        setView('admin');
    } else { 
        setNotification({ message: 'パスワードが違います。', type: 'error' });
    }
  }, []);

  const renderView = () => {
    switch (view) {
      case 'student': return <StudentForm onSubmit={handleStudentSubmit} onBack={handleReturnToMain} setNotification={setNotification} />;
      case 'external': return <ExternalForm onSubmit={handleExternalSubmit} onBack={handleReturnToMain} setNotification={setNotification} />;
      case 'member': return <MemberCheckin memberStatus={memberStatus} onToggle={handleMemberToggle} onBack={handleReturnToMain} />;
      case 'thanks': return <CompletionScreen onFinish={handleReturnToMain} visitorType={lastVisitorType} />;
      case 'adminLogin': return <AdminLogin onLogin={handleAdminLogin} onBack={handleReturnToMain} />;
      case 'resetConfirmation': return <ResetConfirmationView onConfirm={handleConfirmReset} onBack={() => setView('admin')} />;
      case 'admin': return isAdminAuthenticated ? <AdminView log={memberLog} studentVisitors={studentVisitors} externalVisitors={externalVisitors} memberStatus={memberStatus} onBack={handleReturnToMain} onNavigateToReset={handleNavigateToReset} setNotification={setNotification} /> : <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
      default: return <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
    }
  };

  return (
    <>
      <Notification notification={notification} />
      {renderView()}
    </>
  );
};

export default App;