'use client';
import { useEffect, useState } from 'react';
import MatchCard from '../MatchCard';

export default function ResultsPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/football/results')
      .then(res => res.json())
      .then(data => {
        setMatches(data.response || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loader"></div>;

  return (
    <div>
      <h1 className="page-title">Results</h1>
      {matches.length === 0 && <div className="error-msg">No finished matches found.</div>}
      
      {matches.length > 0 && (
        <div className="league-bar">
          <span>⚽ Final Scores</span>
        </div>
      )}
      <div>
        {matches.map(m => <MatchCard key={m.fixture.id} match={m} />)}
      </div>
    </div>
  );
}
