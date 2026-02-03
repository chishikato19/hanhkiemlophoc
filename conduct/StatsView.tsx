
import React, { useState, useMemo, useRef } from 'react';
import { AlertTriangle, TrendingDown, Repeat, FileQuestion, Search, ImageIcon, Star, User, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Student, ConductRecord, Settings, AcademicRank } from '../../types';
import { StudentAnalysis } from '../../utils/analytics';
import { formatGroupedList } from '../../utils/formatters';

// Use global html2canvas
declare const html2canvas: any;

interface Props {
    students: Student[];
    records: ConductRecord[];
    settings: Settings;
    classAlerts: StudentAnalysis[];
    statsStartWeek: number;
    statsEndWeek: number;
    setStatsStartWeek: (w: number) => void;
    setStatsEndWeek: (w: number) => void;
    getRankFromScore: (s: number) => AcademicRank;
    getRankColor: (r: string) => string;
    getWeekLabel: (w: number) => string;
    setSelectedStudentForDetail: (s: Student) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; 

const StatsView: React.FC<Props> = ({
    students, records, settings, classAlerts, statsStartWeek, statsEndWeek, setStatsStartWeek, setStatsEndWeek,
    getRankFromScore, getRankColor, getWeekLabel, setSelectedStudentForDetail
}) => {
    const [statsTab, setStatsTab] = useState<'chart' | 'week-report' | 'multi-report' | 'semester'>('chart');
    const [selectedWeek, setSelectedWeek] = useState(statsEndWeek);
    const [filterEmptyReports, setFilterEmptyReports] = useState(false);
    const [semesterMode, setSemesterMode] = useState<'s1' | 's2' | 'year'>('s1');

    const classReportRef = useRef<HTMLDivElement>(null);
    const multiReportRef = useRef<HTMLDivElement>(null);
    const activeStudents = students.filter(s => s.isActive !== false);

    // Calc helpers
    const pieData = useMemo(() => {
        const weekRecords = records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek && activeStudents.find(s => s.id === r.studentId));
        if (weekRecords.length === 0) return [];
        const studentScores: Record<string, number[]> = {};
        weekRecords.forEach(r => { if (!studentScores[r.studentId]) studentScores[r.studentId] = []; studentScores[r.studentId].push(r.score); });
        const ranks = { [AcademicRank.GOOD]: 0, [AcademicRank.FAIR]: 0, [AcademicRank.PASS]: 0, [AcademicRank.FAIL]: 0 };
        Object.values(studentScores).forEach(scores => { const avg = Math.round(scores.reduce((a,b)=>a+b,0) / scores.length); const r = getRankFromScore(avg); ranks[r]++; });
        return [ { name: AcademicRank.GOOD, value: ranks[AcademicRank.GOOD] }, { name: AcademicRank.FAIR, value: ranks[AcademicRank.FAIR] }, { name: AcademicRank.PASS, value: ranks[AcademicRank.PASS] }, { name: AcademicRank.FAIL, value: ranks[AcademicRank.FAIL] }, ];
    }, [records, statsStartWeek, statsEndWeek, activeStudents, settings]);

    const commonViolations = useMemo(() => {
        const weekRecords = records.filter(r => r.week === selectedWeek); if (weekRecords.length === 0) return [];
        const counts: Record<string, number> = {}; weekRecords.forEach(r => { const unique = new Set(r.violations); unique.forEach((v: any) => counts[v] = (counts[v] || 0) + 1); });
        const threshold = weekRecords.length * 0.8; return Object.keys(counts).filter(k => counts[k] >= threshold);
    }, [records, selectedWeek]);
    const commonPositives = useMemo(() => {
        const weekRecords = records.filter(r => r.week === selectedWeek); if (weekRecords.length === 0) return [];
        const counts: Record<string, number> = {}; weekRecords.forEach(r => { const unique = new Set(r.positiveBehaviors || []); unique.forEach((v: any) => counts[v] = (counts[v] || 0) + 1); });
        const threshold = weekRecords.length * 0.8; return Object.keys(counts).filter(k => counts[k] >= threshold);
    }, [records, selectedWeek]);

    const calculateSemesterRank = (student: Student, mode: 's1' | 's2' | 'year') => {
        const studentRecords = records.filter(r => r.studentId === student.id);
        let targetRecords: ConductRecord[] = [];
        if (mode === 's1') { targetRecords = studentRecords.filter(r => r.week < settings.semesterTwoStartWeek); } 
        else if (mode === 's2') { targetRecords = studentRecords.filter(r => r.week >= settings.semesterTwoStartWeek); } 
        else { targetRecords = studentRecords; }
        if (targetRecords.length === 0) return { avgRaw: '-', avgConverted: '-', rank: 'N/A' };
        let totalConverted = 0; let totalRaw = 0;
        targetRecords.forEach(r => { totalRaw += r.score; const wRank = getRankFromScore(r.score); let p = 0; if (wRank === AcademicRank.GOOD) p = settings.rankScores.good; else if (wRank === AcademicRank.FAIR) p = settings.rankScores.fair; else if (wRank === AcademicRank.PASS) p = settings.rankScores.pass; else p = settings.rankScores.fail; totalConverted += p; });
        const avgConverted = parseFloat((totalConverted / targetRecords.length).toFixed(1)); const avgRaw = Math.round(totalRaw / targetRecords.length);
        let rank = AcademicRank.FAIL; if (avgConverted >= settings.semesterThresholds.good) rank = AcademicRank.GOOD; else if (avgConverted >= settings.semesterThresholds.fair) rank = AcademicRank.FAIR; else if (avgConverted >= settings.semesterThresholds.pass) rank = AcademicRank.PASS;
        return { avgRaw, avgConverted, rank };
    };

    const exportClassImage = async () => { if (!classReportRef.current) return; try { const canvas = await html2canvas(classReportRef.current, { scale: 2 }); const link = document.createElement('a'); link.download = `BaoCao_Tuan${selectedWeek}.png`; link.href = canvas.toDataURL(); link.click(); } catch (e) { alert("Lỗi xuất ảnh"); } };
    const exportMultiReportImage = async () => { if (!multiReportRef.current) return; try { const canvas = await html2canvas(multiReportRef.current, { scale: 2 }); const link = document.createElement('a'); link.download = `BaoCao_TongHop_Tuan${statsStartWeek}-${statsEndWeek}.png`; link.href = canvas.toDataURL(); link.click(); } catch (e) { alert("Lỗi xuất ảnh"); } };
    
    const exportSingleCard = async (studentName: string, elementId: string) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        try {
            const canvas = await html2canvas(el, { scale: 2 });
            const link = document.createElement('a');
            link.download = `BaoCao_${studentName}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (e) {
            alert("Lỗi xuất ảnh học sinh này.");
        }
    };

    return (
        <div className="flex flex-col h-full gap-4">
               {classAlerts.length > 0 && statsTab !== 'semester' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                      <h3 className="text-orange-800 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={20} className="text-orange-600"/> Học sinh cần lưu ý (Tuần {statsStartWeek} - {statsEndWeek})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {classAlerts.map(analysis => (
                              <div key={analysis.studentId} className="bg-white border border-orange-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="font-bold text-gray-800 flex justify-between">{analysis.studentName} {analysis.alerts.some(a => a.type === 'CRITICAL') && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded font-bold">NGUY HIỂM</span>}</div>
                                  <ul className="mt-2 space-y-1">
                                      {analysis.alerts.map((alert, idx) => (
                                          <li key={idx} className="text-xs flex gap-2 items-start text-gray-700">
                                              <span className="mt-0.5 min-w-[14px]">
                                                  {alert.code === 'TREND' && <TrendingDown size={12} className="text-red-500"/>}
                                                  {alert.code === 'RECURRING' && <Repeat size={12} className="text-orange-500"/>}
                                                  {alert.code === 'DROP' && <TrendingDown size={12} className="text-yellow-600"/>}
                                                  {alert.code === 'THRESHOLD' && <AlertTriangle size={12} className="text-red-500"/>}
                                                  {alert.code === 'MISSING_DATA' && <FileQuestion size={12} className="text-blue-500"/>}
                                              </span>
                                              <span>{alert.message}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {statsTab !== 'semester' && (
                  <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap items-center gap-4">
                      <span className="font-bold text-gray-700 flex items-center gap-2"><Search size={18}/> Bộ lọc:</span>
                      <div className="flex items-center gap-2"><span className="text-sm">Từ tuần</span><input type="number" min="1" value={statsStartWeek} onChange={e => setStatsStartWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/></div>
                      <div className="flex items-center gap-2"><span className="text-sm">Đến tuần</span><input type="number" min="1" value={statsEndWeek} onChange={e => setStatsEndWeek(parseInt(e.target.value))} className="w-16 border rounded p-1 text-center"/></div>
                  </div>
              )}

              <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                  <button onClick={() => setStatsTab('chart')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'chart' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Biểu đồ</button>
                  <button onClick={() => setStatsTab('week-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'week-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Tuần</button>
                  <button onClick={() => setStatsTab('multi-report')} className={`px-4 py-2 font-medium text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'multi-report' ? 'bg-white text-indigo-600 border border-b-0' : 'text-gray-500 hover:text-indigo-600'}`}>Báo cáo Chi tiết</button>
                  <button onClick={() => setStatsTab('semester')} className={`px-4 py-2 font-bold text-sm rounded-t-lg whitespace-nowrap ${statsTab === 'semester' ? 'bg-yellow-50 text-indigo-700 border border-yellow-200' : 'text-gray-500 hover:text-indigo-600'}`}>Tổng kết Học kỳ</button>
              </div>

              <div className="bg-white rounded-b-xl rounded-tr-xl shadow p-6 min-h-[500px]">
                  {statsTab === 'chart' && (
                      <div className="flex flex-col md:flex-row gap-8 items-center justify-center h-full">
                           <div className="w-full md:w-1/2 h-80 flex flex-col items-center">
                                <h3 className="font-bold text-gray-700 mb-4">Phân loại Hạnh Kiểm (Trung bình)</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                           </div>
                           <div className="w-full md:w-1/2">
                                <h4 className="font-bold mb-2">Thống kê nhanh (Tuần {statsStartWeek} - {statsEndWeek}):</h4>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li>Tổng số học sinh (Active): <strong>{activeStudents.length}</strong></li>
                                    <li>Tuần dữ liệu: <strong>{new Set(records.filter(r => r.week >= statsStartWeek && r.week <= statsEndWeek).map(r => r.week)).size}</strong></li>
                                </ul>
                           </div>
                      </div>
                  )}

                  {statsTab === 'week-report' && (
                      <div>
                          <div className="mb-4 flex flex-wrap items-center justify-between bg-gray-50 p-3 rounded gap-2">
                              <div className="flex items-center gap-2">
                                <label className="font-bold">Chọn tuần xem báo cáo:</label>
                                <select value={selectedWeek} onChange={(e) => setSelectedWeek(parseInt(e.target.value))} className="border rounded px-2 py-1">
                                    {Array.from({length: 35}).map((_, i) => (<option key={i+1} value={i+1}>{getWeekLabel(i+1)}</option>))}
                                </select>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer select-none border px-3 py-1 bg-white rounded shadow-sm hover:bg-gray-100">
                                  <input type="checkbox" checked={filterEmptyReports} onChange={e => setFilterEmptyReports(e.target.checked)} className="w-4 h-4 text-indigo-600"/>
                                  <span className="text-sm font-medium text-gray-700">Rút gọn danh sách</span>
                              </label>
                              <button onClick={exportClassImage} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-indigo-700 ml-auto"><ImageIcon size={16}/> Xuất ảnh cả lớp</button>
                          </div>
                          
                          <div ref={classReportRef} className="bg-white p-4">
                            <div className="text-center mb-4">
                                <h3 className="text-xl font-bold uppercase text-indigo-800">Báo cáo Tổng hợp Tuần {selectedWeek}</h3>
                                <p className="text-sm text-gray-500 italic">{getWeekLabel(selectedWeek)}</p>
                            </div>

                            {(commonViolations.length > 0 || commonPositives.length > 0) && (
                                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {commonViolations.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <h4 className="font-bold text-red-700 text-sm flex items-center gap-2 uppercase mb-2"><AlertTriangle size={16}/> Vi phạm chung (Trừ điểm cả lớp)</h4>
                                            <ul className="list-disc list-inside text-sm text-red-800">{formatGroupedList(commonViolations, settings.behaviorConfig.violations).map((item, i) => (<li key={i}>{item}</li>))}</ul>
                                        </div>
                                    )}
                                    {commonPositives.length > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <h4 className="font-bold text-green-700 text-sm flex items-center gap-2 uppercase mb-2"><Star size={16}/> Thành tích chung (Cộng điểm cả lớp)</h4>
                                            <ul className="list-disc list-inside text-sm text-green-800">{formatGroupedList(commonPositives, settings.behaviorConfig.positives).map((item, i) => (<li key={i}>{item}</li>))}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 text-sm">
                                    <thead className="bg-gray-100">
                                        <tr><th className="border p-2 w-10">STT</th><th className="border p-2">Học sinh</th><th className="border p-2 w-16">Điểm</th><th className="border p-2 w-20">Xếp loại</th><th className="border p-2 w-1/4">Vi phạm (Cá nhân)</th><th className="border p-2 w-1/4">Hành vi tốt (Cá nhân)</th><th className="border p-2 w-1/4">Ghi chú</th></tr>
                                    </thead>
                                    <tbody>
                                        {activeStudents.filter(stu => {
                                            if (!filterEmptyReports) return true;
                                            const r = records.find(rec => rec.studentId === stu.id && rec.week === selectedWeek);
                                            const displayViolations = r ? r.violations.filter(v => !commonViolations.includes(v)) : [];
                                            const displayPositives = r ? (r.positiveBehaviors || []).filter(p => !commonPositives.includes(p)) : [];
                                            return displayViolations.length > 0 || displayPositives.length > 0 || (r && r.note);
                                        }).map((stu, index) => {
                                            const r = records.find(rec => rec.studentId === stu.id && rec.week === selectedWeek);
                                            const score = r ? r.score : 0;
                                            const rank = r ? getRankFromScore(score) : 'Chưa có';
                                            const displayViolations = r ? r.violations.filter(v => !commonViolations.includes(v)) : [];
                                            const displayPositives = r ? (r.positiveBehaviors || []).filter(p => !commonPositives.includes(p)) : [];

                                            return (
                                                <tr key={stu.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="border p-2 text-center text-gray-500">{index + 1}</td>
                                                    <td className="border p-2 font-medium">{stu.name}</td>
                                                    <td className={`border p-2 text-center font-bold ${r ? (r.score < 50 ? 'text-red-600' : r.score < 80 ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}`}>{r ? r.score : '-'}</td>
                                                    <td className="border p-2 text-center">{r && <span className={`text-xs font-bold px-1 rounded ${getRankColor(rank)}`}>{rank}</span>}</td>
                                                    <td className="border p-2 text-red-700 text-xs">{r ? formatGroupedList(displayViolations, settings.behaviorConfig.violations).join(', ') : ''}</td>
                                                    <td className="border p-2 text-green-700 text-xs">{r ? formatGroupedList(displayPositives, settings.behaviorConfig.positives).join(', ') : ''}</td>
                                                    <td className="border p-2 text-gray-600 italic text-xs">{r ? r.note : ''}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-right text-xs text-gray-400">Xuất từ Ứng dụng Lớp Học Thông Minh</div>
                          </div>
                      </div>
                  )}

                  {statsTab === 'multi-report' && (
                      <div>
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold uppercase text-indigo-800">Tổng hợp (Tuần {statsStartWeek} - {statsEndWeek})</h3>
                                <button onClick={exportMultiReportImage} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-indigo-700"><ImageIcon size={16}/> Xuất ảnh chi tiết</button>
                            </div>
                           <div ref={multiReportRef} className="bg-white p-4">
                               <div className="space-y-6">
                                   {activeStudents.map(s => {
                                       const studentRecords = records.filter(r => r.studentId === s.id && r.week >= statsStartWeek && r.week <= statsEndWeek && (r.violations.length > 0 || (r.positiveBehaviors && r.positiveBehaviors.length > 0) || r.note));
                                       if (studentRecords.length === 0) return null;
                                       const avg = Math.round(studentRecords.reduce((acc, cur) => acc + cur.score, 0) / studentRecords.length);
                                       const rank = getRankFromScore(avg);
                                       const cardId = `multi-report-card-${s.id}`;
                                       
                                       return (
                                           <div key={s.id} id={cardId} className="border rounded-lg p-4 bg-gray-50 break-inside-avoid relative hover:shadow-md transition-shadow">
                                               <div className="flex justify-between items-start border-b pb-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setSelectedStudentForDetail(s)} className="font-bold text-lg text-indigo-700 hover:underline flex items-center gap-2">{s.name} <User size={16}/></button>
                                                        <button 
                                                            onClick={() => exportSingleCard(s.name, cardId)} 
                                                            className="text-gray-400 hover:text-indigo-600 p-1" 
                                                            title="Lưu ảnh thẻ này"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500">Trung bình giai đoạn</div>
                                                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${getRankColor(rank)}`}>{avg}đ - {rank}</span>
                                                    </div>
                                               </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                   {studentRecords.sort((a,b) => a.week - b.week).map(r => (
                                                       <div key={r.id} className="bg-white p-2 rounded border shadow-sm text-sm">
                                                           <div className="flex justify-between items-center mb-1">
                                                               <span className="font-bold text-indigo-600">Tuần {r.week}</span>
                                                               <div className="flex items-center gap-1"><span className="text-xs font-bold border px-1 rounded">{r.score}đ</span><span className={`text-[10px] px-1 rounded ${getRankColor(getRankFromScore(r.score))}`}>{getRankFromScore(r.score)}</span></div>
                                                           </div>
                                                           {r.violations.length > 0 && <div className="text-red-700 mb-1">- {formatGroupedList(r.violations, settings.behaviorConfig.violations).join(', ')}</div>}
                                                           {r.positiveBehaviors && r.positiveBehaviors.length > 0 && <div className="text-green-700">+ {formatGroupedList(r.positiveBehaviors, settings.behaviorConfig.positives).join(', ')}</div>}
                                                           {r.note && <div className="text-gray-500 italic mt-1 border-t pt-1">Ghi chú: {r.note}</div>}
                                                       </div>
                                                   ))}
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                               <div className="mt-6 text-center text-xs text-gray-400">Xuất từ Ứng dụng Lớp Học Thông Minh</div>
                           </div>
                      </div>
                  )}

                  {statsTab === 'semester' && (
                      <div>
                          <div className="flex justify-between items-center mb-6 border-b pb-4">
                              <h3 className="text-xl font-bold uppercase text-indigo-800">Bảng Điểm Hạnh Kiểm</h3>
                              <div className="flex bg-gray-100 p-1 rounded-lg">
                                  <button onClick={() => setSemesterMode('s1')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 's1' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Học Kỳ 1</button>
                                  <button onClick={() => setSemesterMode('s2')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 's2' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Học Kỳ 2</button>
                                  <button onClick={() => setSemesterMode('year')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${semesterMode === 'year' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Cả Năm</button>
                              </div>
                          </div>
                          <div className="mb-4 text-center bg-blue-50 text-blue-800 p-3 rounded text-sm">
                              {semesterMode === 's1' && <span><strong>Học Kỳ 1:</strong> Tính từ Tuần 1 đến Tuần {settings.semesterTwoStartWeek - 1}</span>}
                              {semesterMode === 's2' && <span><strong>Học Kỳ 2:</strong> Tính từ Tuần {settings.semesterTwoStartWeek} trở đi</span>}
                              {semesterMode === 'year' && <span><strong>Cả Năm:</strong> Tổng hợp tất cả các tuần đã nhập</span>}
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse border rounded-lg overflow-hidden">
                                  <thead className="bg-indigo-600 text-white text-sm">
                                      <tr><th className="p-3">Học sinh</th><th className="p-3 text-center">ĐTB (Gốc)</th><th className="p-3 text-center">ĐTB (Quy đổi)</th><th className="p-3 text-center">Xếp loại</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                      {activeStudents.map((s, idx) => {
                                          const result = calculateSemesterRank(s, semesterMode);
                                          return (
                                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                  <td className="p-3 font-medium">{s.name}</td>
                                                  <td className="p-3 text-center text-gray-600">{result.avgRaw}</td>
                                                  <td className="p-3 text-center font-bold text-indigo-600">{result.avgConverted}</td>
                                                  <td className="p-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRankColor(result.rank)}`}>{result.rank}</span></td>
                                              </tr>
                                          )
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          </div>
    );
};

export default StatsView;
