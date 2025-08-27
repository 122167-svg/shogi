
import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase'; // Centralized Firebase v8 compat instance
import type { DataSnapshot } from 'firebase/database'; // Using v9 type for snapshot
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

  // Realtime Database listeners using Firebase v8 compat API
  useEffect(() => {
    const studentsRef = db.ref('students');
    const externalRef = db.ref('external_visitors');
    const membersRef = db.ref('status/members');
    const logsRef = db.ref('logs');

    const onStudentsValue = (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const studentList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setStudents(studentList);
    };
    const onExternalValue = (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const externalList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      