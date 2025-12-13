
import React, { useState, useEffect } from 'react';
import { Student, Seat, ROWS, COLS, AcademicRank } from '../types';
import { getStudents, getSeatingMap, saveSeatingMap, getSettings } from '../services/dataService';
import { autoArrangeSeating } from '../utils/seatingLogic';
import { Printer, Shuffle, Save, Info, RotateCcw, Crown } from 'lucide-react';
import { addLog } from '../utils/logger';

interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

const SeatingMap: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [draggedSeat, setDraggedSeat] = useState<Seat | null>(null);
  const settings = getSettings();

  useEffect(() => {
    // Only load active students
    const loadedStudents = getStudents().filter(s => s.isActive !== false);
    setStudents(loadedStudents);
    const savedSeats = getSeatingMap();
    
    // Clean up seats that might refer to deleted OR inactive students
    if (savedSeats && savedSeats.length > 0) {
        const cleanedSeats = savedSeats.map(seat => {
            if (seat.studentId) {
                const exists = loadedStudents.find(s => s.id === seat.studentId);
                if (!exists) return { ...seat, studentId: null };
            }
            return seat;
        });
        setSeats(cleanedSeats);
    } else {
        // Init empty if nothing
        const emptySeats: Seat[] = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                emptySeats.push({ row: r, col: c, studentId: null });
            }
        }
        setSeats(emptySeats);
    }
  }, []);

  const handleAutoArrange = () => {
    if (students.length === 0) {
        alert("Danh sách học sinh đang trống! Vui lòng nhập học sinh trước.");
        return;
    }
    if (window.confirm('Sắp xếp lại sẽ thay đổi sơ đồ hiện tại. Bạn có chắc không?')) {
      const newLayout = autoArrangeSeating(students);
      setSeats([...newLayout]);
      saveSeatingMap(newLayout);
      setHasUnsavedChanges(true);
    }
  };

  const handleReset = () => {
      if (window.confirm('Hành động này sẽ xóa toàn bộ vị trí chỗ ngồi hiện tại. Bạn chắc chắn chứ?')) {
          const emptySeats: Seat[] = [];
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              emptySeats.push({ row: r, col: c, studentId: null });
            }
          }
          setSeats(emptySeats);
          saveSeatingMap(emptySeats);
          setHasUnsavedChanges(true);
          addLog('SEATING', 'Đã xóa trắng sơ đồ chỗ ngồi.');
      }
  };

  const saveLayout = () => {
      saveSeatingMap(seats);
      setHasUnsavedChanges(true);
      alert('Đã lưu sơ đồ!');
  };

  const handlePrint = () => {
      window.print();
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, seat: Seat) => {
    if (!seat.studentId) {
        e.preventDefault(); // Prevent dragging empty seats
        return;
    }
    setDraggedSeat(seat);
    // Use a slight timeout to avoid visual glitches with the element disappearing immediately
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Essential to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSeat: Seat) => {
    e.preventDefault();
    if (!draggedSeat) return;
    
    // Don't do anything if dropping on itself
    if (draggedSeat.row === targetSeat.row && draggedSeat.col === targetSeat.col) {
        setDraggedSeat(null);
        return;
    }

    const sourceStudentId = draggedSeat.studentId;
    const targetStudentId = targetSeat.studentId;

    // Create new array with swapped IDs
    const newSeats = seats.map(s => {
        // Seat we dropped ONTO -> Takes the source student
        if (s.row === targetSeat.row && s.col === targetSeat.col) {
            return { ...s, studentId: sourceStudentId };
        }
        // Seat we dragged FROM -> Takes the target student (swap) or null
        if (s.row === draggedSeat.row && s.col === draggedSeat.col) {
            return { ...s, studentId: targetStudentId };
        }
        return s;
    });

    setSeats(newSeats);
    setDraggedSeat(null);
    saveSeatingMap(newSeats); // Auto save on drop for better UX
    setHasUnsavedChanges(true);
  };

  // --- Rendering Helpers ---
  const renderSeat = (r: number, c: number) => {
    const seat = seats.find(s => s.row === r && s.col === c);
    
    // Fallback if seat map is corrupted or incomplete
    if (!seat) return <div className="h-28 w-full border bg-gray-100 flex items-center justify-center text-xs">Error</div>;

    const student = seat.studentId ? students.find(s => s.id === seat.studentId) : null;
    
    // Determine visuals based on rank
    let rankColor = 'bg-gray-50';
    let borderColor = 'border-gray-200';
    let textColor = 'text-gray-800';
    
    if (student) {
        switch(student.rank) {
            case AcademicRank.GOOD: 
                rankColor = 'bg-green-50'; 
                borderColor = 'border-green-300'; 
                textColor = 'text-green-900';
                break;
            case AcademicRank.FAIR: 
                rankColor = 'bg-blue-50'; 
                borderColor = 'border-blue-300'; 
                textColor = 'text-blue-900';
                break;
            default: 
                rankColor = 'bg-white';
                borderColor = 'border-gray-300';
        }
    }

    const isDragging = draggedSeat?.row === r && draggedSeat?.col === c;

    // Get badges to display: Use displayedBadges first, fallback to first 5
    const badgesToShow = student && student.badges 
        ? ((student.displayedBadges && student.displayedBadges.length > 0) ? student.displayedBadges : student.badges.slice(0, 5)) 
        : [];

    return (
        <div 
            key={`${r}-${c}`}
            draggable={!!student}
            onDragStart={(e) => handleDragStart(e, seat)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, seat)}
            className={`
                relative h-28 w-full border-2 rounded-lg flex flex-col items-center justify-center px-1 py-1 text-center transition-all shadow-sm
                ${borderColor} ${rankColor} ${textColor}
                ${student ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
                ${isDragging ? 'opacity-40 border-dashed border-indigo-500' : ''}
            `}
        >
            {student ? (
                <>
                    {/* VIP CROWN INDICATOR */}
                    {student.hasPrioritySeating && (
                        <div className="absolute -top-2 -right-2 text-yellow-500 z-20 drop-shadow-sm bg-white rounded-full p-0.5" title="Vé Chọn Chỗ VIP">
                            <Crown size={16} fill="gold" />
                        </div>
                    )}

                    <div className="font-bold text-sm leading-tight line-clamp-2 break-words w-full mb-1 relative z-10">
                        {student.name}
                    </div>
                    {/* Avatar with Frame */}
                    <div className="relative w-8 h-8 mb-1 flex items-center justify-center">
                         {student.frameUrl && <img src={student.frameUrl} className="absolute inset-0 w-full h-full z-10 scale-125" alt="" />}
                         <div className="text-xl leading-none z-0">
                             {student.avatarUrl || '👤'}
                         </div>
                    </div>
                    
                    {/* Icons/Badges Row - UPDATED: Show displayedBadges */}
                    <div className="flex gap-0.5 mt-0.5 justify-center w-full flex-wrap h-5 content-start">
                         {student.isTalkative && <span title="Hay nói chuyện" className="text-sm bg-red-100 text-red-600 px-1 rounded font-bold">⚠</span>}
                         {badgesToShow.map(bid => {
                             const badge = settings.gamification.badges.find(b => b.id === bid);
                             return badge ? <span key={bid} title={badge.label} className="text-sm">{badge.icon}</span> : null;
                         })}
                    </div>
                </>
            ) : (
                <span className="text-gray-300 text-xs font-medium uppercase tracking-wide">Trống</span>
            )}
        </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
        <div>
             <h2 className="text-2xl font-bold text-gray-800">Sơ Đồ Lớp Học</h2>
             <p className="text-sm text-gray-500">Kéo thả để đổi chỗ. Dữ liệu tự động lưu khi di chuyển.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={handleReset} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                <RotateCcw size={18} /> Reset
            </button>
            <button onClick={handleAutoArrange} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">
                <Shuffle size={18} /> <span className="hidden sm:inline">Tự động xếp</span>
            </button>
            <button onClick={saveLayout} className="flex items-center gap-2 bg-white text-gray-700 border px-4 py-2 rounded hover:bg-gray-100">
                <Save size={18} /> Lưu
            </button>
             <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">
                <Printer size={18} /> In
            </button>
        </div>
      </div>

      {/* Classroom Container */}
      <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg border-t-8 border-indigo-600 overflow-x-auto print-only">
         <div className="text-center mb-8 border-b-2 border-dashed border-gray-300 pb-4">
            <div className="inline-block px-8 py-2 bg-gray-800 text-white font-bold rounded-lg uppercase tracking-widest text-sm">Bảng Giáo Viên</div>
         </div>

         <div className="min-w-[800px] mx-auto">
             {/* Rows Loop */}
             {Array.from({ length: ROWS }).map((_, r) => (
                 <div key={`row-${r}`} className="flex gap-12 mb-6">
                     {/* Left Bank (Cols 0-3) */}
                     <div className="flex-1 grid grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => renderSeat(r, i))}
                     </div>
                     
                     {/* Aisle */}
                     <div className="w-12 flex items-center justify-center">
                        <span className="text-gray-200 text-xs font-mono tracking-widest -rotate-90 whitespace-nowrap">LỐI ĐI</span>
                     </div>

                     {/* Right Bank (Cols 4-7) */}
                     <div className="flex-1 grid grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => renderSeat(r, i + 4))}
                     </div>
                 </div>
             ))}
         </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm flex gap-2 no-print border border-yellow-200">
         <Info size={16} className="mt-0.5 flex-shrink-0" />
         <div>
            <strong>Ghi chú xếp chỗ:</strong>
            <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Học sinh có Khung hình và Avatar sẽ hiển thị trực tiếp.</li>
                <li><Crown size={12} className="inline text-yellow-600"/> : Học sinh đã dùng <strong>Vé Chọn Chỗ VIP</strong>.</li>
                <li><span className="text-red-500 font-bold">⚠</span> : Học sinh hay nói chuyện.</li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default SeatingMap;
