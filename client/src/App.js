import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, TextField, Button, List, ListItem, ListItemText, Typography, Box, Paper, Snackbar, Alert } from '@mui/material';

function App() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (sessionId) {
      fetchChatHistory(sessionId);
    }
  }, [sessionId]);

  const startNewSession = async () => {
    if (!email.trim()) {
      alert('Please enter an email');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/session', { email_id: email });
      if (response.data.sessions) {
        setSessions(response.data.sessions);
      } else {
        setSessionId(response.data.session_id);
        setSessions([response.data]);
      }
    } catch (error) {
      console.error('Error starting new session:', error);
      setSnackbarMessage('Error starting new session');
      setSnackbarOpen(true);
    }
  };

  const fetchChatHistory = async (sessionId) => {
    try {
      const response = await axios.get(`http://localhost:8000/history/${sessionId}`);
      setMessages(response.data.map(msg => ({
        role: msg.role === 'human' ? 'user' : 'bot',
        content: msg.message,
      })));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setSnackbarMessage('Error fetching chat history');
      setSnackbarOpen(true);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    setTyping(true);
    setMessage('');

    try {
      const response = await axios.post('http://localhost:8000/chat', { text: message, session_id: sessionId });
      const botMessage = { role: 'bot', content: response.data.reply };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setSnackbarMessage('Error sending message');
      setSnackbarOpen(true);
    } finally {
      setTyping(false);
    }
  };

  const formatMessageContent = (role, content) => {
    const formattedContent = content.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Typography key={index} variant="h6" component="span" style={{ fontWeight: 'bold' }}>
            {part.slice(2, -2)}
          </Typography>
        );
      }
      return <Typography key={index} variant="body1" component="span">{part}</Typography>;
    });

    return (
      <Paper
        elevation={3}
        style={{
          padding: '10px',
          backgroundColor: role === 'bot' ? '#f1f1f1' : '#d1e7ff',
          maxWidth: '75%',
          alignSelf: role === 'bot' ? 'flex-start' : 'flex-end',
        }}
      >
        {role === 'bot' && (
          <>
            <Typography variant="h6" component="div"><strong>Answer:</strong></Typography>
            <Typography variant="body1" component="div" style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
              {formattedContent}
            </Typography>
          </>
        )}
        {role === 'user' && (
          <Typography variant="body1" component="div" style={{ whiteSpace: 'pre-wrap' }}>
            {content}
          </Typography>
        )}
      </Paper>
    );
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Chatbot
      </Typography>
      <TextField
        label="Email"
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: '10px' }}
      />
      <Button variant="contained" color="primary" onClick={startNewSession} style={{ marginBottom: '10px' }}>
        Start New Session
      </Button>
      <Box display="flex">
        <Box flex={1} mr={2}>
          <Typography variant="h6">Sessions</Typography>
          <List>
            {sessions.map((session) => (
              <ListItem
                key={session.session_id}
                button
                onClick={() => setSessionId(session.session_id)}
              >
                <ListItemText primary={`Session started at: ${session.started_at}`} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Box flex={3}>
          <Box display="flex" flexDirection="column" alignItems="stretch" minHeight="60vh" maxHeight="60vh" overflow="auto" mb={2}>
            <List>
              {messages.map((msg, index) => (
                <ListItem key={index} style={{ display: 'flex', justifyContent: msg.role === 'bot' ? 'flex-start' : 'flex-end' }}>
                  <ListItemText primary={formatMessageContent(msg.role, msg.content)} />
                </ListItem>
              ))}
              {typing && (
                <ListItem style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <ListItemText
                    primary={<Typography variant="body1" component="div" style={{ fontStyle: 'italic' }}>Typing...</Typography>}
                  />
                </ListItem>
              )}
            </List>
          </Box>
          <TextField
            label="Type your message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <Button variant="contained" color="primary" onClick={handleSend} style={{ marginTop: '10px' }}>
            Send
          </Button>
        </Box>
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
