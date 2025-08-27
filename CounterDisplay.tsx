
import React from 'react';

interface CounterDisplayProps {
  count: number;
}

const CounterDisplay: React.FC<CounterDisplayProps> = ({ count }) => {
  return (
    <div className="bg-amber-200/50 border-4 border-amber-600 rounded-md shadow-inner flex flex-col items-center justify-center py-8">
      <p className="text-9xl font-bold text-stone-900 tracking-tighter" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.2)'}}>
        {count}
      </p>
      <p className="text-2xl text-stone-800 font-semibold mt-2">人</p>
    </div>
  );
};

export default CounterDisplay;
