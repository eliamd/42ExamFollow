'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from './components/AuthProvider';

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<string[]>([]);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery && !students.includes(searchQuery)) {
      setStudents([...students, searchQuery]);
      setSearchQuery('');
    }
  };

  const handleStartTracking = () => {
    if (students.length > 0) {
      const queryString = students.join(',');
      window.location.href = `/tracking?students=${queryString}`;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            42 Eval Viewer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Connectez-vous avec votre compte 42 pour commencer
          </p>
          <button
            onClick={() => login()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Se connecter avec 42
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            42 Eval Viewer
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Suivez la progression des étudiants en temps réel
          </p>
        </div>

        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Login de l'étudiant..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </form>

        {students.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {students.map((student) => (
                <span
                  key={student}
                  className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {student}
                  <button
                    type="button"
                    onClick={() => setStudents(students.filter((s) => s !== student))}
                    className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={handleStartTracking}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Commencer le suivi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}