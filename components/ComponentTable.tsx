import type { SentimentComponent } from '@/types/sentiment';

function statusClass(component: SentimentComponent) {
  if (component.ok) return 'badge ok';
  if (!component.ok && component.weight_applied > 0) return 'badge warn';
  return 'badge error';
}

function formatWeight(value: number) {
  return value > 0 ? `${(value * 100).toFixed(0)}%` : '—';
}

export function ComponentTable({ components }: { components: SentimentComponent[] }) {
  return (
    <div className="table-wrapper">
      <table aria-label="Sentiment component breakdown">
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Status</th>
            <th scope="col">Normalized</th>
            <th scope="col">Weight</th>
            <th scope="col">Message</th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component.name}>
              <th scope="row">{component.name}</th>
              <td>
                <span className={statusClass(component)}>
                  {component.ok ? 'OK' : 'Unavailable'}
                </span>
              </td>
              <td>{component.ok ? Math.round(component.normalized) : '—'}</td>
              <td>{formatWeight(component.weight_applied)}</td>
              <td>{component.message ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
