import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <section className="hero">
      <div>
        <h1>
          Master your interviews with AI that feels like a real coach.
        </h1>
        <p>
          NextStep AI simulates real interview pressure, gives instant feedback,
          and builds a personalized prep roadmap across your target domains.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Link className="button primary" to="/register">
            Start Practicing
          </Link>
          <Link className="button outline" to="/login">
            I already have an account
          </Link>
        </div>
        <div className="metrics">
          <div className="metric">
            <span>Mock sessions</span>
            <strong>50+ formats</strong>
          </div>
          <div className="metric">
            <span>Realtime feedback</span>
            <strong>2 min avg</strong>
          </div>
          <div className="metric">
            <span>Skill growth</span>
            <strong>+38% scores</strong>
          </div>
        </div>
      </div>
      <div className="hero-card">
        <h2>Tonight's Prep Plan</h2>
        <p className="helper">Personalized by your target role.</p>
        <div className="feature-grid">
          <div className="feature">
            <h3>Live Interview</h3>
            <p className="helper">AI interviewer with adaptive difficulty.</p>
          </div>
          <div className="feature">
            <h3>Answer Coach</h3>
            <p className="helper">Structure + clarity + impact feedback.</p>
          </div>
          <div className="feature">
            <h3>Skill Heatmap</h3>
            <p className="helper">Spot gaps before the real call.</p>
          </div>
          <div className="feature">
            <h3>Domain Packs</h3>
            <p className="helper">Tech, HR, Product, Finance & more.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Landing;
