
import React, { useState, useEffect, useRef } from 'react';
import { Student, Seat, ROWS, COLS, AcademicRank } from '../types';
import { getStudents, getSeatingMap, saveSeatingMap, getSettings } from '../services/dataService';
import { autoArrangeSeating } from '../utils/seatingLogic';
import { Printer, Shuffle, Save, Info, RotateCcw, Crown, User, GraduationCap, ImageIcon } from 'lucide-react';
import { addLog } from '../utils/logger';

// Use global html2canvas from index.html
declare const html2canvas: any;

interface Props {
    setHasUnsavedChanges: (val: boolean) => void;
}

const SeatingMap: React.FC<Props> = ({ setHasUnsavedChanges }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [draggedSeat, setDraggedSeat] = useState<Seat | null>(null);
  const [perspective, setPerspective] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [isExporting, setIsExporting] = useState(false);
  const settings = getSettings();
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadedStudents = getStudents().filter(s => s.isActive !== false);
    setStudents(loadedStudents);
    const savedSeats = getSeatingMap();
    
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

  const handleExportImage = async () => {
      if (!mapRef.current) return;
      try {
          setIsExporting(true);
          
          const original = mapRef.current;
          const clone = original.cloneNode(true) as HTMLElement;
          
          // Style the clone for perfect high-res capture
          clone.style.width = "1350px"; 
          clone.style.position = "fixed";
          clone.style.top = "0";
          clone.style.left = "-10000px";
          clone.style.height = "auto";
          clone.style.backgroundColor = "white";
          clone.style.padding = "50px";
          
          document.body.appendChild(clone);

          // Give a moment for browser to layout the clone
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const canvas = await html2canvas(clone, {
              scale: 3, // Even higher resolution
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false,
              width: 1350,
              windowWidth: 1350
          });
          
          document.body.removeChild(clone);
          
          const link = document.createElement('a');
          link.download = `SoDoLopHoc_${perspective === 'TEACHER' ? 'GiaoVien' : 'HocSinh'}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          
          setIsExporting(false);
          addLog('SYSTEM', 'Đã xuất ảnh sơ đồ lớp học chất lượng cao.');
      } catch (error) {
          console.error("Export error:", error);
          alert("Lỗi khi xuất ảnh. Vui lòng thử lại.");
          setIsExporting(false);
      }
  };

  const handleDragStart = (e: React.DragEvent, seat: Seat) => {
    if (!seat.studentId) {
        e.preventDefault();
        return;
    }
    setDraggedSeat(seat);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSeat: Seat) => {
    e.preventDefault();
    if (!draggedSeat) return;
    if (draggedSeat.row === targetSeat.row && draggedSeat.col === targetSeat.col) {
        setDraggedSeat(null);
        return;
    }
    const sourceStudentId = draggedSeat.studentId;
    const targetStudentId = targetSeat.studentId;
    const newSeats = seats.map(s => {
        if (s.row === targetSeat.row && s.col === targetSeat.col) return { ...s, studentId: sourceStudentId };
        if (s.row === draggedSeat.row && s.col === draggedSeat.col) return { ...s, studentId: targetStudentId };
        return s;
    });
    setSeats(newSeats);
    setDraggedSeat(null);
    saveSeatingMap(newSeats);
    setHasUnsavedChanges(true);
  };

  const renderSeat = (r: number, c: number) => {
    const seat = seats.find(s => s.row === r && s.col === c);
    if (!seat) return <div className="h-40 w-full border bg-gray-100 flex items-center justify-center text-xs">Error</div>;
    const student = seat.studentId ? students.find(s => s.id === seat.studentId) : null;
    
    let rankColor = 'bg-gray-50';
    let borderColor = 'border-gray-200';
    let textColor = 'text-gray-800';
    if (student) {
        switch(student.rank) {
            case AcademicRank.GOOD: rankColor = 'bg-green-50'; borderColor = 'border-green-300'; textColor = 'text-green-900'; break;
            case AcademicRank.FAIR: rankColor = 'bg-blue-50'; borderColor = 'border-blue-300'; textColor = 'text-blue-900'; break;
            default: rankColor = 'bg-white'; borderColor = 'border-gray-300';
        }
    }
    const isDragging = draggedSeat?.row === r && draggedSeat?.col === c;
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
                relative h-40 w-full border-2 rounded-xl flex flex-col items-center justify-between py-2.5 px-1 text-center transition-all shadow-sm
                ${borderColor} ${rankColor} ${textColor}
                ${student ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'}
                ${isDragging ? 'opacity-40 border-dashed border-indigo-500' : ''}
            `}
        >
            {student ? (
                <>
                    {student.hasPrioritySeating && (
                        <div className="absolute -top-2 -right-2 text-yellow-500 z-20 drop-shadow-sm bg-white rounded-full p-1 border border-yellow-100 shadow-sm" title="Vé Chọn Chỗ VIP">
                            <Crown size={16} fill="gold" />
                        </div>
                    )}
                    
                    {/* Student Name: Placed at the top for maximum visibility */}
                    <div className="font-bold text-[11px] leading-tight w-full px-0.5 line-clamp-2 min-h-[2.4em] flex items-center justify-center">
                        {student.name}
                    </div>

                    {/* Avatar: Reduced size to w-8 h-8 */}
                    <div className="relative w-8 h-8 flex items-center justify-center my-1.5">
                         {student.frameUrl && <img src={student.frameUrl} className="absolute inset-0 w-full h-full z-10 scale-150 pointer-events-none" alt="" />}
                         <div className="text-2xl leading-none z-0">{student.avatarUrl || '👤'}</div>
                    </div>

                    {/* Badges & Warning: Placed at the bottom */}
                    <div className="flex gap-0.5 justify-center w-full flex-wrap h-5 content-end">
                         {student.isTalkative && <span title="Hay nói chuyện" className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-black border border-red-200">!</span>}
                         {badgesToShow.map(bid => {
                             const badge = settings.gamification.badges.find(b => b.id === bid);
                             return badge ? <span key={bid} title={badge.label} className="text-sm">{badge.icon}</span> : null;
                         })}
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <span className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Trống</span>
                </div>
            )}
        </div>
    );
  };

  const renderBoard = () => (
    <div className="text-center mb-10 border-b-4 border-dashed border-gray-300 pb-6">
        <div className="inline-block px-12 py-3.5 bg-gray-800 text-white font-black rounded-xl uppercase tracking-[0.3em] text-xs shadow-lg">Bảng Giáo Viên</div>
    </div>
  );

  const rowIndices = perspective === 'STUDENT' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
  const leftColIndices = perspective === 'STUDENT' ? [0, 1, 2, 3] : [7, 6, 5, 4];
  const rightColIndices = perspective === 'STUDENT' ? [4, 5, 6, 7] : [3, 2, 1, 0];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
        <div>
             <h2 className="text-2xl font-bold text-gray-800">Sơ Đồ Lớp Học</h2>
             <p className="text-sm text-gray-500">Kéo thả để đổi chỗ. Dữ liệu tự động lưu khi di chuyển.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
            <div className="flex bg-white border rounded-lg p-1 mr-2 shadow-sm">
                <button 
                    onClick={() => setPerspective('STUDENT')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${perspective === 'STUDENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <GraduationCap size={14}/> Học sinh
                </button>
                <button 
                    onClick={() => setPerspective('TEACHER')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${perspective === 'TEACHER' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <User size={14}/> Giáo viên
                </button>
            </div>

            <button onClick={handleReset} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 text-sm font-bold">
                <RotateCcw size={18} /> <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button onClick={handleAutoArrange} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 text-sm font-bold">
                <Shuffle size={18} /> <span className="hidden sm:inline">Tự động xếp</span>
            </button>
            <button onClick={saveLayout} className="flex items-center gap-2 bg-white text-gray-700 border px-4 py-2 rounded hover:bg-gray-100 text-sm font-bold">
                <Save size={18} /> <span className="hidden sm:inline">Lưu sơ đồ</span>
            </button>
             <button onClick={handleExportImage} disabled={isExporting} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow transition-colors text-sm font-bold">
                <ImageIcon size={18} /> {isExporting ? 'Đang xuất...' : 'Lưu ảnh'}
            </button>
             <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 text-sm font-bold">
                <Printer size={18} /> <span className="hidden sm:inline">In</span>
            </button>
        </div>
      </div>

      <div ref={mapRef} className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border-t-8 border-indigo-600 overflow-x-auto print-only">
         {perspective === 'STUDENT' && renderBoard()}

         <div className="min-w-[1000px] mx-auto">
             {rowIndices.map((r) => (
                 <div key={`row-${r}`} className="flex gap-14 mb-8">
                     <div className="flex-1 grid grid-cols-4 gap-4">
                        {leftColIndices.map((c) => renderSeat(r, c))}
                     </div>
                     <div className="w-14 flex items-center justify-center">
                        <span className="text-gray-200 text-[11px] font-black tracking-[0.8em] -rotate-90 whitespace-nowrap uppercase opacity-40">Lối đi chính</span>
                     </div>
                     <div className="flex-1 grid grid-cols-4 gap-4">
                        {rightColIndices.map((c) => renderSeat(r, c))}
                     </div>
                 </div>
             ))}
         </div>

         {perspective === 'TEACHER' && (
            <div className="mt-10 border-t-4 border-dashed border-gray-300 pt-8 text-center">
                <div className="inline-block px-12 py-3.5 bg-gray-800 text-white font-black rounded-xl uppercase tracking-[0.3em] text-xs shadow-lg">Bảng Giáo Viên</div>
            </div>
         )}
         
         <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between items-center opacity-40 text-[10px] font-bold text-gray-400 italic">
             <span>Lớp: {settings.studentCode || 'Chưa đặt mã'}</span>
             <span>Thời gian xuất: {new Date().toLocaleString('vi-VN')}</span>
             <span>Phần mềm Quản lý Lớp học Thông minh</span>
         </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm flex gap-3 no-print border border-yellow-200 shadow-sm">
         <Info size={20} className="mt-0.5 flex-shrink-0 text-yellow-600" />
         <div>
            <strong className="text-yellow-900 block mb-1 text-base">Ghi chú quan trọng:</strong>
            <ul className="list-disc ml-4 space-y-1 text-xs font-bold opacity-80">
                <li>Góc nhìn <strong>Học sinh</strong>: Nhìn từ cuối lớp lên bảng (Bảng ở trên cùng).</li>
                <li>Góc nhìn <strong>Giáo viên</strong>: Nhìn từ trên bục giảng xuống lớp (Bảng ở dưới cùng).</li>
                <li>Ảnh xuất ra sẽ có độ phân giải cực cao (3x) để đảm bảo không bị mờ khi in ấn hoặc gửi Zalo.</li>
                <li><Crown size={12} className="inline text-yellow-600 mb-0.5"/> : Học sinh sở hữu <strong>Vé Chọn Chỗ VIP</strong>.</li>
            </ul>
         </div>
      </div>
    </div>
  );
};

export default SeatingMap;
