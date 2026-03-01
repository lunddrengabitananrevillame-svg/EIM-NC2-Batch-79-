import React, { useEffect, useState } from "react";
import { formatCurrency } from "../lib/utils";
import { Search, ArrowUpDown } from "lucide-react";
import { Member, Contribution, Payment } from "../types";

interface MemberContributionSummary {
  memberId: number;
  memberName: string;
  studentId: string;
  contactInfo: string;
  contributions: {
    contributionId: number;
    contributionTitle: string;
    amountPaid: number;
    amountDue: number;
    status: "Paid" | "Partial" | "Unpaid";
  }[];
  totalPaid: number;
  totalDue: number;
}

export default function MemberContributions() {
  const [data, setData] = useState<MemberContributionSummary[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [membersRes, contributionsRes, paymentsRes] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/contributions"),
          fetch("/api/payments"),
        ]);

        const members: Member[] = await membersRes.json();
        const contributionsData: Contribution[] = await contributionsRes.json();
        const payments: Payment[] = await paymentsRes.json();

        setContributions(contributionsData);

        const summary: MemberContributionSummary[] = members.map((member) => {
          let memberTotalPaid = 0;
          let memberTotalDue = 0;

          const memberContributions = contributionsData.map((contribution) => {
            const memberPayments = payments.filter(
              (p) =>
                p.member_id === member.id && p.contribution_id === contribution.id
            );
            const amountPaid = memberPayments.reduce(
              (sum, p) => sum + p.amount_paid,
              0
            );
            const amountDue = contribution.amount_per_person;
            
            memberTotalPaid += amountPaid;
            memberTotalDue += amountDue;

            let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
            if (amountPaid >= amountDue) status = "Paid";
            else if (amountPaid > 0) status = "Partial";

            return {
              contributionId: contribution.id,
              contributionTitle: contribution.title,
              amountPaid,
              amountDue,
              status,
            };
          });

          return {
            memberId: member.id,
            memberName: member.name,
            studentId: member.student_id || "",
            contactInfo: member.contact_info || "",
            contributions: memberContributions,
            totalPaid: memberTotalPaid,
            totalDue: memberTotalDue,
          };
        });

        setData(summary);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' 
            ? a.memberName.localeCompare(b.memberName)
            : b.memberName.localeCompare(a.memberName);
        }
        if (sortConfig.key === 'total') {
          return sortConfig.direction === 'asc'
            ? a.totalPaid - b.totalPaid
            : b.totalPaid - a.totalPaid;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const filteredData = sortedData.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.memberName.toLowerCase().includes(searchLower) ||
      item.studentId.toLowerCase().includes(searchLower) ||
      item.contactInfo.toLowerCase().includes(searchLower)
    );
  });

  const columnTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    contributions.forEach(c => totals[c.id] = 0);
    let grandTotal = 0;
    
    filteredData.forEach(row => {
      row.contributions.forEach(c => {
        totals[c.contributionId] += c.amountPaid;
      });
      grandTotal += row.totalPaid;
    });
    
    return { totals, grandTotal };
  }, [filteredData, contributions]);

  const absoluteTotals = React.useMemo(() => {
    const totals: Record<number, number> = {};
    contributions.forEach(c => totals[c.id] = 0);
    let grandTotal = 0;
    
    data.forEach(row => {
      row.contributions.forEach(c => {
        totals[c.contributionId] += c.amountPaid;
      });
      grandTotal += row.totalPaid;
    });
    
    return { totals, grandTotal };
  }, [data, contributions]);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Contributions</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all member payments across contributions</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, ID, or contact..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-gray-600 font-semibold sm:sticky top-0 z-20 shadow-sm">
              <tr>
                <th 
                  className="px-4 py-4 sm:sticky left-0 bg-gray-50 z-30 border-b border-r border-gray-200 min-w-[200px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Member Name
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                {contributions.map((c) => (
                  <th key={c.id} className="px-4 py-4 text-center min-w-[140px] border-b border-gray-200">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-gray-900 line-clamp-1" title={c.title}>{c.title}</span>
                      <span className="text-xs font-normal text-gray-500 bg-gray-200/50 px-2 py-0.5 rounded-full">
                        {formatCurrency(c.amount_per_person)}
                      </span>
                    </div>
                  </th>
                ))}
                <th 
                  className="px-4 py-4 text-right sm:sticky right-0 bg-gray-50 z-30 border-b border-l border-gray-200 min-w-[120px] cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Total Paid
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((row) => (
                <tr key={row.memberId} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 font-medium text-gray-900 sm:sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-gray-100 shadow-[2px_0_5px_-4px_rgba(0,0,0,0.1)]">
                    {row.memberName}
                  </td>
                  {row.contributions.map((c) => (
                    <td key={c.contributionId} className="px-4 py-3 text-center border-r border-gray-50 last:border-r-0">
                      <div className={`inline-flex flex-col items-center justify-center w-full py-1.5 rounded-md text-xs font-medium transition-all ${
                        c.status === "Paid" 
                          ? "bg-green-50 text-green-700 border border-green-200/50" 
                          : c.status === "Partial" 
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-200/50" 
                            : "text-gray-400"
                      }`}>
                        {c.status === "Unpaid" ? (
                          <span className="text-gray-300">-</span>
                        ) : (
                          <>
                            <span className="font-semibold">{formatCurrency(c.amountPaid)}</span>
                            {c.status === "Partial" && (
                              <span className="text-[10px] opacity-75 mt-0.5">
                                Bal: {formatCurrency(c.amountDue - c.amountPaid)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-bold text-blue-600 sm:sticky right-0 bg-white group-hover:bg-blue-50/30 z-10 border-l border-gray-100 shadow-[-2px_0_5px_-4px_rgba(0,0,0,0.1)]">
                    {formatCurrency(row.totalPaid)}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={contributions.length + 2} className="px-6 py-12 text-center text-gray-500 bg-gray-50/50">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-gray-300" />
                      <p>No members found matching "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold sticky bottom-0 z-20 shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.1)]">
              {searchTerm && (
                <tr className="bg-blue-50/50 text-sm">
                  <td className="px-4 py-3 sm:sticky left-0 bg-blue-50 z-30 border-t border-r border-blue-100 text-blue-900 italic">
                    Total (Filtered)
                  </td>
                  {contributions.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-center border-t border-blue-100 text-blue-700 italic">
                      {formatCurrency(columnTotals.totals[c.id] || 0)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right sm:sticky right-0 bg-blue-50 z-30 border-t border-l border-blue-100 text-blue-800 italic">
                    {formatCurrency(columnTotals.grandTotal)}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-100">
                <td className="px-4 py-4 sm:sticky left-0 bg-gray-100 z-30 border-t border-r border-gray-200 text-gray-900 uppercase tracking-wider text-xs">
                  Grand Total (All Members)
                </td>
                {contributions.map((c) => (
                  <td key={c.id} className="px-4 py-4 text-center border-t border-gray-200 text-green-700 text-base">
                    {formatCurrency(absoluteTotals.totals[c.id] || 0)}
                  </td>
                ))}
                <td className="px-4 py-4 text-right sm:sticky right-0 bg-gray-100 z-30 border-t border-l border-gray-200 text-blue-700 text-base">
                  {formatCurrency(absoluteTotals.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="bg-gray-50 border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between items-center">
          <span>Showing {filteredData.length} members</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span>Unpaid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
