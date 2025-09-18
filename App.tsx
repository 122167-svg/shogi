import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';

declare const JSZip: any;

// ========== データ型定義 ==========
type View = 'main' | 'student' | 'thanks' | 'admin' | 'external' | 'parent' | 'ob' | 'adminLogin' | 'resetConfirmation';

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
interface ParentVisitorGroup {
  count: number;
  shogiStrength: string;
  sonInClub: boolean;
  timestamp: string;
}
interface AlumniVisitorGroup {
  count: number;
  shogiStrength: string;
  wasInClub: boolean;
  timestamp: string;
}
interface TeacherVisitor {
    timestamp: string;
}

type NotificationMessage = { message: string; type: 'success' | 'error' };
type VisitorType = 'student' | 'external' | 'parent' | 'ob' | 'teacher' | null;

// ========== 事前定義データ ==========
const GRADES = ['中1', '中2', '中3', '高1', '高2', '高3'];
const CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SHOGI_STRENGTH_CATEGORIES = ['特にない', '級位者', '有段者'];
const KYU_RANKS = ['11級以下', '10級', '9級', '8級', '7級', '6級', '5級', '4級', '3級', '2級', '1級'];
const DAN_RANKS = ['初段', '二段', '三段', '四段以上'];

const ADMIN_PASSWORD = 'shogi';
const defaultMessages = {
    external: "有段者の方は赤いパンフレットを、級位者初心者の方は青いパンフレットを取って、将棋サロンをお楽しみください。\nまた、部員との対局を希望される方は、お手数ですが、”部員対局受付”までお申し出ください。\nその他何か不明点等ございましたら、近くにいる部員にお気軽にお声掛けください。",
    student: "希望する場合はパンフレットを受け取ってください。\n※簡単な戦法研究や詰将棋が掲載されているので、周りの人より強くなりたいという人はぜひ読んでみて下さい！\n混雑時は外部の方優先で対応させていただきます。\n移動などをお願いする場合がありますが、将棋部員の指示に従ってください。\nご理解・ご協力をお願いします。\n現在、将棋部では体験入部・入部を受け付けています。\n興味があれば、人数は問いませんので気軽に来て下さい！",
    parent: "将棋サロンへようこそ！将棋部の雰囲気をお楽しみください。何かご不明な点がございましたら、お近くの部員までお声がけください。",
    ob: "希望される場合は、パンフレット（赤:有段者用　青：級位者用）を取ってください。\nお時間がありましたら、ぜひ現役部員との対局もお楽しみください。",
    teacher: "ご来場ありがとうございます。将棋サロンをお楽しみください。"
};

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


// ========== 状態管理 (Context API) ==========
interface VisitorContextType {
  studentVisitors: Student[];
  externalVisitors: ExternalVisitorGroup[];
  parentVisitors: ParentVisitorGroup[];
  alumniVisitors: AlumniVisitorGroup[];
  teacherVisitors: TeacherVisitor[];
  customMessages: Record<string, string>;
  notification: NotificationMessage | null;
  setNotification: (notification: NotificationMessage | null) => void;
  setCustomMessages: (messages: Record<string, string>) => void;
  handleStudentSubmit: (students: Omit<Student, 'timestamp'>[]) => void;
  handleExternalSubmit: (data: { count: number, shogiStrength: string }) => void;
  handleParentSubmit: (data: { count: number, shogiStrength: string, extraAnswer: boolean }) => void;
  handleAlumniSubmit: (data: { count: number, shogiStrength: string, extraAnswer: boolean }) => void;
  handleTeacherSubmit: () => void;
  handleDeleteVisitor: (visitorType: 'students' | 'externals' | 'parents' | 'alumni' | 'teachers', timestamp: string) => void;
  handleConfirmReset: (password: string) => void;
  handleAdminLogin: (password: string) => void;
}

const VisitorContext = createContext<VisitorContextType | undefined>(undefined);

const VisitorProvider: React.FC<{
    children: React.ReactNode;
    setView: React.Dispatch<React.SetStateAction<View>>;
    setLastVisitorType: React.Dispatch<React.SetStateAction<VisitorType>>;
    setIsAdminAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ children, setView, setLastVisitorType, setIsAdminAuthenticated }) => {
    const [notification, setNotification] = useState<NotificationMessage | null>(null);
    const [externalVisitors, setExternalVisitors] = useLocalStorage<ExternalVisitorGroup[]>('shogi_externalVisitors', []);
    const [studentVisitors, setStudentVisitors] = useLocalStorage<Student[]>('shogi_studentVisitors', []);
    const [parentVisitors, setParentVisitors] = useLocalStorage<ParentVisitorGroup[]>('shogi_parentVisitors', []);
    const [alumniVisitors, setAlumniVisitors] = useLocalStorage<AlumniVisitorGroup[]>('shogi_alumniVisitors', []);
    const [teacherVisitors, setTeacherVisitors] = useLocalStorage<TeacherVisitor[]>('shogi_teacherVisitors', []);
    const [customMessages, setCustomMessages] = useLocalStorage<Record<string, string>>('shogi_customMessages', defaultMessages);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleStudentSubmit = useCallback((students: Omit<Student, 'timestamp'>[]) => {
        const timestamp = new Date().toISOString();
        const newVisitors = students.map(s => ({ ...s, timestamp }));
        setStudentVisitors(prev => [...prev, ...newVisitors]);
        setLastVisitorType('student');
        setView('thanks');
    }, [setStudentVisitors, setView, setLastVisitorType]);
    
    const handleExternalSubmit = useCallback((data: { count: number, shogiStrength: string }) => {
        setExternalVisitors(prev => [...prev, { ...data, timestamp: new Date().toISOString() }]);
        setLastVisitorType('external');
        setView('thanks');
    }, [setExternalVisitors, setView, setLastVisitorType]);

    const handleParentSubmit = useCallback((data: { count: number, shogiStrength: string, extraAnswer: boolean }) => {
        const newVisitor: Omit<ParentVisitorGroup, 'timestamp'> = { count: data.count, shogiStrength: data.shogiStrength, sonInClub: data.extraAnswer };
        setParentVisitors(prev => [...prev, { ...newVisitor, timestamp: new Date().toISOString() }]);
        setLastVisitorType('parent');
        setView('thanks');
    }, [setParentVisitors, setView, setLastVisitorType]);

    const handleAlumniSubmit = useCallback((data: { count: number, shogiStrength: string, extraAnswer: boolean }) => {
        const newVisitor: Omit<AlumniVisitorGroup, 'timestamp'> = { count: data.count, shogiStrength: data.shogiStrength, wasInClub: data.extraAnswer };
        setAlumniVisitors(prev => [...prev, { ...newVisitor, timestamp: new Date().toISOString() }]);
        setLastVisitorType('ob');
        setView('thanks');
    }, [setAlumniVisitors, setView, setLastVisitorType]);

    const handleTeacherSubmit = useCallback(() => {
        setTeacherVisitors(prev => [...prev, { timestamp: new Date().toISOString() }]);
        setLastVisitorType('teacher');
        setView('thanks');
    }, [setTeacherVisitors, setView, setLastVisitorType]);
    
    const handleConfirmReset = useCallback((password: string) => {
        if (password === '306') {
            setExternalVisitors([]);
            setStudentVisitors([]);
            setParentVisitors([]);
            setAlumniVisitors([]);
            setTeacherVisitors([]);
            setNotification({ message: 'すべてのデータがリセットされました。', type: 'success' });
            setView('admin');
        } else {
            setNotification({ message: 'パスワードが違います。', type: 'error' });
        }
    }, [setExternalVisitors, setStudentVisitors, setParentVisitors, setAlumniVisitors, setTeacherVisitors, setView]);
    
    const handleAdminLogin = useCallback((password: string) => {
        if (password === ADMIN_PASSWORD) {
            setIsAdminAuthenticated(true);
            setView('admin');
        } else {
            setNotification({ message: 'パスワードが違います。', type: 'error' });
        }
    }, [setIsAdminAuthenticated, setView]);

    const handleDeleteVisitor = useCallback((visitorType: 'students' | 'externals' | 'parents' | 'alumni' | 'teachers', timestamp: string) => {
        if (window.confirm('この来場者データを本当に削除しますか？この操作は元に戻せません。')) {
            switch (visitorType) {
                case 'students': setStudentVisitors(prev => prev.filter(v => v.timestamp !== timestamp)); break;
                case 'externals': setExternalVisitors(prev => prev.filter(v => v.timestamp !== timestamp)); break;
                case 'parents': setParentVisitors(prev => prev.filter(v => v.timestamp !== timestamp)); break;
                case 'alumni': setAlumniVisitors(prev => prev.filter(v => v.timestamp !== timestamp)); break;
                case 'teachers': setTeacherVisitors(prev => prev.filter(v => v.timestamp !== timestamp)); break;
            }
            setNotification({ message: 'データを削除しました。', type: 'success' });
        }
    }, [setStudentVisitors, setExternalVisitors, setParentVisitors, setAlumniVisitors, setTeacherVisitors]);

    const value = {
        studentVisitors, externalVisitors, parentVisitors, alumniVisitors, teacherVisitors,
        customMessages, notification, setNotification, setCustomMessages,
        handleStudentSubmit, handleExternalSubmit, handleParentSubmit, handleAlumniSubmit, handleTeacherSubmit,
        handleDeleteVisitor, handleConfirmReset, handleAdminLogin
    };

    return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
};

const useVisitorContext = () => {
    const context = useContext(VisitorContext);
    if (context === undefined) {
        throw new Error('useVisitorContext must be used within a VisitorProvider');
    }
    return context;
};

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

const BackButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = "戻る" }) => (
    <button onClick={onClick} className="absolute top-6 left-6 text-white bg-stone-800 border border-stone-600 hover:bg-stone-700 text-3xl p-4 rounded-full shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center z-20" aria-label={label}>
      &larr;
    </button>
);

const Notification: React.FC = () => {
  const { notification } = useVisitorContext();
  if (!notification) return null;
  const baseStyle = "fixed bottom-8 left-1/2 -translate-x-1/2 py-3 px-6 rounded-lg shadow-2xl text-white z-[100] text-xl border";
  const typeStyle = notification.type === 'success' ? 'bg-green-600 border-green-500' : 'bg-red-700 border-red-600';
  return (
    <div className={`${baseStyle} ${typeStyle}`} role="alert" aria-live="assertive">
      {notification.message}
    </div>
  );
};

const NumericKeypad: React.FC<{ value: string; onValueChange: (value: string) => void; lightTheme?: boolean }> = ({ value, onValueChange, lightTheme = false }) => {
  const handleKeyPress = (key: string) => {
    if (value.length >= 2) return;
    onValueChange(value + key);
  };
  const handleBackspace = () => onValueChange(value.slice(0, -1));
  const handleClear = () => onValueChange('');
  const buttonClass = lightTheme
    ? "w-full h-28 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-6xl font-bold flex items-center justify-center transition-all duration-300 transform active:scale-95 text-gray-800"
    : "w-full h-28 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-lg text-6xl font-bold flex items-center justify-center transition-all duration-300 transform active:scale-95 text-white";
  const clearButtonClass = lightTheme
    ? "bg-red-500 hover:bg-red-600 border-red-300 text-white"
    : "bg-red-800 hover:bg-red-700 border-red-600 text-white";
  const backspaceButtonClass = lightTheme
    ? "bg-gray-200 hover:bg-gray-300 border-gray-300"
    : "bg-stone-700 hover:bg-stone-600 border-stone-500 text-white";

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-4">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
        <button key={key} type="button" onClick={() => handleKeyPress(key)} className={buttonClass} aria-label={`数字 ${key}`}>{key}</button>
      ))}
      <button type="button" onClick={handleClear} className={`${buttonClass} ${clearButtonClass}`} aria-label="クリア">C</button>
      <button type="button" onClick={() => handleKeyPress('0')} className={buttonClass} aria-label="数字 0">0</button>
      <button type="button" onClick={handleBackspace} className={`${buttonClass} ${backspaceButtonClass}`} aria-label="一文字削除">⌫</button>
    </div>
  );
};

const AdminLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [password, setPassword] = useState('');
    const { handleAdminLogin } = useVisitorContext();
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleAdminLogin(password);
    };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 text-2xl p-3 rounded-full transition-all transform active:scale-95" aria-label="メイン画面に戻る">&larr; 戻る</button>
        <h2 id="admin-login-title" className="text-4xl font-bold mb-8 text-gray-900">管理者ログイン</h2>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6" aria-labelledby="admin-login-title">
          <label htmlFor="admin-password" className="sr-only">パスワード</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-white border border-gray-300 rounded-md text-center text-gray-900 text-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="パスワード"
            aria-required="true"
            autoFocus
          />
          <button type="submit" className="w-full text-3xl font-semibold py-5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">
            ログイン
          </button>
        </form>
      </div>
    );
};

const AdminView: React.FC<{ onBack: () => void; onNavigateToReset: () => void; }> = ({ onBack, onNavigateToReset }) => {
  const { studentVisitors, externalVisitors, parentVisitors, alumniVisitors, teacherVisitors, setNotification, handleDeleteVisitor, customMessages, setCustomMessages } = useVisitorContext();
  const [adminSubView, setAdminSubView] = useState<'menu' | 'students' | 'externals' | 'parents' | 'alumni' | 'teachers'>('menu');
  const [editedMessages, setEditedMessages] = useState(customMessages);
  
  const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
  const parentCount = parentVisitors.reduce((sum, group) => sum + group.count, 0);
  const alumniCount = alumniVisitors.reduce((sum, group) => sum + group.count, 0);
  const teacherCount = teacherVisitors.length;
  const totalVisitors = externalCount + studentVisitors.length + parentCount + alumniCount + teacherCount;

  const handleSaveMessages = () => {
    setCustomMessages(editedMessages);
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
            if (typeof value === 'boolean') value = value ? 'はい' : 'いいえ';
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

      const processVisitorData = (visitors: any[], fileName: string, headers: Record<string, string>) => {
        if (visitors.length > 0) {
            const csvData = convertToCsv(visitors.map(v => ({...v, timestamp: new Date(v.timestamp).toLocaleString('ja-JP')})), headers);
            zip.file(`${fileName}.csv`, csvData);
        }
      };

      processVisitorData(studentVisitors, '在校生来場者', { timestamp: '受付日時', grade: '学年', class: 'クラス', studentId: '出席番号', shogiStrength: '棋力' });
      processVisitorData(externalVisitors, '外部来場者', { timestamp: '受付日時', count: '人数', shogiStrength: '棋力' });
      processVisitorData(parentVisitors, '保護者来場者', { timestamp: '受付日時', count: '人数', shogiStrength: '棋力', sonInClub: 'ご子息は将棋部員か' });
      processVisitorData(alumniVisitors, 'OB来場者', { timestamp: '受付日時', count: '人数', shogiStrength: '棋力', wasInClub: '在校時将棋部員か' });
      processVisitorData(teacherVisitors, '教職員来場者', { timestamp: '受付日時' });
      
      zip.generateAsync({ type: 'blob' }).then((blob: any) => {
        if (Object.keys(zip.files).length === 0) {
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
    const titles: Record<string, string> = { students: '在校生', externals: '外部', parents: '保護者', alumni: 'OB', teachers: '教職員' };
    const listTitle = `${titles[adminSubView]} 来場者一覧`;

    const dataMap: Record<string, any[]> = {
        students: studentVisitors, externals: externalVisitors, parents: parentVisitors, alumni: alumniVisitors, teachers: teacherVisitors,
    };
    const currentData = dataMap[adminSubView];
    
    const headers: Record<string, JSX.Element> = {
        students: <><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">学年</th><th scope="col" className="p-2">クラス</th><th scope="col" className="p-2">番号</th><th scope="col" className="p-2">棋力</th><th scope="col" className="p-2 text-right">操作</th></>,
        externals: <><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">人数</th><th scope="col" className="p-2">棋力</th><th scope="col" className="p-2 text-right">操作</th></>,
        parents: <><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">人数</th><th scope="col" className="p-2">棋力</th><th scope="col" className="p-2">子息が部員</th><th scope="col" className="p-2 text-right">操作</th></>,
        alumni: <><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2">人数</th><th scope="col" className="p-2">棋力</th><th scope="col" className="p-2">元部員</th><th scope="col" className="p-2 text-right">操作</th></>,
        teachers: <><th scope="col" className="p-2">受付日時</th><th scope="col" className="p-2 text-right">操作</th></>,
    };
    const rowRenderers: Record<string, (item: any) => JSX.Element> = {
        students: (s) => <tr key={s.timestamp} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-2 text-sm text-gray-500">{new Date(s.timestamp).toLocaleString('ja-JP')}</td><td className="p-2 text-gray-800">{s.grade}</td><td className="p-2 text-gray-800">{s.class}</td><td className="p-2 text-gray-800">{s.studentId}</td><td className="p-2 text-gray-800">{s.shogiStrength}</td><td className="p-2 text-right"><button onClick={() => handleDeleteVisitor('students', s.timestamp)} className="text-red-600 hover:text-red-800 font-semibold px-3 py-1 rounded-md hover:bg-red-100 transition-colors" aria-label={`${new Date(s.timestamp).toLocaleString('ja-JP')}の在校生データを削除`}>削除</button></td></tr>,
        externals: (g) => <tr key={g.timestamp} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-2 text-sm text-gray-500">{new Date(g.timestamp).toLocaleString('ja-JP')}</td><td className="p-2 text-gray-800">{g.count}名</td><td className="p-2 text-gray-800">{g.shogiStrength}</td><td className="p-2 text-right"><button onClick={() => handleDeleteVisitor('externals', g.timestamp)} className="text-red-600 hover:text-red-800 font-semibold px-3 py-1 rounded-md hover:bg-red-100 transition-colors" aria-label={`${new Date(g.timestamp).toLocaleString('ja-JP')}の外部来場者データを削除`}>削除</button></td></tr>,
        parents: (p) => <tr key={p.timestamp} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-2 text-sm text-gray-500">{new Date(p.timestamp).toLocaleString('ja-JP')}</td><td className="p-2 text-gray-800">{p.count}名</td><td className="p-2 text-gray-800">{p.shogiStrength}</td><td className="p-2 text-gray-800">{p.sonInClub ? 'はい' : 'いいえ'}</td><td className="p-2 text-right"><button onClick={() => handleDeleteVisitor('parents', p.timestamp)} className="text-red-600 hover:text-red-800 font-semibold px-3 py-1 rounded-md hover:bg-red-100 transition-colors" aria-label={`${new Date(p.timestamp).toLocaleString('ja-JP')}の保護者データを削除`}>削除</button></td></tr>,
        alumni: (a) => <tr key={a.timestamp} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-2 text-sm text-gray-500">{new Date(a.timestamp).toLocaleString('ja-JP')}</td><td className="p-2 text-gray-800">{a.count}名</td><td className="p-2 text-gray-800">{a.shogiStrength}</td><td className="p-2 text-gray-800">{a.wasInClub ? 'はい' : 'いいえ'}</td><td className="p-2 text-right"><button onClick={() => handleDeleteVisitor('alumni', a.timestamp)} className="text-red-600 hover:text-red-800 font-semibold px-3 py-1 rounded-md hover:bg-red-100 transition-colors" aria-label={`${new Date(a.timestamp).toLocaleString('ja-JP')}のOBデータを削除`}>削除</button></td></tr>,
        teachers: (t) => <tr key={t.timestamp} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-2 text-sm text-gray-500">{new Date(t.timestamp).toLocaleString('ja-JP')}</td><td className="p-2 text-right"><button onClick={() => handleDeleteVisitor('teachers', t.timestamp)} className="text-red-600 hover:text-red-800 font-semibold px-3 py-1 rounded-md hover:bg-red-100 transition-colors" aria-label={`${new Date(t.timestamp).toLocaleString('ja-JP')}の教職員データを削除`}>削除</button></td></tr>,
    };

    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 p-4">
        <button onClick={() => setAdminSubView('menu')} className="fixed top-4 left-4 text-gray-700 hover:text-gray-900 z-10 bg-white border border-gray-300 rounded-full px-5 py-3 text-xl hover:bg-gray-100 transition-all transform active:scale-95" aria-label="管理者メニューに戻る">&larr; 管理者メニューに戻る</button>
        <div className="max-w-6xl mx-auto pt-20">
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg">
            <h3 className="text-3xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">{listTitle}</h3>
            <div className="max-h-[75vh] overflow-y-auto">
              {currentData.length === 0 ? <p className="text-center text-gray-500 py-4 text-xl">来場者はいません。</p> : <table className="w-full text-left text-xl"><thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-200"><tr className="text-gray-600">{headers[adminSubView]}</tr></thead><tbody>{currentData.slice().reverse().map(rowRenderers[adminSubView])}</tbody></table>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4">
      <button onClick={onBack} className="fixed top-4 left-4 text-gray-700 hover:text-gray-900 z-10 bg-white border border-gray-300 rounded-full px-5 py-3 text-xl hover:bg-gray-100 transition-all transform active:scale-95">&larr; 戻る</button>
      <div className="max-w-4xl mx-auto pt-16 pb-8">
        <h2 className="text-5xl font-bold mb-8 text-gray-900 text-center">管理者画面</h2>
        <section className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="summary-title">
          <h3 id="summary-title" className="text-3xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">来場者サマリー</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div><p className="text-2xl text-gray-500">合計</p><p className="text-5xl font-bold text-gray-900">{totalVisitors}</p></div>
            <div><p className="text-2xl text-gray-500">在校生</p><p className="text-5xl font-bold text-gray-900">{studentVisitors.length}</p></div>
            <div><p className="text-2xl text-gray-500">外部・他</p><p className="text-5xl font-bold text-gray-900">{externalCount + parentCount + alumniCount}</p></div>
            <div><p className="text-2xl text-gray-500">教職員</p><p className="text-5xl font-bold text-gray-900">{teacherCount}</p></div>
          </div>
        </section>
        <section className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg mb-8" aria-labelledby="data-view-title">
          <h3 id="data-view-title" className="text-3xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ閲覧</h3>
          <p className="text-xl text-gray-600 mb-6">表示したい項目を選択してください。</p>
          <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
            <button onClick={() => setAdminSubView('students')} className="text-3xl font-semibold py-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">在校生</button>
            <button onClick={() => setAdminSubView('parents')} className="text-3xl font-semibold py-8 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">保護者</button>
            <button onClick={() => setAdminSubView('alumni')} className="text-3xl font-semibold py-8 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">OB</button>
            <button onClick={() => setAdminSubView('externals')} className="text-3xl font-semibold py-8 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">外部</button>
            <button onClick={() => setAdminSubView('teachers')} className="text-3xl font-semibold py-8 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">教職員</button>
          </div>
        </section>
        <section className="bg-white border border-gray-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="data-manage-title">
            <h3 id="data-manage-title" className="text-3xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">データ管理</h3>
            <p className="text-xl text-gray-600 mb-4">全データを複数のCSVファイルにまとめ、ZIP形式で一括ダウンロードします。</p>
            <button onClick={handleBatchCsvBackup} className="w-full text-2xl font-semibold py-5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">
                全データをCSVで一括バックアップ
            </button>
        </section>
        <section className="bg-white border border-gray-200 p-6 rounded-lg shadow-lg mb-8" aria-labelledby="message-edit-title">
            <h3 id="message-edit-title" className="text-3xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">完了メッセージの編集</h3>
            <div className="space-y-6">
                {Object.keys(editedMessages).map(key => (
                    <div key={key}>
                        <label htmlFor={`${key}Message`} className="block text-xl font-medium text-gray-700 mb-2 capitalize">{key}</label>
                        <textarea id={`${key}Message`} rows={5} className="w-full p-3 bg-gray-100 border border-gray-300 rounded-md text-gray-900 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={editedMessages[key]} onChange={(e) => setEditedMessages(prev => ({ ...prev, [key]: e.target.value }))} />
                    </div>
                ))}
                <button onClick={handleSaveMessages} className="w-full text-2xl font-semibold py-4 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">
                    メッセージを保存
                </button>
            </div>
        </section>
        <section className="bg-red-50 border border-red-200 p-6 rounded-lg mb-8 shadow-lg" aria-labelledby="danger-zone-title">
          <h3 id="danger-zone-title" className="text-3xl font-semibold text-red-800 mb-4 border-b border-red-200 pb-2">危険ゾーン</h3>
          <p className="text-xl text-red-600 mb-4">この操作は元に戻せません。すべての来場者データが削除されます。</p>
          <button onClick={onNavigateToReset} className="w-full md:w-auto text-2xl font-semibold py-4 px-8 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">全データをリセット</button>
        </section>
      </div>
    </div>
  );
};

const MainScreen: React.FC<{ onSelect: (selection: 'student' | 'external' | 'parent' | 'ob' | 'teacher') => void; onAdminAccess: () => void; }> = ({ onSelect, onAdminAccess }) => {
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const handlePressStart = () => { setLongPressTimer(window.setTimeout(() => onAdminAccess(), 2000)); };
  const handlePressEnd = () => { if (longPressTimer) clearTimeout(longPressTimer); };

  const iconProps = { className: "h-16 w-16 mb-4", strokeWidth: 1.5 };
  const StudentIcon = () => <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
  const ExternalIcon = () => <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM3 13.249a9.087 9.087 0 019 0responsive" /></svg>;
  const ParentIcon = () => <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
  const AlumniIcon = () => <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-.07.002z" /></svg>;
  const TeacherIcon = () => <svg {...iconProps} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07a2.25 2.25 0 01-2.25 2.25h-13.5a2.25 2.25 0 01-2.25-2.25v-4.07m18 0a2.25 2.25 0 00-2.25-2.25h-13.5a2.25 2.25 0 00-2.25 2.25m18 0v-4.879a2.25 2.25 0 00-.916-1.788l-2.258-1.41a2.25 2.25 0 01-1.788-.916V4.5a2.25 2.25 0 00-2.25-2.25h-5.25a2.25 2.25 0 00-2.25 2.25v1.076c0 .493-.16.973-.448 1.382l-2.022 2.923a2.25 2.25 0 00-.916 1.788v4.879" /></svg>;
  const buttonBaseStyle = "flex flex-col items-center justify-center font-semibold rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg border text-white";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-5xl font-bold mb-8 text-amber-200 select-none cursor-pointer text-center" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} aria-label="タイトル。2秒間長押しで管理者ログイン">
        2025年度 巣園祭 将棋サロン<br />
        <span className="inline-block mt-4 bg-amber-300 text-stone-900 px-8 py-2 rounded-lg text-7xl tracking-widest shadow-md">受付</span>
      </h1>
      <p className="text-3xl text-stone-200 mb-12">該当するボタンを押してください</p>
      <div className="w-full max-w-5xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button onClick={() => onSelect('student')} className={`${buttonBaseStyle} text-4xl py-16 px-4 bg-blue-800 border-blue-600 hover:bg-blue-700`}><StudentIcon />在校生の方</button>
          <button onClick={() => onSelect('external')} className={`${buttonBaseStyle} text-4xl py-16 px-4 bg-stone-700 border-stone-500 hover:bg-stone-600`}><ExternalIcon />外部の方</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <button onClick={() => onSelect('parent')} className={`${buttonBaseStyle} text-3xl py-10 px-4 bg-green-800 border-green-600 hover:bg-green-700`}><ParentIcon />在校生保護者の方</button>
          <button onClick={() => onSelect('ob')} className={`${buttonBaseStyle} text-3xl py-10 px-4 bg-purple-800 border-purple-600 hover:bg-purple-700`}><AlumniIcon />巣鴨学園OBの方</button>
          <button onClick={() => onSelect('teacher')} className={`${buttonBaseStyle} text-3xl py-10 px-4 bg-orange-800 border-orange-600 hover:bg-orange-700`}><TeacherIcon />本校教職員の方</button>
        </div>
      </div>
    </div>
  );
};

const StudentForm: React.FC<{ onBack: () => void; }> = ({ onBack }) => {
  const { handleStudentSubmit, setNotification } = useVisitorContext();
  type StudentInput = Omit<Student, 'timestamp' | 'shogiStrength'>;
  
  const [step, setStep] = useState<'count' | 'input' | 'strength' | 'confirm'>('count');
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentsData, setStudentsData] = useState<StudentInput[]>([]);
  const [grade, setGrade] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [shogiStrength, setShogiStrength] = useState('特にない');
  const [strengthCategory, setStrengthCategory] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const resetCurrentStudentForm = () => { setGrade(''); setStudentClass(''); setStudentId(''); };
  
  const loadStudentData = (index: number) => {
    const data = studentsData[index];
    if(data) { setGrade(data.grade); setStudentClass(data.class); setStudentId(data.studentId); } 
    else { resetCurrentStudentForm(); }
  };

  const handleCountSelect = (count: number) => {
    setTotalStudents(count);
    if (studentsData.length !== count) {
      setStudentsData(Array.from({ length: count }, (_, i) => studentsData[i] || { grade: '', class: '', studentId: '' }));
    }
    setStep('input');
    setCurrentIndex(0);
    loadStudentData(0);
  };

  const saveCurrentStudent = () => {
    const updatedStudents = [...studentsData];
    updatedStudents[currentIndex] = { grade, class: studentClass, studentId };
    setStudentsData(updatedStudents);
  };

  const handleNext = () => {
    if (!grade) { setNotification({ message: '学年を選択してください。', type: 'error' }); return; }
    if (!studentClass) { setNotification({ message: 'クラスを選択してください。', type: 'error' }); return; }
    if (!studentId || studentId.length === 0 || studentId.length > 2) { setNotification({ message: '出席番号を1桁または2桁で入力してください。', type: 'error' }); return; }
    saveCurrentStudent();
    if (isEditing) { setIsEditing(false); setStep('confirm'); return; }
    if (currentIndex < totalStudents - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      loadStudentData(nextIndex);
    } else { setStep('strength'); }
  };
  
  const handleBack = () => {
    saveCurrentStudent();
    if (isEditing) { setIsEditing(false); setStep('confirm'); return; }
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      loadStudentData(prevIndex);
    } else { setStep('count'); }
  };

  const handleEdit = (indexToEdit: number) => {
    saveCurrentStudent();
    setIsEditing(true);
    setCurrentIndex(indexToEdit);
    loadStudentData(indexToEdit);
    setStep('input');
  };

  const handleFinalSubmit = () => {
    if (!hasAgreed) { setNotification({ message: '個人情報の取り扱いに同意してください。', type: 'error' }); return; }
    setIsLoading(true);
    setTimeout(() => {
      const finalStudents = studentsData.map(s => ({ ...s, shogiStrength }));
      handleStudentSubmit(finalStudents);
    }, 500);
  };
  
  if (step === 'count') {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
            <BackButton onClick={onBack} label="メイン画面に戻る" />
            <h2 className="text-6xl font-bold mb-6 text-amber-200">在校生 受付</h2>
            <p className="text-3xl text-stone-200 mb-16 text-center">全部で何名様でいらっしゃいましたか？</p>
            <div className="w-full max-w-2xl grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleCountSelect(num)} className="text-6xl font-semibold py-20 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg" aria-label={`${num}名`}>{num}名</button>))}
                 <div className="flex items-center justify-center text-3xl text-stone-200 text-center">6名様以上の場合は、5名以下のグループに分かれて受付をお願いします。</div>
            </div>
        </div>
    );
  }
  
    if (step === 'strength') {
        const rankButtonClass = (rank: string) => `p-4 text-xl rounded-md transition-all duration-200 ${shogiStrength === rank ? 'bg-amber-400 text-stone-900 font-bold shadow-md' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white'}`;

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
                <BackButton onClick={() => {
                    if (strengthCategory) {
                        setStrengthCategory(null);
                        setShogiStrength('特にない');
                    } else {
                        saveCurrentStudent();
                        setStep('input');
                    }
                }} />
                <h2 className="text-6xl font-bold mb-6 text-amber-200">代表者の棋力</h2>
                
                {!strengthCategory ? (
                    <>
                        <p className="text-3xl text-stone-200 mb-16 text-center">グループの中で最も棋力が高い方の<br/>大まかな棋力を選択してください。</p>
                        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
                            {SHOGI_STRENGTH_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => {
                                    if (cat === '特にない') {
                                        setShogiStrength('特にない');
                                        setStep('confirm');
                                    } else {
                                        setStrengthCategory(cat);
                                        setShogiStrength('');
                                    }
                                }} className="text-4xl font-semibold py-16 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-3xl text-stone-200 mb-10 text-center">具体的な棋力を選択してください。</p>
                        <div className={`w-full max-w-4xl grid gap-4 ${strengthCategory === '級位者' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
                            {(strengthCategory === '級位者' ? KYU_RANKS : DAN_RANKS).map(rank => (
                                <button key={rank} onClick={() => setShogiStrength(rank)} className={rankButtonClass(rank)}>
                                    {rank}
                                </button>
                            ))}
                        </div>
                    </>
                )}
                
                <div className="w-full max-w-md mt-12">
                    <button onClick={() => setStep('confirm')} disabled={!shogiStrength} className="w-full text-5xl font-semibold py-8 px-4 bg-stone-700 border border-stone-500 hover:bg-stone-600 rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed">
                        確認画面へ
                    </button>
                </div>
            </div>
        );
    }
  
  if (step === 'confirm') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
        <BackButton onClick={() => setStep('strength')} label="入力画面に戻る" />
        <h2 className="text-6xl font-bold mb-8 text-amber-200">入力内容の確認</h2>
        <div className="w-full max-w-2xl bg-stone-900 border border-stone-700 p-6 rounded-lg space-y-1 text-3xl mb-8">
            {studentsData.map((s, i) => (
                <div key={i} className="flex justify-between items-center border-b border-stone-700 py-3">
                    <span>{i + 1}人目: {s.grade} {s.class}組 {s.studentId}番</span>
                    <button onClick={() => handleEdit(i)} className="text-xl bg-stone-700 hover:bg-stone-600 px-4 py-2 rounded-lg transition-all transform active:scale-95">編集</button>
                </div>
            ))}
             <div className="pt-3"><strong className="text-white">代表者の棋力:</strong> {shogiStrength}</div>
        </div>
        <div className="w-full max-w-2xl p-6 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 space-y-4 mb-8">
          <h3 className="text-3xl font-semibold text-white text-center">個人情報の取り扱いについて</h3>
          <p className="text-xl leading-relaxed text-stone-200">ご記入いただいた個人情報（クラス・番号）は、文化祭で何か問題が発生した場合のご連絡にのみ利用させていただきます。</p>
          <label className="flex items-center justify-center space-x-4 cursor-pointer pt-3">
            <input type="checkbox" id="privacy-agreement-confirm" checked={hasAgreed} onChange={(e) => setHasAgreed(e.target.checked)} className="h-8 w-8 rounded bg-stone-700 border-stone-500 text-blue-600 focus:ring-blue-500"/>
            <span id="privacy-policy-text-confirm" className="text-stone-100 text-2xl">上記の利用目的に同意します。</span>
          </label>
        </div>
        <button onClick={handleFinalSubmit} disabled={isLoading || !hasAgreed} className="w-full max-w-2xl text-5xl font-semibold py-8 px-4 bg-blue-800 border border-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-stone-800 disabled:cursor-not-allowed disabled:text-stone-500">
          {isLoading ? <LoadingSpinner /> : '同意して送信'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
        <BackButton onClick={handleBack} />
        <h2 className="text-6xl font-bold mb-4 text-amber-200">在校生 受付</h2>
        <p className="text-4xl text-stone-200 mb-8">{currentIndex + 1}人目 / {totalStudents}人</p>
        <div className="w-full max-w-md space-y-6">
            <div>
                <label className="block text-2xl mb-2 text-white">学年</label>
                <div className="grid grid-cols-3 gap-2">{GRADES.map(g => <button type="button" key={g} onClick={() => setGrade(g)} className={`p-4 text-xl rounded-md transition-all duration-200 ${grade === g ? 'bg-amber-400 text-stone-900 font-bold shadow-md' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white'}`}>{g}</button>)}</div>
            </div>
            <div>
                <label className="block text-2xl mb-2 text-white">クラス</label>
                <div className="grid grid-cols-4 gap-2">{CLASSES.map(c => <button type="button" key={c} onClick={() => setStudentClass(c)} className={`p-4 text-xl rounded-md transition-all duration-200 ${studentClass === c ? 'bg-amber-400 text-stone-900 font-bold shadow-md' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white'}`}>{c}</button>)}</div>
            </div>
            <div>
                <label id="student-id-label" className="block text-2xl mb-2 text-white">出席番号</label>
                <div role="status" aria-labelledby="student-id-label" className="w-full p-3 bg-stone-900 border border-stone-700 rounded-md text-center text-5xl h-20 flex items-center justify-center mb-2">{studentId || <span className="text-stone-500">番号</span>}</div>
                <NumericKeypad value={studentId} onValueChange={setStudentId} />
            </div>
        </div>
        <div className="w-full max-w-md mt-8">
            <button onClick={handleNext} className="w-full text-4xl font-semibold py-6 px-4 bg-blue-800 border border-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center">
                 {isEditing ? '編集を完了' : (currentIndex < totalStudents - 1 ? '次の人へ' : '入力完了')}
            </button>
        </div>
    </div>
  );
};

const GroupForm: React.FC<{ title: string; onBack: () => void; onSubmit: (data: any) => void; extraStep?: { question: string; onSelect: (value: boolean) => void; } }> = ({ title, onBack, onSubmit, extraStep }) => {
    const { setNotification } = useVisitorContext();
    const [count, setCount] = useState<number | null>(null);
    const [customCount, setCustomCount] = useState('');
    const [shogiStrength, setShogiStrength] = useState('特にない');
    const [strengthCategory, setStrengthCategory] = useState<string | null>(null);
    const [extraAnswer, setExtraAnswer] = useState<boolean | null>(null);
    const [step, setStep] = useState<'count' | 'custom' | 'extra' | 'strength'>('count');
    const [isLoading, setIsLoading] = useState(false);
    const buttonClass = "text-6xl font-semibold py-20 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg";

    const handleCountSelect = (num: number) => {
        setCount(num);
        if (extraStep) { setStep('extra'); } else { setStep('strength'); }
    };
    
    const handleExtraSelect = (val: boolean) => {
        if (extraStep) extraStep.onSelect(val);
        setExtraAnswer(val);
        setStep('strength');
    };

    const handleCustomSubmit = () => {
        const num = parseInt(customCount, 10);
        if (num > 0) handleCountSelect(num);
        else setNotification({ message: '人数を正しく入力してください。', type: 'error' });
    };
    
    const getBackFunction = () => {
        switch (step) {
            case 'strength':
                if (strengthCategory) {
                    return () => {
                        setStrengthCategory(null);
                        setShogiStrength('特にない');
                    }
                }
                return () => setStep(extraStep ? 'extra' : 'count');
            case 'extra': return () => setStep('count');
            case 'custom': return () => setStep('count');
            default: return onBack;
        }
    };

    const handleFinalSubmit = (strengthOverride?: string) => {
        const finalStrength = strengthOverride || shogiStrength;
        if (count && finalStrength && (extraAnswer !== null || !extraStep)) {
            setIsLoading(true);
            setTimeout(() => {
                onSubmit({ count, shogiStrength: finalStrength, extraAnswer });
            }, 500);
        }
    };

    if (step === 'strength' && count !== null) {
        const rankButtonClass = (rank: string) => `p-4 text-xl rounded-md transition-all duration-200 ${shogiStrength === rank ? 'bg-amber-400 text-stone-900 font-bold shadow-md' : 'bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white'}`;

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
                <BackButton onClick={getBackFunction()} />
                <h2 className="text-6xl font-bold mb-6 text-amber-200">{count}名様ですね</h2>
                
                {!strengthCategory ? (
                    <>
                        <p className="text-3xl text-stone-200 mb-16 text-center">グループの中で最も棋力が高い方の<br/>大まかな棋力を選択してください。</p>
                        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
                            {SHOGI_STRENGTH_CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => {
                                    if (cat === '特にない') {
                                        handleFinalSubmit('特にない');
                                    } else {
                                        setStrengthCategory(cat);
                                        setShogiStrength('');
                                    }
                                }} className="text-4xl font-semibold py-16 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                     <>
                        <p className="text-3xl text-stone-200 mb-10 text-center">具体的な棋力を選択してください。</p>
                        <div className={`w-full max-w-4xl grid gap-4 ${strengthCategory === '級位者' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
                            {(strengthCategory === '級位者' ? KYU_RANKS : DAN_RANKS).map(rank => (
                                <button key={rank} onClick={() => setShogiStrength(rank)} className={rankButtonClass(rank)}>
                                    {rank}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <div className="w-full max-w-md mt-12">
                     <button onClick={() => handleFinalSubmit()} disabled={isLoading || !shogiStrength} className="w-full text-5xl font-semibold py-8 px-4 bg-stone-700 border border-stone-500 hover:bg-stone-600 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg flex items-center justify-center disabled:bg-stone-800 disabled:cursor-not-allowed">
                        {isLoading ? <LoadingSpinner /> : '決定'}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'extra' && extraStep) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
                <BackButton onClick={getBackFunction()} />
                <h2 className="text-6xl font-bold mb-6 text-amber-200">{title}</h2>
                <p className="text-3xl text-stone-200 mb-16 text-center">{extraStep.question}</p>
                <div className="w-full max-w-lg flex gap-8">
                    <button onClick={() => handleExtraSelect(true)} className="flex-1 text-5xl font-semibold py-16 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">はい</button>
                    <button onClick={() => handleExtraSelect(false)} className="flex-1 text-5xl font-semibold py-16 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">いいえ</button>
                </div>
            </div>
        );
    }

    if (step === 'custom') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <BackButton onClick={getBackFunction()} />
                <h2 className="text-6xl font-bold mb-10 text-amber-200">人数の入力</h2>
                <div className="w-full max-w-sm space-y-8">
                    <div role="status" className="w-full p-3 bg-stone-900 border border-stone-700 rounded-md text-center text-6xl h-28 flex items-center justify-center mb-4 text-white">{customCount || <span className="text-stone-500">人数</span>}</div>
                    <NumericKeypad value={customCount} onValueChange={setCustomCount} />
                    <button onClick={handleCustomSubmit} className="w-full text-5xl font-semibold py-8 px-4 bg-stone-700 border border-stone-500 hover:bg-stone-600 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">決定</button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
            <BackButton onClick={onBack} label="メイン画面に戻る" />
            <h2 className="text-6xl font-bold mb-6 text-amber-200">{title}</h2>
            <p className="text-3xl text-stone-200 mb-16 text-center">全部で何名様でいらっしゃいましたか？</p>
            <div className="w-full max-w-2xl grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => handleCountSelect(num)} className={buttonClass} aria-label={`${num}名`}>{num}名</button>))}
                <button onClick={() => setStep('custom')} className={`${buttonClass} bg-stone-800 hover:bg-stone-700 border-stone-600`} aria-label="その他の人数">他</button>
            </div>
        </div>
    );
};

const ConfettiPiece: React.FC = () => {
  const colors = ['#facc15', '#fb923c', '#4ade80', '#60a5fa', '#c084fc', '#f87171', '#34d399', '#f472b6'];
  const animations = ['confetti-fall', 'confetti-sway', 'confetti-sway-reverse', 'confetti-zig-zag', 'confetti-spin-fast'];
  const animationName = animations[Math.floor(Math.random() * animations.length)];
  
  const shapeType = Math.random();
  let shapeStyle = {};
  if (shapeType < 0.4) { // 40% chance for square
    shapeStyle = {
      width: `${Math.random() * 8 + 6}px`,
      height: `${Math.random() * 8 + 6}px`,
    };
  } else if (shapeType < 0.8) { // 40% chance for circle
    shapeStyle = {
      width: `${Math.random() * 10 + 8}px`,
      height: `${Math.random() * 10 + 8}px`,
      borderRadius: '50%',
    };
  } else { // 20% chance for strip
    shapeStyle = {
      width: `${Math.random() * 4 + 3}px`,
      height: `${Math.random() * 10 + 10}px`,
    };
  }

  const style = {
    left: `${Math.random() * 100}vw`,
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    transform: `rotate(${Math.random() * 360}deg)`,
    animationName: animationName,
    animationDuration: `${Math.random() * 4 + 5}s`,
    animationDelay: `${Math.random() * 7}s`,
    animationTimingFunction: 'linear',
    animationFillMode: 'forwards',
    ...shapeStyle
  };
  return <div className="absolute top-[-20px]" style={style} />;
};

const CompletionScreen: React.FC<{ onFinish: () => void; visitorType: VisitorType; }> = ({ onFinish, visitorType }) => {
  const { customMessages } = useVisitorContext();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) { onFinish(); return; }
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, onFinish]);

  const message = (visitorType && customMessages[visitorType]) ? customMessages[visitorType] : "将棋部の展示をお楽しみください！";
  const confettiPieces = React.useMemo(() => Array.from({ length: 150 }).map((_, i) => <ConfettiPiece key={i} />), []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden" role="alert">
      {confettiPieces}
      <div className="relative z-10 text-center flex flex-col items-center w-full bg-stone-900 p-8 sm:p-12 rounded-2xl border border-stone-700">
        <h2 className="text-8xl font-bold text-amber-200 text-center">受付完了</h2>
        <p className="w-full max-w-4xl text-4xl mt-12 text-stone-100 leading-relaxed whitespace-pre-line text-left">{message}</p>
        <div className="mt-16 w-full max-w-md">
          <button onClick={onFinish} className="w-full text-4xl font-semibold py-8 px-4 bg-stone-800 border border-stone-600 hover:bg-stone-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg mb-4">TOPに戻る</button>
          <p className="text-2xl text-stone-300 text-center" aria-live="polite">あと {countdown} 秒で自動でTOP画面に戻ります。</p>
        </div>
      </div>
    </div>
  );
};

const ResetConfirmationView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [password, setPassword] = useState('');
    const { handleConfirmReset } = useVisitorContext();
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleConfirmReset(password); };
  
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4 text-center">
          <div className="bg-white border-2 border-red-300 rounded-2xl p-8 shadow-2xl max-w-lg w-full">
              <h2 className="text-5xl font-bold mb-4 text-red-700">最終確認</h2>
              <p className="text-2xl mb-8 text-red-600">この操作は部長に許可された場合にのみ有効です。</p>
              <form onSubmit={handleSubmit} className="w-full space-y-6">
                  <label htmlFor="reset-password" className="sr-only">専用パスワード</label>
                  <input id="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-white border border-red-300 rounded-md text-center text-2xl text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none" placeholder="専用パスワード" autoFocus aria-required="true"/>
                  <button type="submit" className="w-full text-3xl font-semibold py-5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg">実行</button>
              </form>
          </div>
          <button onClick={onBack} className="mt-12 text-4xl font-semibold py-5 px-10 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-xl transition-all duration-300 transform active:scale-95 shadow-lg">&larr; 管理者画面に戻る</button>
      </div>
    );
};

const AppContent: React.FC = () => {
    const [view, setView] = useState<View>('main');
    const [lastVisitorType, setLastVisitorType] = useState<VisitorType>(null);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const { handleTeacherSubmit } = useVisitorContext();

    const handleSelect = useCallback((selection: 'student' | 'external' | 'parent' | 'ob' | 'teacher') => {
        if (selection === 'teacher') { handleTeacherSubmit(); } 
        else { setView(selection); }
    }, [handleTeacherSubmit]);

    const handleReturnToMain = useCallback(() => setView('main'), []);
    const handleNavigateToReset = useCallback(() => setView('resetConfirmation'), []);
    const handleAdminAccess = useCallback(() => setView('adminLogin'), []);

    const renderView = () => {
        switch (view) {
            case 'student': return <StudentForm onBack={handleReturnToMain} />;
            case 'external': return <GroupForm title="ようこそ！" onSubmit={useVisitorContext().handleExternalSubmit} onBack={handleReturnToMain} />;
            case 'parent': return <GroupForm title="保護者の方" onSubmit={useVisitorContext().handleParentSubmit} onBack={handleReturnToMain} extraStep={{ question: 'ご子息は将棋部員ですか？', onSelect: () => {} }} />;
            case 'ob': return <GroupForm title="OBの方" onSubmit={useVisitorContext().handleAlumniSubmit} onBack={handleReturnToMain} extraStep={{ question: '在校時、囲碁将棋部に所属していましたか？', onSelect: () => {} }} />;
            case 'thanks': return <CompletionScreen onFinish={handleReturnToMain} visitorType={lastVisitorType} />;
            case 'adminLogin': return <AdminLogin onBack={handleReturnToMain} />;
            case 'resetConfirmation': return <ResetConfirmationView onBack={() => setView('admin')} />;
            case 'admin': return isAdminAuthenticated ? <AdminView onBack={handleReturnToMain} onNavigateToReset={handleNavigateToReset} /> : <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
            default: return <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
        }
    };
    
    return (
        <>
          <Notification />
          <div key={view} className="view-container">
            {renderView()}
          </div>
        </>
    );
}

const App: React.FC = () => {
  const [viewState, setViewState] = useState<{view: View, lastVisitorType: VisitorType, isAdminAuthenticated: boolean}>({
    view: 'main',
    lastVisitorType: null,
    isAdminAuthenticated: false,
  });

  return (
    <VisitorProvider
      // FIX: Handle updater function form for state setters.
      // The props `setView`, `setLastVisitorType`, and `setIsAdminAuthenticated` are of type `React.Dispatch<React.SetStateAction<...>>`.
      // This means they can receive a value OR a function to update the state. The original implementation didn't handle the function case,
      // leading to a type error. The fix checks if the received action is a function and executes it with the previous state value if so.
      setView={useCallback((view: React.SetStateAction<View>) => {
        setViewState(s => ({ ...s, view: typeof view === 'function' ? view(s.view) : view }));
      }, [])}
      setLastVisitorType={useCallback((lastVisitorType: React.SetStateAction<VisitorType>) => {
        setViewState(s => ({ ...s, lastVisitorType: typeof lastVisitorType === 'function' ? lastVisitorType(s.lastVisitorType) : lastVisitorType }));
      }, [])}
      setIsAdminAuthenticated={useCallback((isAdminAuthenticated: React.SetStateAction<boolean>) => {
        setViewState(s => ({ ...s, isAdminAuthenticated: typeof isAdminAuthenticated === 'function' ? isAdminAuthenticated(s.isAdminAuthenticated) : isAdminAuthenticated }));
      }, [])}
    >
        <AppContentWrapper viewState={viewState} setViewState={setViewState} />
    </VisitorProvider>
  );
};

const AppContentWrapper: React.FC<{
  viewState: {view: View, lastVisitorType: VisitorType, isAdminAuthenticated: boolean};
  setViewState: React.Dispatch<React.SetStateAction<{view: View, lastVisitorType: VisitorType, isAdminAuthenticated: boolean}>>;
}> = ({ viewState, setViewState }) => {
    const { view, lastVisitorType, isAdminAuthenticated } = viewState;
    const { handleTeacherSubmit, handleExternalSubmit, handleParentSubmit, handleAlumniSubmit } = useVisitorContext();

    const handleSelect = useCallback((selection: 'student' | 'external' | 'parent' | 'ob' | 'teacher') => {
        if (selection === 'teacher') {
            handleTeacherSubmit();
        } else {
            setViewState(s => ({ ...s, view: selection }));
        }
    }, [handleTeacherSubmit, setViewState]);

    const handleReturnToMain = useCallback(() => setViewState(s => ({...s, view: 'main'})), [setViewState]);
    const handleNavigateToReset = useCallback(() => setViewState(s => ({...s, view: 'resetConfirmation'})), [setViewState]);
    const handleAdminAccess = useCallback(() => setViewState(s => ({...s, view: 'adminLogin'})), [setViewState]);

    const renderView = () => {
        switch (view) {
            case 'student': return <StudentForm onBack={handleReturnToMain} />;
            case 'external': return <GroupForm title="ようこそ！" onSubmit={handleExternalSubmit} onBack={handleReturnToMain} />;
            case 'parent': return <GroupForm title="保護者の方" onSubmit={handleParentSubmit} onBack={handleReturnToMain} extraStep={{ question: 'ご子息は将棋部員ですか？', onSelect: () => {} }} />;
            case 'ob': return <GroupForm title="OBの方" onSubmit={handleAlumniSubmit} onBack={handleReturnToMain} extraStep={{ question: '在校時、囲碁将棋部に所属していましたか？', onSelect: () => {} }} />;
            case 'thanks': return <CompletionScreen onFinish={handleReturnToMain} visitorType={lastVisitorType} />;
            case 'adminLogin': return <AdminLogin onBack={handleReturnToMain} />;
            case 'resetConfirmation': return <ResetConfirmationView onBack={() => setViewState(s => ({...s, view: 'admin'}))} />;
            case 'admin': return isAdminAuthenticated ? <AdminView onBack={handleReturnToMain} onNavigateToReset={handleNavigateToReset} /> : <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
            default: return <MainScreen onSelect={handleSelect} onAdminAccess={handleAdminAccess} />;
        }
    };
    
    return (
      <>
        <Notification />
        <div key={view} className="view-container">
          {renderView()}
        </div>
      </>
    );
};

export default App;