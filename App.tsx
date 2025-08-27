
import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase'; // Centralized Firebase instance
import { ref, onValue, push, set, remove } from 'firebase/database';
import CounterDisplay from './components/CounterDisplay';
import ControlButton from './components/ControlButton';
import PlusIcon from './components/icons/PlusIcon';
import MinusIcon from './components/icons/MinusIcon';
import ResetIcon from './components/icons/ResetIcon';
import Guidance from './components/Guidance';

declare const JSZip: any;

// ========== データ型定義 ==========
type View = 'main' | 'student' | 'member' | 'thanks' | 'admin' | 'external' | 'adminLogin' | 'resetConfirmation';

interface Student {
  id?: string;
  grade: string;
  class: string;
  studentId: string;
  shogiStrength: string;
  timestamp: string;
  status: string;
}
interface ExternalVisitorGroup {
  id?: string;
  count: number;
  shogiStrength: string;
  timestamp: string;
  status: string;
}
interface MemberStatus {
  [key: string]: {
    checkedIn: boolean;
    lastChanged: string;
  };
}
interface LogEntry {
  id?: string;
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
  { name: '下村 篤生', furigana: 'しもむらあつお' },
];

const SHOGI_STRENGTHS = [
  'プロ・アマ高段', '有段者', '級位者', '初心者', '観る専門', 'わからない'
];

const App: React.FC = () => {
  // Simple routing based on URL
  if (window.location.pathname.includes('guidance.html')) {
    return <Guidance />;
  }
  
  const [view, setView] = useState<View>('main');
  const [students, setStudents] = useState<Student[]>([]);
  const [externalVisitors, setExternalVisitors] = useState<ExternalVisitorGroup[]>([]);
  const [memberStatus, setMemberStatus] = useState<MemberStatus>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [password, setPassword] = useState('');
  const [externalCount, setExternalCount] = useState(1);
  const [externalShogiStrength, setExternalShogiStrength] = useState(SHOGI_STRENGTHS[2]);

  // Realtime Database listeners using Firebase v9 modular API
  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsubscribeStudents = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      const studentList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setStudents(studentList);
    });

    const externalRef = ref(db, 'external_visitors');
    const unsubscribeExternal = onValue(externalRef, (snapshot) => {
      const data = snapshot.val();
      const externalList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setExternalVisitors(externalList);
    });
    
    const membersRef = ref(db, 'status/members');
    const unsubscribeMembers = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMemberStatus(data);
      }
    });
    
    const logsRef = ref(db, 'logs');
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      const logList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setLogs(logList);
    });

    // Cleanup function to detach listeners on component unmount
    return () => {
      unsubscribeStudents();
      unsubscribeExternal();
      unsubscribeMembers();
      unsubscribeLogs();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const navigateTo = (newView: View) => {
    setView(newView);
  };
  
  const handleThanks = () => {
    setView('thanks');
    setTimeout(() => setView('main'), 5000);
  };

  const handleStudentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData: Omit<Student, 'timestamp' | 'id' | 'status'> = {
      grade: formData.get('grade') as string,
      class: formData.get('class') as string,
      studentId: formData.get('studentId') as string,
      shogiStrength: formData.get('shogiStrength') as string,
    };
    try {
      await push(ref(db, "students"), { ...studentData, timestamp: new Date().toISOString(), status: 'waiting' });
      handleThanks();
    } catch (error) {
      console.error("Error adding student: ", error);
      showNotification('受付に失敗しました。', 'error');
    }
  };

  const handleExternalSubmit = async () => {
    if (externalCount < 1) {
      showNotification('人数は1人以上を選択してください。', 'error');
      return;
    }
    const groupData = {
      count: externalCount,
      shogiStrength: externalShogiStrength,
    };
    try {
      await push(ref(db, "external_visitors"), { ...groupData, timestamp: new Date().toISOString(), status: 'waiting' });
      setExternalCount(1);
      setExternalShogiStrength(SHOGI_STRENGTHS[2]);
      handleThanks();
    } catch (error) {
      console.error("Error adding external visitors: ", error);
      showNotification('受付に失敗しました。', 'error');
    }
  };

  const handleMemberToggle = async (name: string) => {
    const currentStatus = memberStatus[name]?.checkedIn || false;
    const newStatus = !currentStatus;
    const newTimestamp = new Date().toISOString();
  
    try {
      await set(ref(db, `status/members/${name}`), {
        checkedIn: newStatus,
        lastChanged: newTimestamp,
      });

      await push(ref(db, "logs"), {
        name,
        type: newStatus ? 'in' : 'out',
        timestamp: newTimestamp,
      });
      showNotification(`${name}さんを${newStatus ? '入室' : '退室'}処理しました。`, 'success');
    } catch (error) {
      console.error("Error updating member status: ", error);
      showNotification('更新に失敗しました。', 'error');
    }
  };
  
  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // This is a simple password check. For a real application, use Firebase Auth.
    if (password === 'sugamo_shogi_2025') {
      setView('admin');
      setPassword('');
    } else {
      showNotification('パスワードが違います。', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      await remove(ref(db, 'students'));
      await remove(ref(db, 'external_visitors'));
      await remove(ref(db, 'logs'));
      
      const initialMemberStatus: MemberStatus = {};
      MEMBERS.forEach(member => {
        initialMemberStatus[member.name] = { checkedIn: false, lastChanged: new Date().toISOString() };
      });
      await set(ref(db, "status/members"), initialMemberStatus);
      
      showNotification('すべてのデータがリセットされました。', 'success');
      setView('admin');
    } catch (error) {
      console.error("Error resetting data: ", error);
      showNotification('データのリセットに失敗しました。', 'error');
    }
  };
  
  const totalVisitors = useMemo(() => {
    const studentCount = students.length;
    const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
    return studentCount + externalCount;
  }, [students, externalVisitors]);

  const renderHeader = (title: string, showBackButton = true) => (
    <div className="relative text-center mb-8">
      {showBackButton && (
        <button onClick={() => setView('main')} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-900 transition-colors p-2" aria-label="メイン画面に戻る">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="text-4xl font-bold text-stone-800">{title}</h1>
    </div>
  );

  const renderButton = (onClick: () => void, text: string, className: string) => (
    <button onClick={onClick} className={`w-full text-3xl font-bold py-12 rounded-lg shadow-lg transform transition-transform duration-150 active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-75 ${className}`}>
      {text}
    </button>
  );

  const renderMainView = () => (
    <div className="h-screen flex flex-col justify-center items-center bg-amber-50 p-4">
      <header className="text-center mb-16">
        <h1 className="text-6xl font-extrabold text-stone-800" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)'}}>2025年度 巣園祭</h1>
        <h2 className="text-8xl font-bold text-amber-900 mt-2" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.2)'}}>将棋サロン 受付</h2>
      </header>
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {renderButton(() => navigateTo('student'), '在校生の方', 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-300')}
        {renderButton(() => navigateTo('member'), '部員の方', 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300')}
        {renderButton(() => navigateTo('external'), '外部の方', 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300')}
      </div>
       <button onClick={() => navigateTo('adminLogin')} className="absolute bottom-4 right-4 text-stone-400 hover:text-stone-600 transition-colors p-2" aria-label="管理者ページへ">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
    </div>
  );

  const renderStudentView = () => (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">
      {renderHeader('在校生 受付')}
      <form onSubmit={handleStudentSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required type="text" name="grade" placeholder="学年 (例: 高2)" className="p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"/>
            <input required type="text" name="class" placeholder="クラス (例: A)" className="p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"/>
            <input required type="text" name="studentId" placeholder="出席番号 (例: 99)" className="p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"/>
        </div>
        <div>
            <label className="block text-xl font-semibold text-stone-700 mb-2">将棋の腕前は？</label>
            <select name="shogiStrength" defaultValue={SHOGI_STRENGTHS[2]} className="w-full p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white">
                {SHOGI_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <button type="submit" className="w-full bg-sky-600 text-white text-2xl font-bold py-4 rounded-lg shadow-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-4 focus:ring-sky-300">受付完了</button>
      </form>
    </div>
  );

  const renderMemberView = () => (
    <div className="max-w-4xl mx-auto mt-10 p-8">
      {renderHeader('部員 入退室')}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MEMBERS.map(member => {
          const status = memberStatus[member.name];
          const isCheckedIn = status?.checkedIn || false;
          return (
            <button key={member.name} onClick={() => handleMemberToggle(member.name)} className={`p-4 rounded-lg shadow-md text-center transition-all duration-200 transform hover:scale-105 ${isCheckedIn ? 'bg-rose-500 text-white' : 'bg-white text-stone-800'}`}>
              <p className="text-xs text-stone-500">{member.furigana}</p>
              <p className="text-2xl font-bold">{member.name}</p>
              <p className={`text-lg font-semibold mt-2 ${isCheckedIn ? 'text-rose-100' : 'text-stone-500'}`}>{isCheckedIn ? '在室中' : '退室中'}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderExternalView = () => (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">
      {renderHeader('外部の方 受付')}
      <div className="space-y-8">
        <div>
          <label className="block text-xl font-semibold text-stone-700 mb-2">人数</label>
          <div className="flex items-center justify-center gap-6">
            <ControlButton onClick={() => setExternalCount(c => Math.max(1, c - 1))} aria-label="1人減らす" className="bg-rose-500 text-white hover:bg-rose-600">
              <MinusIcon className="w-12 h-12" />
            </ControlButton>
            <span className="text-8xl font-bold text-stone-800 w-32 text-center">{externalCount}</span>
            <ControlButton onClick={() => setExternalCount(c => c + 1)} aria-label="1人増やす" className="bg-emerald-500 text-white hover:bg-emerald-600">
              <PlusIcon className="w-12 h-12" />
            </ControlButton>
          </div>
        </div>
        <div>
            <label className="block text-xl font-semibold text-stone-700 mb-2">代表の方の将棋の腕前は？</label>
            <select value={externalShogiStrength} onChange={e => setExternalShogiStrength(e.target.value)} className="w-full p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                {SHOGI_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <button onClick={handleExternalSubmit} className="w-full bg-emerald-600 text-white text-2xl font-bold py-4 rounded-lg shadow-md hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-300">受付完了</button>
      </div>
    </div>
  );

  const renderThanksView = () => (
    <div className="h-screen flex flex-col justify-center items-center text-center bg-amber-50">
      <h1 className="text-8xl font-bold text-amber-900 mb-4">ありがとうございました</h1>
      <p className="text-4xl text-stone-700">ごゆっくりお楽しみください</p>
    </div>
  );

  const renderAdminLoginView = () => (
     <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg">
        {renderHeader('管理者ログイン')}
        <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full p-4 text-xl border-2 border-stone-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <button type="submit" className="w-full bg-amber-600 text-white text-xl font-bold py-3 rounded-lg shadow-md hover:bg-amber-700 transition-colors focus:outline-none focus:ring-4 focus:ring-amber-300">ログイン</button>
        </form>
     </div>
  );

  const renderResetConfirmationView = () => (
    <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg text-center">
      <h2 className="text-3xl font-bold text-red-700 mb-4">本当にリセットしますか？</h2>
      <p className="text-stone-600 mb-6">すべての来場者データと部員の入退室記録が削除されます。この操作は取り消せません。</p>
      <div className="flex justify-center gap-4">
        <button onClick={() => setView('admin')} className="px-8 py-3 bg-stone-200 text-stone-800 font-semibold rounded-lg hover:bg-stone-300">キャンセル</button>
        <button onClick={handleResetData} className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">リセット実行</button>
      </div>
    </div>
  );
  
  const renderAdminView = () => (
    <div className="p-6 bg-stone-50 min-h-screen">
      {renderHeader('管理者ダッシュボード', false)}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-stone-700 mb-2">総来場者数</h3>
          <CounterDisplay count={totalVisitors} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
           <h3 className="text-xl font-semibold text-stone-700 mb-2">在校生</h3>
           <p className="text-5xl font-bold text-stone-800">{students.length} <span className="text-2xl">人</span></p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
           <h3 className="text-xl font-semibold text-stone-700 mb-2">外部の方</h3>
           <p className="text-5xl font-bold text-stone-800">{externalVisitors.reduce((sum, group) => sum + group.count, 0)} <span className="text-2xl">人</span></p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-semibold text-stone-700 mb-4">危険な操作</h3>
        <div className="flex gap-4">
           <button onClick={() => setView('resetConfirmation')} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 flex items-center gap-2">
              <ResetIcon className="w-5 h-5"/> 全データリセット
           </button>
           <button onClick={() => setView('main')} className="px-6 py-3 bg-stone-600 text-white font-semibold rounded-lg hover:bg-stone-700">受付画面に戻る</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-stone-700 mb-4">部員ステータス</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MEMBERS.map(m => (
              <div key={m.name} className={`p-2 rounded text-center ${memberStatus[m.name]?.checkedIn ? 'bg-green-100' : 'bg-stone-100'}`}>
                <p className="font-semibold">{m.name}</p>
                <p className={`text-sm font-bold ${memberStatus[m.name]?.checkedIn ? 'text-green-700' : 'text-stone-500'}`}>
                  {memberStatus[m.name]?.checkedIn ? '在室' : '退室'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-stone-700 mb-4">入退室ログ</h3>
          <div className="h-96 overflow-y-auto border rounded p-2 bg-stone-50">
            <ul>
            {[...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(log => (
              <li key={log.id} className="border-b p-2 flex justify-between">
                <span>
                  <span className={`font-semibold ${log.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                    [{log.type === 'in' ? '入室' : '退室'}]
                  </span> {log.name}
                </span>
                <span className="text-sm text-stone-500">{new Date(log.timestamp).toLocaleTimeString('ja-JP')}</span>
              </li>
            ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'main': return renderMainView();
      case 'student': return renderStudentView();
      case 'member': return renderMemberView();
      case 'external': return renderExternalView();
      case 'thanks': return renderThanksView();
      case 'adminLogin': return renderAdminLoginView();
      case 'admin': return renderAdminView();
      case 'resetConfirmation': return renderResetConfirmationView();
      default: return renderMainView();
    }
  };

  return (
    <div className="bg-amber-50 min-h-screen">
      {notification && (
        <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white text-xl z-50 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default App;
