// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from '../src/redux/store';
import AuthPage from '../src/pages/AuthPage';
import ChatPage from '../src/pages/ChatPage';
import ProtectedRoute from '../src/components/ProtectedRoute';
function App() {
  console.log(`${process.env.REACT_APP_FASTAPI_BASEURL}`);
  return (
    <Provider store={store}> {/* Wrap with Redux store */}
      <Router>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/chat" element={<ProtectedRoute element={ChatPage} />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;

