import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-950/50 backdrop-blur">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FM</span>
              </div>
              <span className="text-xl font-bold text-white">FMMClassico</span>
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="text-slate-300 hover:text-white transition">
                Home
              </Link>
              <a href="https://docs.db.com" target="_blank" rel="noopener noreferrer" 
                 className="text-slate-300 hover:text-white transition">
                Docs
              </a>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-700 bg-slate-950/50 backdrop-blur mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400 text-sm">
            <p>Built with React, Vite, and Tailwind CSS. Powered by Base44.</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
