
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Centralized Firebase instance
import { ref, onValue, update } from 'firebase/database';


interface WaitingGuest {
    id: string;
    type: 'student' | 'external';
    description: string;
    shogiStrength: string;
    timestamp: string;
}

interface StudentData {
    id?: string;
    grade: string;
    class: string;
    studentId: string;
    shogiStrength: string;
    timestamp: string;
    status: string;
}

interface ExternalVisitorGroupData {
    id?: string;
    count: number;
    shogiStrength: string;
    timestamp: string;
    status: string;
}


const Guidance: React.FC = () => {
    const [waitingList, setWaitingList] = useState<WaitingGuest[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        const studentsRef = ref(db, 'students');
        const externalRef = ref(db, 'external_visitors');
        
        let students: WaitingGuest[] = [];
        let externals: WaitingGuest[] = [];

        const updateCombinedList = () => {
            const combined = [...students, ...externals];
            combined.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            setWaitingList(combined);
            setLastUpdated(new Date());
        };

        const unsubscribeStudents = onValue(studentsRef, (snapshot) => {
            const data = snapshot.val();
            const studentList: StudentData[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            students = studentList
                .filter(s => s.status === 'waiting')
                .map(s => ({
                    id: s.id!,
                    type: 'student',
                    description: `${s.grade} ${s.class} ${s.studentId}番`,
                    shogiStrength: s.shogiStrength,
                    timestamp: s.timestamp
                }));
            updateCombinedList();
        });

        const unsubscribeExternal = onValue(externalRef, (snapshot) => {
            const data = snapshot.val();
            const externalList: ExternalVisitorGroupData[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
            externals = externalList
                .filter(e => e.status === 'waiting')
                .map(e => ({
                    id: e.id!,
                    type: 'external',
                    description: `${e.count}名様`,
                    shogiStrength: e.shogiStrength,
                    timestamp: e.timestamp
                }));
            updateCombinedList();
        });

        return () => {
            unsubscribeStudents();
            unsubscribeExternal();
        };
    }, []);

    const handleSeatGuest = async (guestId: string, guestType: 'student' | 'external') => {
        const path = guestType === 'student' ? `students/${guestId}` : `external_visitors/${guestId}`;
        try {
            const guestRef = ref(db, path);
            await update(guestRef, { status: 'seated' });
        } catch (error) {
            console.error("Failed to update guest status:", error);
            // In a real app, you might want to show an error notification to the user.
        }
    };

    return (
        <div className="bg-stone-100 min-h-screen p-4 sm:p-8">
            <header className="text-center mb-8">
                <h1 className="text-5xl font-bold text-stone-800">案内係用ダッシュボード</h1>
                <p className="text-stone-600 mt-2">最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}</p>
            </header>
            <main className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-3xl font-semibold text-stone-700 mb-4 border-b-2 pb-2">待機者リスト</h2>
                {waitingList.length === 0 ? (
                    <p className="text-center text-stone-500 py-10 text-xl">現在待機中の方はいません。</p>
                ) : (
                    <ul id="guest-list" className="space-y-4">
                        {waitingList.map((guest, index) => (
                            <li key={guest.id} className="p-4 border rounded-lg flex items-center justify-between transition-all bg-amber-50 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl font-bold text-amber-700 w-12 text-center">{index + 1}</span>
                                    <div>
                                        <p className="text-2xl font-bold text-stone-800">{guest.description}</p>
                                        <p className="text-stone-600">
                                            棋力: {guest.shogiStrength}
                                            <span className="ml-4 text-sm text-stone-400">
                                                受付: {new Date(guest.timestamp).toLocaleTimeString('ja-JP')}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${guest.type === 'student' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {guest.type === 'student' ? '在校生' : '外部'}
                                    </span>
                                    <button
                                        onClick={() => handleSeatGuest(guest.id, guest.type)}
                                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 active:scale-95"
                                        aria-label={`${guest.description}の案内を完了する`}
                                    >
                                        案内完了
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
};

export default Guidance;
