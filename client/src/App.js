import React, { useState } from 'react';
import axios from 'axios';
import { Container, TextField, Button, List, ListItem, ListItemText, Typography, Box, Paper } from '@mui/material';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const startNewSession = async () => {
    try {
      const response = await axios.post('http://localhost:8000/session');
      setSessionId(response.data.session_id);
    } catch (error) {
      console.error('Error starting new session:', error);
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
      <Button variant="contained" color="primary" onClick={startNewSession} style={{ marginBottom: '10px' }}>
        Start New Session
      </Button>
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
    </Container>
  );
}

export default App;
