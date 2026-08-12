import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from "../config/api";
import {
  mergeInterviewCache,
  readInterviewCache,
  subscribeInterviewCache,
} from "../services/interviewStore";

const formatLabel = (value) => {
  if (!value) return 'General';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildTracker = (items) => {
  const totalSessions = items.length;
  const averageScore = totalSessions
    ? Math.round(items.reduce((sum, item) => sum + (item.score || 0), 0) / totalSessions)
    : 0;

  const latestScore = totalSessions ? items[0].score || 0 : 0;
  const bestScore = totalSessions ? Math.max(...items.map((item) => item.score || 0)) : 0;

  const domainMap = {};
  const difficultyMap = {};
  const improvementMap = {};
  const strengthMap = {};

  items.forEach((item) => {
    const domainKey = item.domain || 'General';
    const difficultyKey = item.difficulty || 'medium';

    if (!domainMap[domainKey]) {
      domainMap[domainKey] = { sessions: 0, totalScore: 0 };
    }
    domainMap[domainKey].sessions += 1;
    domainMap[domainKey].totalScore += item.score || 0;

    difficultyMap[difficultyKey] = (difficultyMap[difficultyKey] || 0) + 1;

    (item.improvements || []).forEach((point) => {
      const key = point.trim();
      if (key) improvementMap[key] = (improvementMap[key] || 0) + 1;
    });

    (item.strengths || []).forEach((point) => {
      const key = point.trim();
      if (key) strengthMap[key] = (strengthMap[key] || 0) + 1;
    });
  });

  const domainBreakdown = Object.entries(domainMap)
    .map(([domain, stats]) => ({
      domain,
      sessions: stats.sessions,
      averageScore: Math.round(stats.totalScore / stats.sessions),
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const difficultyBreakdown = ['easy', 'medium', 'hard'].map((level) => ({
    level,
    sessions: difficultyMap[level] || 0,
  }));

  const topImprovements = Object.entries(improvementMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  const topStrengths = Object.entries(strengthMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  const scoreTrend = [...items]
    .slice(0, 6)
    .reverse()
    .map((item, index) => ({
      label: `S${index + 1}`,
      score: item.score || 0,
      domain: item.domain || 'General',
    }));

  return {
    totalSessions,
    averageScore,
    latestScore,
    bestScore,
    domainBreakdown,
    difficultyBreakdown,
    topImprovements,
    topStrengths,
    scoreTrend,
  };
};

const SkillTracker = ({ token }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setError('');
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/interviews`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || 'Unable to load skill tracker.');
          return;
        }
        setItems(mergeInterviewCache(data.interviews || []));
      } catch (err) {
        setItems(readInterviewCache());
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInterviews();
    }
    const unsubscribe = subscribeInterviewCache((cachedItems) => {
      setItems(cachedItems);
    });
    return unsubscribe;
  }, [token]);

  const tracker = buildTracker(items);

  return (
    <section className="dashboard">
      <div className="tracker-hero">
        <div>
          <h1>Skill Tracker</h1>
          <p className="helper">
            Track your growth across interview sessions, domain performance, and coaching themes.
          </p>
        </div>
      </div>

      {loading && <div className="helper">Loading your progress...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="card">
          <h3>No interview data yet</h3>
          <p className="helper">
            Complete a mock interview first. Your communication trends and skill insights will show up here.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="tracker-summary-grid">
            <div className="tracker-stat">
              <span>Total Sessions</span>
              <strong>{tracker.totalSessions}</strong>
            </div>
            <div className="tracker-stat">
              <span>Average Score</span>
              <strong>{tracker.averageScore}/100</strong>
            </div>
            <div className="tracker-stat">
              <span>Latest Score</span>
              <strong>{tracker.latestScore}/100</strong>
            </div>
            <div className="tracker-stat">
              <span>Best Score</span>
              <strong>{tracker.bestScore}/100</strong>
            </div>
          </div>

          <div className="tracker-layout tracker-layout-featured">
            <div className="card tracker-chart-card">
              <div className="tracker-section-head">
                <div>
                  <h3>Progress Trend</h3>
                  <p className="helper">Recent interview scores across your last saved sessions.</p>
                </div>
              </div>
              <div className="trend-chart">
                {tracker.scoreTrend.map((point) => (
                  <div key={`${point.label}-${point.domain}`} className="trend-point">
                    <div className="trend-bar-shell">
                      <div className="trend-bar-fill" style={{ height: `${Math.max(point.score, 8)}%` }} />
                    </div>
                    <strong>{point.score}</strong>
                    <span>{point.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card tracker-chart-card">
              <div className="tracker-section-head">
                <div>
                  <h3>Interview Readiness</h3>
                  <p className="helper">A quick snapshot based on your saved interview performance.</p>
                </div>
              </div>
              <div className="readiness-layout">
                <div
                  className="readiness-ring"
                  style={{
                    background: `conic-gradient(var(--accent) 0deg ${tracker.averageScore * 3.6}deg, rgba(255, 255, 255, 0.08) ${tracker.averageScore * 3.6}deg 360deg)`,
                  }}
                >
                  <div className="readiness-center">
                    <strong>{tracker.averageScore}</strong>
                    <span>Avg Score</span>
                  </div>
                </div>
                <div className="readiness-copy">
                  <div className="readiness-line">
                    <span>Latest performance</span>
                    <strong>{tracker.latestScore}/100</strong>
                  </div>
                  <div className="readiness-line">
                    <span>Best performance</span>
                    <strong>{tracker.bestScore}/100</strong>
                  </div>
                  <div className="readiness-line">
                    <span>Most practiced domain</span>
                    <strong>{tracker.domainBreakdown[0]?.domain || 'General'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="tracker-layout">
            <div className="card">
              <h3>Domain Performance</h3>
              <div className="tracker-stack">
                {tracker.domainBreakdown.map((item) => (
                  <div key={item.domain} className="tracker-row">
                    <div>
                      <strong>{item.domain}</strong>
                      <p className="helper">{item.sessions} session(s)</p>
                    </div>
                    <div className="tracker-score-chip">{item.averageScore}/100</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Difficulty Coverage</h3>
              <div className="tracker-stack">
                {tracker.difficultyBreakdown.map((item) => (
                  <div key={item.level} className="difficulty-meter">
                    <div className="difficulty-meta">
                      <strong>{formatLabel(item.level)}</strong>
                      <span>{item.sessions} session(s)</span>
                    </div>
                    <div className="difficulty-bar">
                      <div
                        className="difficulty-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            tracker.totalSessions ? (item.sessions / tracker.totalSessions) * 100 : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tracker-layout">
            <div className="card">
              <h3>Top Strengths</h3>
              <div className="tracker-stack">
                {tracker.topStrengths.length > 0 ? (
                  tracker.topStrengths.map((item) => (
                    <div key={item.label} className="insight-pill">
                      <span>{item.label}</span>
                      <strong>{item.count}x</strong>
                    </div>
                  ))
                ) : (
                  <p className="helper">Strength patterns will appear after a few saved interviews.</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Focus Areas</h3>
              <div className="tracker-stack">
                {tracker.topImprovements.length > 0 ? (
                  tracker.topImprovements.map((item) => (
                    <div key={item.label} className="insight-pill warning">
                      <span>{item.label}</span>
                      <strong>{item.count}x</strong>
                    </div>
                  ))
                ) : (
                  <p className="helper">Improvement themes will appear after a few saved interviews.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default SkillTracker;
