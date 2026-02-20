import React, { useMemo, useState } from 'react';
import { Card, ReviewLog } from '../models/types';
import { deckUtils } from '../utils/deckUtils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { Flame, Target, BarChart3, Calendar, Filter } from 'lucide-react';

interface AnalyticsViewProps {
  cards: Card[];
  logs: ReviewLog[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ cards, logs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(cards.map(c => c.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [cards]);

  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') {
      return { cards, logs };
    }

    const filteredCards = cards.filter(c => c.category === selectedCategory);
    const cardIds = new Set(filteredCards.map(c => c.id));
    const filteredLogs = logs.filter(l => cardIds.has(l.cardId));

    return { cards: filteredCards, logs: filteredLogs };
  }, [cards, logs, selectedCategory]);

  const { cards: activeCards, logs: activeLogs } = filteredData;

  // 1. Retention Data (Last 30 days)
  const retentionData = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    return last30Days.map(day => {
      const dayLogs = activeLogs.filter(log => isSameDay(new Date(log.timestamp), day));
      const correct = dayLogs.filter(log => log.quality >= 3).length;
      const total = dayLogs.length;
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
      
      return {
        date: format(day, 'MMM dd'),
        rate,
        total
      };
    });
  }, [logs]);

  // 2. Heatmap Data (Last 12 weeks)
  const heatmapData = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 83); // 12 weeks * 7 days - 1
    const days = eachDayOfInterval({ start: startDate, end: today });

    return days.map(day => {
      const count = activeLogs.filter(log => isSameDay(new Date(log.timestamp), day)).length;
      return { day, count };
    });
  }, [activeLogs]);

  // 3. SRS Distribution
  const distributionData = useMemo(() => {
    const intervals = [
      { label: 'New', min: 0, max: 0 },
      { label: '1-3d', min: 1, max: 3 },
      { label: '4-7d', min: 4, max: 7 },
      { label: '8-14d', min: 8, max: 14 },
      { label: '15-30d', min: 15, max: 30 },
      { label: '1mo+', min: 31, max: Infinity }
    ];

    return intervals.map(range => ({
      name: range.label,
      count: activeCards.filter(c => c.interval >= range.min && c.interval <= range.max).length
    }));
  }, [activeCards]);

  const averageRetention = useMemo(() => {
    const recentLogs = activeLogs.filter(log => log.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (recentLogs.length === 0) return 0;
    const correct = recentLogs.filter(log => log.quality >= 3).length;
    return Math.round((correct / recentLogs.length) * 100);
  }, [activeLogs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Study Analytics</h2>
          <p className="text-zinc-500 text-sm">Track your progress and retention over time.</p>
        </div>
        
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-bold text-xs uppercase tracking-widest appearance-none shadow-sm cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat as string}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Target size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Retention (7d)</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{averageRetention}%</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Reviews</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{logs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Flame size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Current Streak</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{deckUtils.getStreak(logs)}d</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-zinc-50 text-zinc-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mastered</span>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{cards.filter(c => c.interval > 21).length}</p>
        </div>
      </div>

      {/* Retention Chart */}
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Retention Rate (%)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#a1a1aa' }} 
                dy={10}
              />
              <YAxis 
                domain={[0, 100]} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 600, fill: '#a1a1aa' }} 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#18181b" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#18181b', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Heatmap */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Activity Heatmap</h3>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-zinc-100" />
                <div className="w-3 h-3 rounded-sm bg-zinc-300" />
                <div className="w-3 h-3 rounded-sm bg-zinc-500" />
                <div className="w-3 h-3 rounded-sm bg-zinc-900" />
              </div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase">More</span>
            </div>
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5">
            {heatmapData.map((data, i) => {
              let color = 'bg-zinc-100';
              if (data.count > 0) color = 'bg-zinc-300';
              if (data.count > 5) color = 'bg-zinc-500';
              if (data.count > 15) color = 'bg-zinc-900';
              
              return (
                <div 
                  key={i} 
                  className={`w-full aspect-square rounded-sm ${color} transition-colors cursor-help`}
                  title={`${format(data.day, 'MMM dd, yyyy')}: ${data.count} reviews`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            <span>{format(subDays(new Date(), 83), 'MMM')}</span>
            <span>{format(subDays(new Date(), 42), 'MMM')}</span>
            <span>Today</span>
          </div>
        </div>

        {/* SRS Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">SRS Distribution</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#a1a1aa' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#18181b' : '#71717a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
