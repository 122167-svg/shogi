import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from './firebase';
import type { DataSnapshot } from 'firebase/database';
import ShogiPiece from './components/ShogiPiece';
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
  { name: '熱田 望', furigana: 'あつたのぞむ' }, { name: '池田 大翔', furigana: 'いけだひろと' }, { name: '岩間 悠希', furigana: 'いわまゆうき' }, { name: '白石 怜大', furigana: 'しらいしれお' }, { name: '高椋 煌生', furigana: 'たかむくこうせい' }, { name: '布施 皓己', furigana: 'ふせこうき' }, { name: '吉井 千智', furigana: 'よしいちさと' }, { name: '秋山 七星', furigana: 'あきやまななせ' }, { name: '大庭 悠誠', furigana: 'おおばゆうせい' }, { name: '熊谷 流星', furigana: 'くまがいりゅうせい' }, { name: '佐藤 勘太', furigana: 'さとうかんた' }, { name: '下田 聖', furigana: 'しもだせい' }, { name: '遅 志丞', furigana: 'ちしじょう' }, { name: '皆川 哲弥', furigana: 'みながわてつや' }, { name: '宮崎 惺也', furigana: 'みやざきせいや' }, { name: '山崎 泰蔵', furigana: 'やまざきたいぞう' }, { name: '片山 幸典', furigana: 'かたやまゆきのり' }, { name: '葛石 知佑', furigana: 'くずいしともひろ' }, { name: '金 悠鉉', furigana: 'きむゆうひょん' }, { name: '小林 慈人', furigana: 'こばやしよしひと' }, { name: '坂内 元気', furigana: 'さかうちげんき' }, { name: '下村 篤生', furigana: 'しもむらあつお' },
];

const SHOGI_STRENGTHS = ['プロ・アマ高段', '有段者', '級位者', '初心者', '観る専門', 'わからない'];

const App: React.FC = () => {
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

  useEffect(() => {
    const refs = [
      db.ref('students'),
      db.ref('external_visitors'),
      db.ref('status/members'),
      db.ref('logs'),
    ];

    const listeners = [
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        setStudents(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      },
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        setExternalVisitors(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      },
      (snapshot: DataSnapshot) => setMemberStatus(snapshot.val() || {}),
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        setLogs(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      },
    ];

    refs.forEach((ref, index) => ref.on('value', listeners[index]));

    return () => {
      refs.forEach(ref => ref.off('value'));
    };
  }, []);
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleStudentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newStudent: Student = {
      grade: formData.get('grade') as string,
      class: formData.get('class') as string,
      studentId: formData.get('studentId') as string,
      shogiStrength: formData.get('shogiStrength') as string,
      timestamp: new Date().toISOString(),
      status: 'waiting',
    };
    try {
      await db.ref('students').push(newStudent);
      setView('thanks');
    } catch (error) {
      console.error(error);
      showNotification('受付に失敗しました。', 'error');
    }
  };

  const handleExternalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newGroup: ExternalVisitorGroup = {
      count: parseInt(formData.get('count') as string, 10),
      shogiStrength: formData.get('shogiStrength') as string,
      timestamp: new Date().toISOString(),
      status: 'waiting',
    };
    try {
      await db.ref('external_visitors').push(newGroup);
      setView('thanks');
    } catch (error) {
      console.error(error);
      showNotification('受付に失敗しました。', 'error');
    }
  };

  const handleMemberToggle = async (name: string) => {
    try {
      const memberRef = db.ref(`status/members/${name}`);
      const snapshot = await memberRef.get();
      const currentStatus = snapshot.val();
      const newStatus = !currentStatus?.checkedIn;

      await memberRef.set({ checkedIn: newStatus, lastChanged: new Date().toISOString() });
      await db.ref('logs').push({ name, type: newStatus ? 'in' : 'out', timestamp: new Date().toISOString() });
      showNotification(`${name}さんを${newStatus ? '受付' : '退出'}しました。`);
    } catch (error) {
      console.error(error);
      showNotification('更新に失敗しました。', 'error');
    }
  };
  
  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password === 'sugamo_shogi') { // Use a more secure password in a real app
      setView('admin');
      setPassword('');
    } else {
      showNotification('パスワードが違います。', 'error');
    }
  };

  const handleResetData = async () => {
    try {
      await db.ref('students').remove();
      await db.ref('external_visitors').remove();
      await db.ref('logs').remove();
      
      const initialStatus: MemberStatus = {};
      MEMBERS.forEach(m => {
        initialStatus[m.name] = { checkedIn: false, lastChanged: new Date().toISOString() };
      });
      await db.ref('status/members').set(initialStatus);

      showNotification('全データをリセットしました。', 'success');
      setView('admin');
    } catch (error) {
      console.error(error);
      showNotification('リセットに失敗しました。', 'error');
    }
  };

  const exportLogsToCSV = () => {
    const zip = new JSZip();
    const sortedLogs = [...logs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let csvContent = "名前,種別,時刻\n";
    sortedLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleString('ja-JP');
      csvContent += `${log.name},${log.type === 'in' ? '入室' : '退室'},${time}\n`;
    });
    zip.file("shogi_salon_logs.csv", csvContent);
    zip.generateAsync({ type: "blob" }).then(content => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "shogi_salon_logs.zip";
      link.click();
    });
  };
  
  const { totalVisitorCount, checkedInMembersCount } = useMemo(() => {
    const studentCount = students.length;
    const externalCount = externalVisitors.reduce((sum, group) => sum + group.count, 0);
    const checkedInMembers = Object.values(memberStatus).filter(status => status.checkedIn).length;
    return {
      totalVisitorCount: studentCount + externalCount,
      checkedInMembersCount: checkedInMembers,
    };
  }, [students, externalVisitors, memberStatus]);


  // ========== レンダリング ==========
  const renderContent = () => {
    switch (view) {
      case 'main': return (
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-stone-800 mb-12">将棋サロン<br/>受付</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => setView('student')} className="main-button bg-sky-600 text-white">在校生の方</button>
            <button onClick={() => setView('external')} className="main-button bg-emerald-600 text-white">外部の方</button>
            <button onClick={() => setView('member')} className="main-button bg-amber-600 text-white">部員の方</button>
          </div>
        </div>
      );
      case 'student': return (
        <form onSubmit={handleStudentSubmit} className="form-container">
          <h2 className="form-title">在校生 受付</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="grade" className="form-label">学年</label>
              <select name="grade" id="grade" required className="form-input">
                {['中1', '中2', '中3', '高1', '高2', '高3'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="class" className="form-label">クラス</label>
                <select name="class" id="class" required className="form-input">
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="studentId" className="form-label">出席番号</label>
                <input type="number" name="studentId" id="studentId" required min="1" max="50" className="form-input"/>
              </div>
            </div>
            <div>
              <label htmlFor="shogiStrength" className="form-label">棋力</label>
              <select name="shogiStrength" id="shogiStrength" required className="form-input">
                {SHOGI_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setView('main')} className="secondary-button">戻る</button>
            <button type="submit" className="primary-button flex-grow">受付完了</button>
          </div>
        </form>
      );
      case 'external': return (
        <form onSubmit={handleExternalSubmit} className="form-container">
          <h2 className="form-title">外部の方 受付</h2>
          <div className="space-y-6">
             <div>
               <label htmlFor="count" className="form-label">人数</label>
                <input type="number" name="count" id="count" defaultValue="1" required min="1" max="20" className="form-input text-center text-2xl p-4"/>
             </div>
            <div>
              <label htmlFor="shogiStrength" className="form-label">棋力 (代表者の方)</label>
              <select name="shogiStrength" id="shogiStrength" required className="form-input">
                {SHOGI_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setView('main')} className="secondary-button">戻る</button>
            <button type="submit" className="primary-button flex-grow">受付完了</button>
          </div>
        </form>
      );
      case 'member': return (
        <div className="form-container">
          <h2 className="form-title">部員 受付・退出</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-4 bg-stone-50 rounded-lg">
            {MEMBERS.map(member => (
              <button key={member.name} onClick={() => handleMemberToggle(member.name)}
                className={`p-4 rounded-lg text-xl font-bold transition-all duration-200 ${memberStatus[member.name]?.checkedIn ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-stone-200 text-stone-800 hover:bg-stone-300'}`}>
                {member.name}
              </button>
            ))}
          </div>
           <button type="button" onClick={() => setView('main')} className="secondary-button w-full mt-8">戻る</button>
        </div>
      );
      case 'thanks': return (
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-stone-800 mb-8">ありがとうございました</h1>
          <p className="text-2xl md:text-3xl text-stone-600 mb-12">ごゆっくりお楽しみください</p>
          <button onClick={() => setView('main')} className="primary-button text-3xl px-12 py-6">トップに戻る</button>
        </div>
      );
      case 'adminLogin': return (
        <form onSubmit={handleAdminLogin} className="form-container max-w-sm">
          <h2 className="form-title">管理者ログイン</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" required className="form-input" />
          <div className="flex gap-4 mt-6">
            <button type="button" onClick={() => setView('main')} className="secondary-button">戻る</button>
            <button type="submit" className="primary-button flex-grow">ログイン</button>
          </div>
        </form>
      );
      case 'admin': return (
        <div className="w-full max-w-7xl mx-auto p-4">
          <h2 className="text-4xl font-bold text-stone-800 text-center mb-8">管理者ダッシュボード</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="admin-card">
              <h3 className="admin-card-title">来場者数</h3>
              <p className="admin-card-data">{totalVisitorCount}</p>
            </div>
            <div className="admin-card">
              <h3 className="admin-card-title">チェックイン中の部員</h3>
              <p className="admin-card-data">{checkedInMembersCount} / {MEMBERS.length}</p>
            </div>
          </div>
          <div className="admin-card mb-8">
            <h3 className="admin-card-title">部員出欠状況</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {MEMBERS.map(member => (
                <div key={member.name} onClick={() => handleMemberToggle(member.name)} className="cursor-pointer">
                  <ShogiPiece name={member.name} isPresent={memberStatus[member.name]?.checkedIn || false} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
             <button onClick={exportLogsToCSV} className="secondary-button">ログをエクスポート</button>
             <button onClick={() => setView('resetConfirmation')} className="danger-button">全データリセット</button>
             <button onClick={() => setView('main')} className="primary-button">トップに戻る</button>
          </div>
        </div>
      );
      case 'resetConfirmation': return (
        <div className="form-container max-w-md text-center">
            <h2 className="form-title text-red-600">最終確認</h2>
            <p className="text-xl text-stone-700 mb-6">本当にすべての受付データとログを消去しますか？<br/>この操作は元に戻せません。</p>
            <div className="flex gap-4">
                <button onClick={() => setView('admin')} className="secondary-button flex-grow">キャンセル</button>
                <button onClick={handleResetData} className="danger-button flex-grow">はい、リセットします</button>
            </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="bg-stone-100 min-h-screen w-full flex items-center justify-center p-4" style={{ fontFamily: "'Sawarabi Mincho', serif" }}>
      {notification && (
        <div className={`notification ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notification.message}
        </div>
      )}
      <div className="absolute top-4 right-4">
        <button onClick={() => setView('adminLogin')} className="bg-transparent text-stone-400 hover:text-stone-600 p-2 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>
      {renderContent()}
    </div>
  );
};

export default App;
