
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const UrgencyMeter: React.FC<{ score: number }> = ({ score }) => {
  const data = [
    { value: score },
    { value: 10 - score }
  ];
  
  const getColor = (s: number) => {
    if (s <= 3) return '#10b981'; // green
    if (s <= 6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative h-40 w-40 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            startAngle={180}
            endAngle={0}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Urgency</span>
      </div>
    </div>
  );
};

export const SentimentBar: React.FC<{ sentiment: string }> = ({ sentiment }) => {
  const sentiments = ['Calm', 'Neutral', 'Concerned', 'Distressed'];
  const data = sentiments.map(s => ({
    name: s,
    value: s === sentiment ? 100 : 20,
    active: s === sentiment
  }));

  return (
    <div className="h-48 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip cursor={{fill: 'transparent'}} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.active ? '#3b82f6' : '#cbd5e1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
