import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsAPI } from '../api';
import { getUserRole } from '../auth';

interface Overview {
  clicks: { total: number; today: number; last7d: number; last30d: number };
  impressions: { total: number; today: number; last7d: number; last30d: number };
  uniqueBooksClicked: number;
  clicksBySource: { source: string; count: number }[];
}

interface TopBook {
  _id: string;
  bookTitle: string;
  authors?: string[];
  clicks: number;
  lastClicked?: string;
}

interface TopQuery {
  _id: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface DailyRow {
  _id: string;
  clicks: number;
}

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function Analytics() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = getUserRole();

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, tb, tq, dy] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getTopBooks(30, 20),
        analyticsAPI.getTopQueries(30, 20),
        analyticsAPI.getDaily(30),
      ]);
      setOverview(ov.data?.data || null);
      setTopBooks(tb.data?.data || []);
      setTopQueries(tq.data?.data || []);
      setDaily(dy.data?.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load analytics';
      setError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [role, fetchAll]);

  if (role !== 'admin') {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Admin access required</h2>
        <p className="text-muted-foreground">
          This dashboard is restricted. <Link to="/" className="text-primary hover:underline">Back to home</Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchAll} className="text-primary hover:underline">Retry</button>
      </div>
    );
  }

  const totalClicks = overview?.clicks.total ?? 0;
  const totalImpressions = overview?.impressions.total ?? 0;
  const overallCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const maxDaily = Math.max(1, ...daily.map((d) => d.clicks));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'rgb(30, 41, 59)' }}>Affiliate Analytics</h1>
        <p className="text-sm text-muted-foreground">Click-through funnel for Amazon affiliate revenue.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: totalClicks },
          { label: 'Clicks (30d)', value: overview?.clicks.last30d ?? 0 },
          { label: 'Unique Books Clicked', value: overview?.uniqueBooksClicked ?? 0 },
          { label: 'Overall CTR', value: fmtPct(overallCtr) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-bold" style={{ color: 'rgb(30, 41, 59)' }}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Clicks per day (last 30d)</CardTitle></CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No click data yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {daily.map((d) => (
                <div key={d._id} className="flex-1 flex flex-col items-center" title={`${d._id}: ${d.clicks} clicks`}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(d.clicks / maxDaily) * 140}px`,
                      backgroundColor: 'rgba(219, 205, 144, 0.8)',
                      minHeight: d.clicks > 0 ? '4px' : '2px',
                    }}
                  />
                  <span className="text-[9px] text-muted-foreground mt-1 rotate-90 origin-left whitespace-nowrap" style={{ display: 'none' }}>
                    {d._id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top books */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Top Books by Clicks</CardTitle></CardHeader>
        <CardContent>
          {topBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Book</th>
                  <th className="py-2">Author</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {topBooks.map((b) => (
                  <tr key={b._id} className="border-b last:border-0">
                    <td className="py-2">{b.bookTitle || b._id}</td>
                    <td className="py-2">{b.authors?.join(', ') || '—'}</td>
                    <td className="py-2 text-right font-semibold">{b.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Top queries / CTR */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Top Queries by CTR</CardTitle></CardHeader>
        <CardContent>
          {topQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No query data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Query / Category</th>
                  <th className="py-2 text-right">Impressions</th>
                  <th className="py-2 text-right">Clicks</th>
                  <th className="py-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q) => (
                  <tr key={q._id} className="border-b last:border-0">
                    <td className="py-2">{q._id}</td>
                    <td className="py-2 text-right">{q.impressions}</td>
                    <td className="py-2 text-right">{q.clicks}</td>
                    <td className="py-2 text-right font-semibold">{fmtPct(q.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Click breakdown by source */}
      {overview && overview.clicksBySource.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Clicks by Surface</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview.clicksBySource.map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-32 text-sm capitalize">{s.source.replace('-', ' ')}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${totalClicks > 0 ? (s.count / totalClicks) * 100 : 0}%`,
                        backgroundColor: 'rgb(219, 205, 144)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Analytics;
