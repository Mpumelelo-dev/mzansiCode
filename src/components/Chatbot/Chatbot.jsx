import React, { useState } from 'react';
import './Chatbot.scss';

export default function Chatbot({ mapCenter,crimeCount}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState([
    { from: 'bot', text: 'Hi! Ask me about safety in Mzansi.' }
  ]);
  const [input, setInput] = useState('');

  async function send() {
    if (!input.trim()) return;
  
    const userMsg = { from: 'user', text: input };
    setHistory(h => [...h, userMsg]);
    setInput('');

    const res = await fetch('http://localhost:5000/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        question: input,
        lat: mapCenter.lat,
        lng: mapCenter.lng,
        radiusKm: 1,
        crimeCount: crimeCount
      })
    });
    const { answer } = await res.json();

    setHistory(h => [...h, { from:'bot', text: answer }]);
  }

  return (
    <div className={`chatbot-widget ${open?'open':''}`}>
      <button className="chatbot-toggle" onClick={()=>setOpen(o=>!o)}>
        {open? '✖' : '💬'}
      </button>
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-history">
            {history.map((m,i)=>
              <div key={i} className={`chatbot-msg ${m.from}`}>
                {m.text}
              </div>
            )}
          </div>
          <div className="chatbot-input">
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter' && send()}
              placeholder="Is it safe here at 10 PM?"
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
