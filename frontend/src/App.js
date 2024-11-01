// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux'; // Import Redux provider
import store from '../src/redux/store'; // Import Redux store
import AuthPage from '../src/pages/AuthPage';
import ChatPage from '../src/pages/ChatPage'; // Your protected chat component
import ProtectedRoute from '../src/components/ProtectedRoute'; // Import ProtectedRoute component

function App() {
  return (
    <Provider store={store}> {/* Wrap with Redux store */}
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          {/* Wrap the chat route with ProtectedRoute */}
          <Route path="/chat" element={<ProtectedRoute element={ChatPage} />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;

