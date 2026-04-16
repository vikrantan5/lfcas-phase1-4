import React from 'react';
import { CheckCircle, Calendar as CalendarIcon } from 'lucide-react';

const mockCases = [
  {
    id: 'LFCT23456',
    clientName: 'Nida Khan',
    opponent: 'Faizan Malik',
    caseType: 'Divorce',
    stage: 'Hearing Today',
    stageClass: 'stage-hearing',
    hearingDate: 'Today 10:00..',
    hearingIcon: true,
    status: 'Complete',
  },
  {
    id: 'LFCT23401',
    clientName: 'Sakshi Verma',
    opponent: 'Amit Verma',
    caseType: 'Divorce',
    stage: 'Court Response',
    stageClass: 'stage-response',
    hearingDate: 'Today, 10:00 AM',
    hearingIcon: false,
    status: 'Complete',
  },
  {
    id: 'LFCT23356',
    clientName: 'Priya Kapoor',
    opponent: 'Supett Kaporce',
    caseType: 'Divorce',
    stage: 'Awaiting Documents',
    stageClass: 'stage-documents',
    hearingDate: '',
    hearingIcon: false,
    status: 'Complete',
  },
  {
    id: 'LFCT23345',
    clientName: 'Kunal Gupta',
    opponent: 'Nona Guple',
    caseType: 'Divorce',
    stage: 'Filed',
    stageClass: 'stage-filed',
    hearingDate: 'Today : 1.° m.',
    hearingIcon: false,
    status: '',
  },
];

const OngoingCasesTable = ({ cases = [] }) => {
  const displayCases = cases.length > 0 ? cases.map(c => ({
    id: c.id?.slice(0, 10) || 'LFCT00000',
    clientName: c.client?.full_name || 'Client',
    opponent: '',
    caseType: c.case_type ? c.case_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Divorce',
    stage: c.current_stage || 'Filed',
    stageClass: getStageClass(c.current_stage),
    hearingDate: '',
    hearingIcon: false,
    status: c.status === 'closed' ? 'Complete' : '',
  })) : mockCases;

  return (
    <div className="dash-card" data-testid="ongoing-cases-table">
      <div className="card-header">
        <h3>Ongoing Cases</h3>
      </div>
      <div className="card-body" style={{ padding: '0 22px 18px', overflowX: 'auto' }}>
        <table className="cases-table" data-testid="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Clients Names</th>
              <th>Case Type</th>
              <th>Stage</th>
              <th>Hearing Date</th>
              <th>Case Status</th>
            </tr>
          </thead>
          <tbody>
            {displayCases.map((c, i) => (
              <tr key={c.id + i} data-testid={`case-row-${i}`}>
                <td style={{ fontWeight: 600, color: '#1A0A3E' }}>{c.id}</td>
                <td>
                  <span style={{ fontWeight: 600, color: '#1A0A3E' }}>{c.clientName}</span>
                  {c.opponent && (
                    <span style={{ color: '#888', fontWeight: 400 }}> vs. {c.opponent}</span>
                  )}
                </td>
                <td>{c.caseType}</td>
                <td>
                  <span className={`stage-badge ${c.stageClass}`}>{c.stage}</span>
                  {c.hearingIcon && (
                    <span style={{ marginLeft: 6 }}>
                      <CalendarIcon size={12} color="#E65100" style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </span>
                  )}
                </td>
                <td style={{ color: '#666' }}>{c.hearingDate || '—'}</td>
                <td>
                  {c.status === 'Complete' && (
                    <span className="status-complete" data-testid={`status-complete-${i}`}>
                      <CheckCircle size={14} />
                      Complete
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function getStageClass(stage) {
  if (!stage) return 'stage-filed';
  const s = stage.toLowerCase();
  if (s.includes('hearing')) return 'stage-hearing';
  if (s.includes('court') || s.includes('response')) return 'stage-response';
  if (s.includes('document') || s.includes('awaiting')) return 'stage-documents';
  return 'stage-filed';
}

export default OngoingCasesTable;
