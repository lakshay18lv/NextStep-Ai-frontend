import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from "../config/api";
import {
  clearInterviewCache,
  mergeInterviewCache,
  readInterviewCache,
  subscribeInterviewCache,
} from "../services/interviewStore";

const FeedbackStudio = ({ token }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openIndex, setOpenIndex] = useState(null);
  const [clearing, setClearing] = useState(false);

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
        setError(data.message || 'Unable to load feedback.');
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

  useEffect(() => {
    if (token) {
      fetchInterviews();
    }
    const unsubscribe = subscribeInterviewCache((cachedItems) => {
      setItems(cachedItems);
    });
    return unsubscribe;
  }, [token]);

  const handleClear = async () => {
    if (!token) return;
    const confirmed = window.confirm('Clear your entire interview history? This cannot be undone.');
    if (!confirmed) return;

    try {
      setError('');
      setClearing(true);
      const res = await fetch(`${API_BASE_URL}/api/interviews`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to clear history.');
        return;
      }
      setItems([]);
      setOpenIndex(null);
      clearInterviewCache();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="dashboard">
      <div className="feedback-top">
        <div>
          <h1>Feedback Studio</h1>
          <p className="helper">
            Review your past mock interviews, answers, and coaching insights.
          </p>
        </div>
        <button className="button outline" onClick={handleClear} disabled={clearing}>
          {clearing ? 'Clearing...' : 'Clear History'}
        </button>
      </div>

      {loading && <div className="helper">Loading feedback...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="card">
          <h3>No interviews yet</h3>
          <p className="helper">Complete a mock interview to see feedback here.</p>
        </div>
      )}

      <div className="feedback-grid">
        {items.map((item, index) => (
          <div key={item._id || index} className="card">
            <div className="feedback-header">
              <div>
                <h3>{item.domain}</h3>
                <p className="helper">Difficulty: {item.difficulty}</p>
              </div>
              <div className="score-pill">Score {item.score}</div>
            </div>
            <p>{item.feedback}</p>
            <div className="feedback-actions">
              <button
                className="button outline"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                {openIndex === index ? 'Hide Details' : 'View Questions & Answers'}
              </button>
            </div>

            {openIndex === index && (
              <div className="qa-list">
                {(item.questions || []).map((question, qIndex) => (
                  <div key={`${item._id || index}-${qIndex}`} className="qa-item">
                    <strong>Q{qIndex + 1}:</strong> {question}
                    <div className="helper">A: {item.answers?.[qIndex] || 'No answer saved.'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeedbackStudio;
