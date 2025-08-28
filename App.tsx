import React, { useState, useEffect, useCallback } from 'react';

declare const JSZip: any;

// ========== データ型定義 ==========
type View = 'main' | 'student' | 'thanks' | 'admin' | 'external' | 'adminLogin' | 'resetConfirmation';

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
type NotificationMessage = { message: string; type: 'success' | 'error' };

// ========== 事前定義データ ==========
const GRADES = ['中1', '中2', '中3', '高1', '高2', '高3'];
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SHOGI_RANKS = ['特にない', '11級以下', '10級', '9級', '8級', '7級', '6級', '5級', '4級', '3級', '2級', '1級', '初段', '二段', '三段', '四段以上'];
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

const LoadingSpinner: React.FC = () => (
  <div role="status" aria-label="読み込み中">
    <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span className="sr-only">読み込み中...</span>
  </div>
);


const Notification: React.FC<{ notification: NotificationMessage | null }> = ({ notification }) => {
  if (!notification) return null;
  const baseStyle = "fixed bottom-8 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-2xl text-white z-[100] text-lg";
  const typeStyle = notification.type === 'success' ? 'bg-green-600' : 'bg-red-700';
  return (
    <div className={`${baseStyle} ${typeStyle}`} role="alert" aria-live="assertive">
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
  const buttonClass = "w-full h-24 bg-stone-700 hover:bg-stone-600 rounded-lg text-5xl font-bold flex items-center justify-center transition-transform transform active:scale-95 text-white";

  return (
    <div className="w-full max-w-xs mx-auto grid grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
        <button key={key} type="button" onClick={() => handleKeyPress(key)} className={buttonClass} aria-label={`数字 ${key}`}>{key}</button>
      ))}
      <button type="button" onClick={handleClear} className={`${buttonClass} bg-red-800 hover:bg-red-700`} aria-label="クリア">C</button>
      <button type="button" onClick={() => handleKeyPress('0')} className={buttonClass} aria-label="数字 0">0</button>
      <button type="button" onClick={handleBackspace} className={`${buttonClass} bg-stone-600 hover:bg-stone-500`} aria-label="一文字削除">⌫</button>
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
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 text-xl p-2 rounded-full transition-transform transform active:scale-95" aria-label="メイン画面に戻る">&larr; 戻る</button>
        <h2 id="admin-login-title" className="text-3xl font-bold mb-8 text-gray-900">管理者ログイン</h2>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6" aria-labelledby="admin-login-title">
          <label htmlFor="admin-password" className="sr-only">パスワード</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-white border border-gray-300 rounded-md text-center text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="パスワード"
            aria-required="true"
          />
          <button type="submit" className="w-full text-2xl font-semibold py-5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
            ログイン
          </button>
        </form>
      </div>
    );
};

const AdminView: React.FC<{
  studentVisitors: Student[];
  externalVisitors: ExternalVisitorGroup[];
  onBack: () => void;
  onNavigateToReset: () => void;
  setNotification: (notification: NotificationMessage | null) => void;
  customMessages: { student: string; external: string };
  setCustomMessages: (messages: { student: string; external: string }) => void;
}> = ({ studentVisitors, externalVisitors, onBack, onNavigateToReset, setNotification, customMessages, setCustomMessages }) => {
  const [adminSubView, setAdminSubView] = useState<'menu' | 'students' | 'externals'>('menu');
  const [editedStudentMessage, setEditedStudentMessage] = useState(customMessages.student);
  const [editedExternalMessage, setEditedExternalMessage] = useState(customMessages.external);
  const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
  const totalVisitors = externalCount + studentVisitors.length;

  const handleSaveMessages = () => {
    setCustomMessages({ student: editedStudentMessage, external: editedExternalMessage });
    setNotification({ message: '完了メッセージを保存しました。', type: 'success' });
  };

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
    };
    return (
      <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
        <button onClick={() => setAdminSubView('menu')} className="fixed top-4 left-4 text-gray-600 hover:text-gray-900 z-10 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full px-5 py-3 text-lg hover:bg-gray-50 transition-transform transform active:scale-95" aria-label="管理者メニューに戻る">&larr; 管理者メニューに戻る</button>
        <div className="max-w-6xl mx-auto pt-16">
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">{listTitle[adminSubView]}</h3>
            <div className="max-h-[75vh] overflow-y-auto">
              {adminSubView === 'students' && (
                studentVisitors.length === 0 ? <p className="text-center text-gray-500 py-4">在校生の来場者はいません。</p> : <table className="w-full text-left"><thead className="sticky top-0 bg-gray-50"><tr><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">学年</th><th scope="col" className="p-2">クラス</th><th scope="col" className="p-2">番号</th><th scope="col" className="p-2">棋力</th></tr></thead><tbody>{studentVisitors.slice().reverse().map((s, i) => (<tr key={i} className="border-t border-gray-200"><td className="p-2 text-sm text-gray-600">{new Date(s.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{s.grade}</td><td className="p-2">{s.class}</td><td className="p-2">{s.studentId}</td><td className="p-2">{s.shogiStrength}</td></tr>))}</tbody></table>
              )}
              {adminSubView === 'externals' && (
                externalVisitors.length === 0 ? <p className="text-center text-gray-500 py-4">外部の来場者はいません。</p> : <table className="w-full text-left"><thead className="sticky top-0 bg-gray-50"><tr><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">人数</th><th scope="col" className="p-2">棋力</th></tr></thead><tbody>{externalVisitors.slice().reverse().map((g, i) => (<tr key={i} className="border-t border-gray-200"><td className="p-2 text-sm text-gray-600">{new Date(g.timestamp).toLocaleString('ja-JP')}</td><td className="p-2">{g.count}名</td><td className="p-2">{g.shogiStrength}</td></tr>))}</tbody></table>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <button onClick={onBack} className="fixed top-4 left-4 text-gray-600 hover:text-gray-900 z-10 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-full px-5 py-3 text-lg hover:bg-gray-50 transition-transform transform active:scale-95">&larr; 戻る</button>
      <div className="max-w-4xl mx-auto pt-12 pb-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">管理者画面</h2>
        
        <section className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="summary-title">
          <h3 id="summary-title" className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">来場者サマリー</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div><p className="text-lg text-gray-500">合計来場者数</p><p className="text-4xl font-bold text-gray-900">{totalVisitors}</p></div>
            <div><p className="text-lg text-gray-500">外部の方</p><p className="text-4xl font-bold text-gray-900">{externalCount}</p></div>
            <div><p className="text-lg text-gray-500">在校生</p><p className="text-4xl font-bold text-gray-900">{studentVisitors.length}</p></div>
          </div>
        </section>
        
        <section className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg mb-8" aria-labelledby="data-view-title">
          <h3 id="data-view-title" className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ閲覧</h3>
          <p className="text-gray-500 mb-6">表示したい項目を選択してください。</p>
          <div className="w-full max-w-md mx-auto space-y-4">
            <button onClick={() => setAdminSubView('students')} className="w-full text-3xl font-semibold py-8 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition-transform transform active:scale-95 shadow-lg">在校生 来場者一覧</button>
            <button onClick={() => setAdminSubView('externals')} className="w-full text-3xl font-semibold py-8 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-transform transform active:scale-95 shadow-lg">外部 来場者一覧</button>
          </div>
        </section>
        
        <section className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="data-manage-title">
            <h3 id="data-manage-title" className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ管理</h3>
            <p className="text-gray-500 mb-4">全データを複数のCSVファイルにまとめ、ZIP形式で一括ダウンロードします。</p>
            <button onClick={handleBatchCsvBackup} className="w-full text-xl font-semibold py-4 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
                全データをCSVで一括バックアップ
            </button>
        </section>

        <section className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg mb-8" aria-labelledby="message-edit-title">
            <h3 id="message-edit-title" className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">完了メッセージの編集</h3>
            <p className="text-gray-500 mb-6">受付完了画面に表示されるメッセージをカスタマイズできます。</p>
            <div className="space-y-6">
                <div>
                    <label htmlFor="studentMessage" className="block text-lg font-medium text-gray-700 mb-2">在校生向けメッセージ</label>
                    <textarea
                        id="studentMessage"
                        rows={5}
                        className="w-full p-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={editedStudentMessage}
                        onChange={(e) => setEditedStudentMessage(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="externalMessage" className="block text-lg font-medium text-gray-700 mb-2">外部向けメッセージ</label>
                    <textarea
                        id="externalMessage"
                        rows={5}
                        className="w-full p-3 bg-white border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={editedExternalMessage}
                        onChange={(e) => setEditedExternalMessage(e.target.value)}
                    />
                </div>
                <button onClick={handleSaveMessages} className="w-full text-xl font-semibold py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
                    メッセージを保存
                </button>
            </div>
        </section>
        
        <section className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="danger-zone-title">
          <h3 id="danger-zone-title" className="text-2xl font-semibold text-red-800 mb-4 border-b border-red-200 pb-2">危険ゾーン</h3>
          <p className="text-red-600 mb-4">この操作は元に戻せません。すべての来場者データが削除されます。</p>
          <button onClick={onNavigateToReset} className="w-full md:w-auto text-xl font-semibold py-4 px-8 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">全データをリセット</button>
        </section>
      </div>
    </div>
  );
};

const MainScreen: React.FC<{ onSelect: (selection: 'student' | 'external') => void; onAdminAccess: () => void; }> = ({ onSelect, onAdminAccess }) => {
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const handlePressStart = () => { setLongPressTimer(window.setTimeout(() => onAdminAccess(), 2000)); };
  const handlePressEnd = () => { if (longPressTimer) clearTimeout(longPressTimer); };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <h1 className="text-5xl font-bold mb-10 text-amber-100 select-none cursor-pointer text-center" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} aria-label="タイトル。2秒間長押しで管理者ログイン">
        2025年度 巣園祭 将棋サロン
        <br />
        <span className="inline-block mt-4 bg-amber-300 text-stone-900 px-8 py-3 rounded-lg text-7xl tracking-widest shadow-md">
          受付
        </span>
      </h1>
      <p className="text-2xl text-stone-300 mb-16">該当するボタンを押してください</p>
      <div className="w-full max-w-md space-y-8">
        <button onClick={() => onSelect('external')} className="w-full text-5xl font-semibold py-16 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg" aria-label="外部の方はこちら">外部の方</button>
        <button onClick={() => onSelect('student')} className="w-full text-5xl font-semibold py-16 px-4 bg-blue-800 hover:bg-blue-700 rounded-xl transition-transform transform active:scale-95 shadow-lg" aria-label="在校生の方はこちら">在校生の方</button>
      </div>
    </div>
  );
};

const StudentForm: React.FC<{ onSubmit: (student: Omit<Student, 'timestamp'>) => void; onBack: () => void; setNotification: (notification: NotificationMessage | null) => void; }> = ({ onSubmit, onBack, setNotification }) => {
  const [grade, setGrade] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [shogiStrength, setShogiStrength] = useState(SHOGI_RANKS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) {
      setNotification({ message: '個人情報の取り扱いに同意してください。', type: 'error' });
      return;
    }
    if (grade && studentClass && studentId && shogiStrength) {
      setIsLoading(true);
      setTimeout(() => {
        onSubmit({ grade, class: studentClass, studentId, shogiStrength });
      }, 500);
    } else { 
      setNotification({ message: 'すべての項目を入力してください。', type: 'error' }); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
      <button onClick={onBack} className="absolute top-6 left-6 text-stone-300 hover:text-white text-3xl p-2 rounded-full transition-transform transform active:scale-95" aria-label="戻る">&larr; 戻る</button>
      <h2 className="text-5xl font-bold mb-10 text-amber-100">在校生 受付</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div><label htmlFor="grade" className="block text-xl mb-3 text-stone-300">学年</label><select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} required aria-required="true" className="w-full p-5 text-2xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
        <div><label htmlFor="class" className="block text-xl mb-3 text-stone-300">クラス</label><select id="class" value={studentClass} onChange={(e) => setStudentClass(e.target.value)} required aria-required="true" className="w-full p-5 text-2xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none"><option value="">選択してください</option>{CLASSES.map(c => <option key={c} value={c}>{c}組</option>)}</select></div>
        <div><label id="student-id-label" className="block text-xl mb-3 text-stone-300">出席番号</label><div role="status" aria-labelledby="student-id-label" className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-5xl h-24 flex items-center justify-center">{studentId || <span className="text-stone-500">番号</span>}</div></div>
        <NumericKeypad value={studentId} onValueChange={setStudentId} />
        <div><label htmlFor="shogiStrength" className="block text-xl mb-3 text-stone-300">棋力</label><select id="shogiStrength" value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} required aria-required="true" className="w-full p-5 text-2xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        
        <div className="!mt-8 p-4 bg-stone-800 border border-stone-700 rounded-lg text-stone-300 space-y-4">
          <h3 className="text-lg font-semibold text-white">個人情報の取り扱いについて</h3>
          <p className="text-sm leading-relaxed">
            ご記入いただいた個人情報（クラス・番号）は、以下の目的にのみ利用させていただきます。<br />
            ・文化祭で何か問題が発生した場合のご連絡
          </p>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input 
              type="checkbox"
              id="privacy-agreement"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="h-6 w-6 rounded bg-stone-700 border-stone-500 text-blue-600 focus:ring-blue-500"
              aria-describedby="privacy-policy-text"
            />
            <span id="privacy-policy-text" className="text-stone-200">上記の利用目的に同意します。</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !hasAgreed}
          className="w-full text-4xl font-semibold py-6 px-4 bg-blue-800 hover:bg-blue-700 rounded-lg transition-transform transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-stone-700 disabled:cursor-not-allowed disabled:text-stone-400"
          aria-disabled={isLoading || !hasAgreed}
        >
          {isLoading ? <LoadingSpinner /> : '送信'}
        </button>
      </form>
    </div>
  );
};

const ExternalForm: React.FC<{ onSubmit: (data: Omit<ExternalVisitorGroup, 'timestamp'>) => void; onBack: () => void; setNotification: (notification: NotificationMessage | null) => void; }> = ({ onSubmit, onBack, setNotification }) => {
    const [count, setCount] = useState<number | null>(null);
    const [customCount, setCustomCount] = useState('');
    const [shogiStrength, setShogiStrength] = useState(SHOGI_RANKS[0]);
    const [step, setStep] = useState<'count' | 'custom' | 'strength'>('count');
    const [isLoading, setIsLoading] = useState(false);

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
            setIsLoading(true);
            setTimeout(() => {
                onSubmit({ count, shogiStrength });
            }, 500);
        }
    };

    if (step === 'strength' && count !== null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-6 left-6 text-stone-300 hover:text-white text-3xl p-2 rounded-full transition-transform transform active:scale-95" aria-label="人数選択に戻る">&larr; 戻る</button>
                <h2 className="text-5xl font-bold mb-6 text-amber-100">{count}名様ですね</h2>
                <p className="text-2xl text-stone-300 mb-16 text-center">グループの中で最も棋力が高い方のものを選択してください。</p>
                <div className="w-full max-w-md space-y-8">
                    <label htmlFor="shogiStrengthExternal" className="sr-only">棋力</label>
                    <select id="shogiStrengthExternal" value={shogiStrength} onChange={(e) => setShogiStrength(e.target.value)} className="w-full p-6 text-3xl bg-stone-800 border border-stone-600 rounded-md focus:ring-2 focus:ring-amber-400 focus:outline-none">{SHOGI_RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    <button 
                        onClick={handleFinalSubmit} 
                        disabled={isLoading}
                        className="w-full text-4xl font-semibold py-6 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-stone-800 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <LoadingSpinner /> : '決定'}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'custom') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <button onClick={() => setStep('count')} className="absolute top-6 left-6 text-stone-300 hover:text-white text-3xl p-2 rounded-full transition-transform transform active:scale-95" aria-label="人数選択に戻る">&larr; 戻る</button>
                <h2 className="text-5xl font-bold mb-10 text-amber-100">人数の入力</h2>
                <div className="w-full max-w-md space-y-8">
                    <div role="status" className="w-full p-3 bg-stone-800 border border-stone-600 rounded-md text-center text-5xl h-24 flex items-center justify-center mb-4">{customCount || <span className="text-stone-500">人数</span>}</div>
                    <NumericKeypad value={customCount} onValueChange={setCustomCount} />
                    <button onClick={handleCustomSubmit} className="w-full text-4xl font-semibold py-6 px-4 bg-stone-600 hover:bg-stone-500 rounded-lg transition-transform transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <button onClick={onBack} className="absolute top-6 left-6 text-stone-300 hover:text-white text-3xl p-2 rounded-full transition-transform transform active:scale-95" aria-label="メイン画面に戻る">&larr; 戻る</button>
            <h2 className="text-5xl font-bold mb-6 text-amber-100">ようこそ！</h2>
            <p className="text-2xl text-stone-300 mb-16 text-center">保護者の方を含め、何名様でいらっしゃいましたか？</p>
            <div className="w-full max-w-md grid grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleCountSelect(num)} className="text-5xl font-semibold py-16 px-4 bg-stone-700 hover:bg-stone-600 rounded-xl transition-transform transform active:scale-95 shadow-lg" aria-label={`${num}名`}>{num}名</button>))}
                <button onClick={() => setStep('custom')} className="text-5xl font-semibold py-16 px-4 bg-stone-800 hover:bg-stone-700 rounded-xl transition-transform transform active:scale-95 shadow-lg" aria-label="その他の人数">その他</button>
            </div>
        </div>
    );
};

const CompletionScreen: React.FC<{ onFinish: () => void; visitorType: 'student' | 'external' | null; customMessages: { student: string; external: string }; }> = ({ onFinish, visitorType, customMessages }) => {
  useEffect(() => {
    const timer = setTimeout(() => onFinish(), 8000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const message = visitorType ? customMessages[visitorType] : "将棋部の展示をお楽しみください！";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-6" role="alert">
      <h2 className="text-7xl font-bold text-amber-100 text-center">受付完了</h2>
      <p className="w-full max-w-4xl text-3xl mt-10 text-stone-300 leading-relaxed whitespace-pre-line text-left">{message}</p>
      <p className="text-lg mt-12 text-stone-400 text-center">自動でTOP画面に戻ります。</p>
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
                  <label htmlFor="reset-password" className="sr-only">専用パスワード</label>
                  <input
                      id="reset-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 bg-white border border-red-300 rounded-md text-center text-xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      placeholder="専用パスワード"
                      autoFocus
                      aria-required="true"
                  />
                  <button type="submit" className="w-full text-2xl font-semibold py-5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-transform transform active:scale-95 shadow-lg">
                      実行
                  </button>
              </form>
          </div>
          <button onClick={onBack} className="mt-12 text-3xl font-semibold py-5 px-10 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl transition-transform transform active:scale-95 shadow-lg" aria-label="管理者画面に戻る">
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
  
  const defaultMessages = {
    external: "パンフレットを取って、将棋サロンをお楽しみください。\n何か不明点等ございましたら、近くにいる部員にお気軽にお声掛けください。",
    student: "希望する場合はパンフレットを受け取ってください。\n※簡単な戦法研究や詰将棋が掲載されているので、周りの人より強くなりたいという人はぜひ読んでみて下さい！\n混雑時は外部の方優先で対応させていただきます。\n移動などをお願いする場合がありますが、将棋部員の指示に従ってください。\nご理解・ご協力をお願いします。\n現在、将棋部では体験入部・入部を受け付けています。\n興味があれば、人数は問いませんので気軽に来て下さい！",
  };
  const [customMessages, setCustomMessages] = useLocalStorage<{ student: string; external: string }>('shogi_customMessages', defaultMessages);


  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSelect = useCallback((selection: 'student' | 'external') => setView(selection), []);
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
  
  const handleConfirmReset = useCallback((password: string) => {
    if (password === '306') {
        setExternalVisitors([]);
        setStudentVisitors([]);
        setNotification({ message: 'すべてのデータがリセットされました。', type: 'success' });
        setView('admin');
    } else {
        setNotification({ message: 'パスワードが違います。', type: 'error' });
    }
  }, [setExternalVisitors, setStudentVisitors]);
  
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
      case 'thanks': return <CompletionScreen onFinish={handleReturnToMain} visitorType={lastVisitorType} customMessages={customMessages} />;
      case 'adminLogin': return <AdminLogin onLogin={handleAdminLogin} onBack={handleReturnToMain} />;
      case 'resetConfirmation': return <ResetConfirmationView onConfirm={handleConfirmReset} onBack={() => setView('admin')} />;
      case 'admin': return isAdminAuthenticated ? <AdminView studentVisitors={studentVisitors} externalVisitors={externalVisitors} onBack={handleReturnToMain} onNavigateToReset={handleNavigateToReset} setNotification={setNotification} customMessages={customMessages} setCustomMessages={setCustomMessages} /> : <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
      default: return <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
    }
  };

  return (
    <>
      <Notification notification={notification} />
      <div key={view} className="view-container">
        {renderView()}
      </div>
    </>
  );
};

export default App;