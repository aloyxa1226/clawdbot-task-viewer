import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
