// src/components/Login.js
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <i className="fas fa-church text-5xl text-indigo-700 mb-2"></i>
          <h2 className="text-2xl font-bold text-gray-800">Portail Fiangonana</h2>
          <p className="text-gray-500">"Izay olona mahatoky tokoa dia ho be fitahiana" (Ohab. 28:20a)</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>
          <div className="mb-6">
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3 rounded-lg transition">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}