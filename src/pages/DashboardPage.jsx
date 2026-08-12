import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { prependInterviewCache } from "../services/interviewStore";

const analyzeAnswer = (answer) => {
  const text = answer.trim();
  if (!text) return 0;

  const letters = text.replace(/[^a-zA-Z]/g, "");
  const vowels = letters.match(/[aeiou]/gi)?.length || 0;
  const vowelRatio = letters.length ? vowels / letters.length : 0;

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueRatio = wordCount
    ? new Set(words.map((w) => w.toLowerCase())).size / wordCount
    : 0;

  let score = 0;
  if (wordCount >= 80) score += 30;
  else if (wordCount >= 40) score += 20;
  else if (wordCount >= 20) score += 10;

  if (uniqueRatio >= 0.45) score += 15;
  else if (uniqueRatio >= 0.3) score += 10;

  if (/\d/.test(text)) score += 10;
  if (/(situation|task|action|result)/i.test(text)) score += 10;

  if (vowelRatio < 0.2 && letters.length > 12) score -= 15;
  if (/(.)\1{4,}/.test(text)) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
};

const buildFeedbackSummary = ({
  answeredCount,
  total,
  difficulty,
  domain,
  answers,
}) => {
  const answerTexts = Object.values(answers).filter((a) => a?.trim());
  const avgLength = answerTexts.length
    ? Math.round(
        answerTexts.reduce((sum, a) => sum + a.trim().length, 0) /
          answerTexts.length,
      )
    : 0;

  const qualityScores = answerTexts.map(analyzeAnswer);
  const avgQuality = qualityScores.length
    ? Math.round(
        qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length,
      )
    : 0;

  const strengths = [];
  const improvements = [];

  if (answeredCount === total) {
    strengths.push("You completed every question without skipping.");
  } else if (answeredCount >= Math.ceil(total * 0.7)) {
    strengths.push("You attempted most questions with steady effort.");
    improvements.push(
      "Aim to complete all questions to build full interview stamina.",
    );
  } else {
    improvements.push(
      "Try to complete more questions to improve interview endurance.",
    );
  }

  if (avgLength >= 250) {
    strengths.push("Your answers include strong detail and context.");
  } else if (avgLength >= 140) {
    strengths.push("Your answers have a healthy level of detail.");
    improvements.push(
      "Add measurable outcomes to make responses more impactful.",
    );
  } else {
    improvements.push(
      "Expand your answers with STAR structure: Situation, Task, Action, Result.",
    );
  }

  if (avgQuality >= 70) {
    strengths.push("Responses show good structure and clarity.");
  } else if (avgQuality >= 50) {
    strengths.push("Responses are on the right track.");
    improvements.push(
      "Increase clarity and add specific outcomes to strengthen your answers.",
    );
  } else {
    improvements.push(
      "Your answers need more clarity and detail; avoid random or very short responses.",
    );
  }

  if (!strengths.length) {
    strengths.push("You stayed engaged with the interview flow.");
  }
  if (!improvements.length) {
    improvements.push("Refine your examples with clearer impact statements.");
  }

  const summary = `You completed ${answeredCount}/${total} questions in the ${domain} track. Your responses show a ${difficulty} level depth.`;

  return {
    summary,
    strengths,
    improvements,
    avgQuality,
  };
};

const Dashboard = ({ user, token }) => {
  const [showInterview, setShowInterview] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [domain, setDomain] = useState("Software Engineering");
  const [resumeText, setResumeText] = useState("");
  const [resumeNote, setResumeNote] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");

  const hasInterview = questions.length > 0;
  const questionList = useMemo(() => questions, [questions]);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeNote("");

    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md")
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        setResumeText(String(reader.result || ""));
      };
      reader.readAsText(file);
    } else {
      setResumeNote(
        "Resume uploaded. For best results, paste resume text below.",
      );
    }
  };

  const startInterview = async () => {
    if (!token) {
      setResumeNote("Please log in to generate questions.");
      return;
    }

    try {
      setGenerating(true);
      setGenerationStatus("");
      const res = await fetch(`${API_BASE_URL}/api/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeText, difficulty, domain }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResumeNote(data.message || "Unable to generate questions.");
        setGenerationStatus("");
        return;
      }

      setQuestions(data.questions || []);
      if (data.source === "openai") {
        setGenerationStatus("Questions generated with OpenAI.");
      }
      setAnswers({});
      setCurrentIndex(0);
      setFeedback(null);
      setSaveError("");
    } catch (err) {
      setResumeNote("Network error. Please try again.");
      setGenerationStatus("");
    } finally {
      setGenerating(false);
    }
  };

  const endInterview = async () => {
    const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;

    const details = buildFeedbackSummary({
      answeredCount,
      total: questionList.length,
      difficulty,
      domain,
      answers,
    });

    const feedbackPayload = {
      score: details.avgQuality,
      feedback: `${details.summary}\nStrengths: ${details.strengths.join(" | ")}\nImprovements: ${details.improvements.join(" | ")}`,
      domain,
      difficulty,
      questions: questionList,
      answers: questionList.map((_, index) => answers[index] || ""),
      summary: details.summary,
      strengths: details.strengths,
      improvements: details.improvements,
    };

    setFeedback({
      score: details.avgQuality,
      summary: details.summary,
      strengths: details.strengths,
      improvements: details.improvements,
    });

    if (token) {
      try {
        setSaveError("");
        setSaving(true);
        const res = await fetch(`${API_BASE_URL}/api/interviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(feedbackPayload),
        });

        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.message || "Unable to save feedback.");
        } else if (data?.interview) {
          prependInterviewCache(data.interview);
          setSaveError("");
        } else {
          setSaveError("Save completed but no interview data was returned.");
        }
      } catch (err) {
        setSaveError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  };

  const resetInterview = () => {
    setQuestions([]);
    setAnswers({});
    setFeedback(null);
    setSaveError("");
    setGenerationStatus("");
  };

  return (
    <section className="dashboard">
      <h1>Welcome {user?.name || "Candidate"}</h1>
      <p className="helper">
        Your AI coach is ready. Start a mock interview or review your latest
        feedback.
      </p>

      <div className="card-grid">
        <button
          className="card card-action"
          onClick={() => setShowInterview(true)}
        >
          <h3>Start Mock Interview</h3>
          <p className="helper">
            Practice with a domain-specific AI interviewer.
          </p>
        </button>
        <Link className="card card-action" to="/feedback">
          <h3>Feedback Studio</h3>
          <p className="helper">
            Analyze tone, clarity, and impact of your responses.
          </p>
        </Link>
        <Link className="card card-action" to="/skills">
          <h3>Skill Tracker</h3>
          <p className="helper">
            Track progress across communication and problem-solving.
          </p>
        </Link>
      </div>

      <div className="dashboard-footer">
        Powered by NextStep AI • Practice smarter, improve faster.
      </div>

      {showInterview && (
        <div className="modal-backdrop" onClick={() => setShowInterview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Mock Interview Setup</h2>
                <p className="helper">
                  Choose difficulty and add your resume for personalized
                  questions.
                </p>
              </div>
              <button
                className="button outline"
                onClick={() => setShowInterview(false)}
              >
                Close
              </button>
            </div>

            {!hasInterview && (
              <div className="form-grid">
                <label className="field">
                  <span>Difficulty level</span>
                  <select
                    className="input"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label className="field">
                  <span>Target domain</span>
                  <input
                    className="input"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Software Engineering, Product, HR"
                  />
                </label>
                <label className="field">
                  <span>Upload resume</span>
                  <input className="input" type="file" onChange={handleFile} />
                  {resumeNote && <div className="helper">{resumeNote}</div>}
                </label>
                <label className="field full">
                  <span>Paste resume text (recommended)</span>
                  <textarea
                    className="input"
                    rows="5"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume highlights to generate relevant questions..."
                  />
                </label>
                <button
                  className="button primary"
                  onClick={startInterview}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate Questions"}
                </button>
                {generationStatus && (
                  <div className="helper full">{generationStatus}</div>
                )}
              </div>
            )}

            {hasInterview && (
              <div className="interview-flow">
                <div className="question-header">
                  <span className="badge">
                    Question {currentIndex + 1} of {questionList.length}
                  </span>
                  <span className="badge muted">
                    {difficulty.toUpperCase()} • {domain}
                  </span>
                </div>
                <h3>{questionList[currentIndex]}</h3>
                <textarea
                  className="input"
                  rows="5"
                  value={answers[currentIndex] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentIndex]: e.target.value,
                    }))
                  }
                  placeholder="Type your answer here..."
                />
                <div className="nav-row">
                  <button
                    className="button outline"
                    onClick={() =>
                      setCurrentIndex((prev) => Math.max(prev - 1, 0))
                    }
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </button>
                  {currentIndex < questionList.length - 1 ? (
                    <button
                      className="button primary"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          Math.min(prev + 1, questionList.length - 1),
                        )
                      }
                    >
                      Next Question
                    </button>
                  ) : (
                    <button className="button primary" onClick={endInterview}>
                      End Interview
                    </button>
                  )}
                </div>

                {feedback && (
                  <div className="feedback-card">
                    <h3>Interview Feedback</h3>
                    <p className="helper">Score: {feedback.score} / 100</p>
                    <p>{feedback.summary}</p>
                    <div className="feedback-split">
                      <div>
                        <h4>What went well</h4>
                        <ul className="feedback-list">
                          {feedback.strengths.map((item, index) => (
                            <li key={`strength-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Needs improvement</h4>
                        <ul className="feedback-list">
                          {feedback.improvements.map((item, index) => (
                            <li key={`improve-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="helper">
                      {saving
                        ? "Saving feedback..."
                        : saveError
                          ? saveError
                          : "Feedback saved."}
                    </div>
                    <button className="button outline" onClick={resetInterview}>
                      Start New Interview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
