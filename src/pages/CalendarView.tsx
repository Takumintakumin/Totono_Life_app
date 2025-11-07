import { DayLog } from '../types';

interface CalendarViewProps {
  dayLogs: DayLog[];
}

export default function CalendarView({ dayLogs }: CalendarViewProps) {
  const today = new Date().toISOString().split('T')[0];
  
  // 過去30日分のカレンダーを生成
  const generateCalendarDays = () => {
    const days: Array<{ date: string; log?: DayLog }> = [];
    const todayDate = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = dayLogs.find((l) => l.date === dateStr);
      days.push({ date: dateStr, log });
    }
    
    return days;
  };

  const getDayStatus = (day: { date: string; log?: DayLog }) => {
    if (!day.log) return 'empty';
    if (day.date === today) return 'today';
    
    const morningCompleted = day.log.morning.completed;
    const eveningCompleted = day.log.evening.completed;
    
    if (morningCompleted && eveningCompleted) return 'completed';
    if (morningCompleted || eveningCompleted) return 'partial';
    return 'empty';
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate().toString();
  };

  const calendarDays = generateCalendarDays();

  // 連続達成日数を計算
  const calculateStreak = () => {
    let streak = 0;
    const todayDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const log = dayLogs.find((l) => l.date === dateStr);
      
      if (log && log.morning.completed && log.evening.completed) {
        streak++;
      } else if (i === 0) {
        // 今日が未達成でも続ける
        continue;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();
  const totalCompleted = dayLogs.filter(
    (log) => log.morning.completed && log.evening.completed
  ).length;

  return (
    <div className="card">
      <h1 className="card-title">📅 ログ</h1>
      
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#667eea', marginBottom: '0.5rem' }}>
          🔥 {streak}日連続達成！
        </div>
        <div style={{ color: '#666' }}>
          総達成日数: {totalCompleted}日
        </div>
      </div>

      <div className="calendar-grid">
        {calendarDays.map((day) => {
          const status = getDayStatus(day);
          const label = getDayLabel(day.date);
          
          return (
            <div key={day.date} className={`calendar-day ${status}`}>
              <div>{label}</div>
              {status === 'completed' && <div style={{ fontSize: '0.6rem' }}>✓</div>}
              {status === 'partial' && <div style={{ fontSize: '0.6rem' }}>△</div>}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
        <div>✓ = 完全達成</div>
        <div>△ = 部分達成</div>
        <div>空白 = 未達成</div>
      </div>
    </div>
  );
}

