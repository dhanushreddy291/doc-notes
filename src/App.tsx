import { useEffect, useState } from 'react';
import { AccountView, AuthView, RedirectToSignIn, SignedIn } from '@neondatabase/auth-ui';
import { api } from './api';
import { Route, Routes, useParams } from 'react-router';
import { type Document } from './db/schema';

function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);

  const refresh = () => {
    api
      .getDocuments()
      .then(setDocuments)
      .catch(console.error);
  };

  useEffect(refresh, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await api.uploadDocument(data);
    form.reset();
    refresh();
  };

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">DocNotes</h1>

      <SignedIn>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="file"
            name="file"
            accept=".txt"
            required
            className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white text-sm text-gray-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-white hover:border-gray-400"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 sm:w-auto"
          >
            Upload and summarize
          </button>
        </form>

        <ul className="space-y-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow"
            >
              <p className="font-medium text-gray-900">{doc.filename}</p>
              <p className="mt-1 text-sm text-gray-600">{doc.summary}</p>
            </li>
          ))}
        </ul>
      </SignedIn>

      <RedirectToSignIn />
    </main>
  );
}

function AuthViewWrapper() {
  const { pathname } = useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
      <AuthView pathname={pathname} />
    </div>
  );
}

function AccountPage() {
  const { pathname } = useParams();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
      <AccountView pathname={pathname} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Documents />} />
      <Route path="/auth/:pathname" element={<AuthViewWrapper />} />
      <Route path="/account/:pathname" element={<AccountPage />} />
    </Routes>
  );
}