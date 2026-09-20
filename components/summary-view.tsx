import type { MeetingSummary } from "@/lib/types";

interface SummaryViewProps {
  summary: MeetingSummary;
}

export function SummaryView({ summary }: SummaryViewProps) {
  const { summary: summaryText, decisions, actionItems, blockers, nextAgenda } = summary;

  return (
    <div className="space-y-6">
      {/* 요약 문단 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">요약</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{summaryText}</p>
      </div>

      {/* 결정 사항 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">결정 사항</h3>
        {decisions.length === 0 ? (
          <p className="text-gray-500">없음</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {decisions.map((decision, index) => (
              <li key={index} className="text-gray-700">
                {decision}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Item 표 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Action Item</h3>
        {actionItems.length === 0 ? (
          <p className="text-gray-500">없음</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    담당자
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    할 일
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    기한
                  </th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item, index) => (
                  <tr key={index} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.assignee || "미정"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.task}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.dueDate || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 막힌 것 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">막힌 것</h3>
        {blockers.length === 0 ? (
          <p className="text-gray-500">없음</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {blockers.map((blocker, index) => (
              <li key={index} className="text-gray-700">
                {blocker}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 다음 안건 */}
      <div>
        <h3 className="text-lg font-semibold mb-2">다음 안건</h3>
        {nextAgenda.length === 0 ? (
          <p className="text-gray-500">없음</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {nextAgenda.map((item, index) => (
              <li key={index} className="text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
