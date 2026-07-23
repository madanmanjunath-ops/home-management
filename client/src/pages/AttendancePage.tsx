import { api } from '../api'
import { useData } from '../store'
import { Avatar, Card, PageHeader, StatusPill } from '../components/ui'
import { longDate } from '../lib/format'

export function AttendancePage() {
  const data = useData()

  const onLeave = (staffId: string) =>
    data.leaves.some(
      (l) =>
        l.staffId === staffId &&
        l.status === 'Approved' &&
        l.startDate <= data.today &&
        data.today <= l.endDate
    )

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle={`Today · ${longDate(data.today)}`}
        action={
          <button className="button" onClick={() => api.checkAll()}>
            Check in everyone
          </button>
        }
      />

      <Card>
        <table className="table">
          <thead>
            <tr>
              <th>STAFF</th>
              <th>STATUS</th>
              <th>CHECK-IN</th>
              <th>CHECK-OUT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((s) => {
              const record = data.attendance.find((a) => a.staffId === s.id)
              const leave = onLeave(s.id)
              return (
                <tr key={s.id}>
                  <td>
                    <div className="cell-name">
                      <Avatar staff={s} />
                      <strong>{s.name}</strong>
                    </div>
                  </td>
                  <td>
                    {leave ? (
                      <StatusPill label="On leave" tone="neutral" />
                    ) : record ? (
                      <StatusPill
                        label={record.checkOut ? 'Left' : 'Present'}
                        tone={record.checkOut ? 'neutral' : 'green'}
                      />
                    ) : (
                      <StatusPill label="Not checked in" tone="late" />
                    )}
                  </td>
                  <td>{record?.checkIn ?? '—'}</td>
                  <td>{record?.checkOut ?? '—'}</td>
                  <td>
                    {leave ? (
                      <span className="small">Approved leave</span>
                    ) : !record ? (
                      <button className="text-button" onClick={() => api.checkIn(s.id)}>
                        Check in
                      </button>
                    ) : !record.checkOut ? (
                      <button className="text-button" onClick={() => api.checkOut(s.id)}>
                        Check out
                      </button>
                    ) : (
                      <span className="small">Done for today</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.staff.length === 0 && <div className="empty">Add staff to track attendance.</div>}
      </Card>
    </>
  )
}
