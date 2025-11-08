import { useState } from 'react';
import { DayLog } from '../types';
import './CalendarView.css';

interface CalendarViewProps {
  dayLogs: DayLog[];
}

export default function CalendarView({ dayLogs }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月の最初の日と最後の日を取得
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // カレンダーの日付配列を生成
  const calendarDays: Array<{ date: Date; log?: DayLog; isCurrentMonth: boolean }> = [];

  // 前月の日付を追加
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = date.toISOString().split('T')[0];
    const log = dayLogs.find((l) => l.date === dateStr);
    calendarDays.push({ date, log, isCurrentMonth: false });
  }

  // 今月の日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const log = dayLogs.find((l) => l.date === dateStr);
    calendarDays.push({ date, log, isCurrentMonth: true });
  }

  // 次月の日付を追加（42セル分になるまで）
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    const dateStr = date.toISOString().split('T')[0];
    const log = dayLogs.find((l) => l.date === dateStr);
    calendarDays.push({ date, log, isCurrentMonth: false });
  }

  const getDayStatus = (day: { date: Date; log?: DayLog }) => {
    const dateStr = day.date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'today';
    if (!day.log) return 'empty';

    const morningCompleted = day.log.morning.completed;
    const eveningCompleted = day.log.evening.completed;

    if (morningCompleted && eveningCompleted) return 'completed';
    if (morningCompleted || eveningCompleted) return 'partial';
    return 'empty';
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 統計計算
  const totalCompleted = dayLogs.filter(
    (log) => log.morning.completed && log.evening.completed
  ).length;

  const calculateStreak = () => {
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = dayLogs.find((l) => l.date === dateStr);

      if (log && log.morning.completed && log.evening.completed) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="calendar-container">
      <div className="card calendar-header-card">
        <div className="calendar-header">
          <button className="calendar-nav-button" onClick={goToPreviousMonth} aria-label="前の月へ">
            ‹
          </button>
          <div className="calendar-title-block">
            <h1 className="calendar-title">
              {year}年 {monthNames[month]}
            </h1>
            <button className="calendar-today-button" onClick={goToToday}>
              今日へジャンプ
            </button>
          </div>
          <button className="calendar-nav-button" onClick={goToNextMonth} aria-label="次の月へ">
            ›
          </button>
        </div>
        <div className="calendar-stats">
          <div className="stat-item">
            <span className="stat-label">連続達成</span>
            <span className="stat-value">🔥 {streak}日</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">総達成日数</span>
            <span className="stat-value">{totalCompleted}日</span>
          </div>
        </div>
      </div>

      <div className="card calendar-main-card">
        <div className="calendar-weekdays">
          {weekDays.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            const status = getDayStatus(day);
            const dateStr = day.date.toISOString().split('T')[0];
            const isToday = dateStr === today.toISOString().split('T')[0];

            return (
              <div
                key={index}
                className={`calendar-day ${status} ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              >
                <div className="calendar-day-number">{day.date.getDate()}</div>
                {day.log && (
                  <div className="calendar-day-indicators">
                    {day.log.morning.completed && (
                      <div className="indicator indicator-morning" title="朝ルーティン完了">🌅</div>
                    )}
                    {day.log.evening.completed && (
                      <div className="indicator indicator-evening" title="夜ルーティン完了">🌙</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card calendar-legend-card">
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color completed"></div>
            <span>完全達成</span>
          </div>
          <div className="legend-item">
            <div className="legend-color partial"></div>
            <span>部分達成</span>
          </div>
          <div className="legend-item">
            <div className="legend-color today"></div>
            <span>今日</span>
          </div>
        </div>
      </div>
    </div>
  );
}
