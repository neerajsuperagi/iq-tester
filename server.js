const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware with CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // 200 for production, 1000 for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));



// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) {
    return res.redirect('/');
  }
  next();
};



// Routes
app.get('/', (req, res) => {
  const error = req.query.error;
  res.render('index', { error });
});

// Simple login - name and email only
app.post('/login/candidate', async (req, res) => {
  try {
    const { email, fullName } = req.body;
    
    if (!email || !fullName) {
      return res.render('index', { error: 'Please provide both name and email' });
    }
    
    // Check if user exists
    let result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;
    
    if (result.rows.length === 0) {
      // Create new user automatically
      const insertResult = await db.query(
        'INSERT INTO users (email, full_name, has_attempted) VALUES ($1, $2, FALSE) RETURNING *',
        [email, fullName]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      // Check if user has already attempted
      if (user.has_attempted) {
        return res.render('index', { error: 'You have already completed the test' });
      }
    }
    
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.full_name;
    
    // Redirect directly to test
    res.redirect('/test');
  } catch (error) {
    console.error('Login error:', error);
    res.render('index', { error: 'Login failed. Please try again.' });
  }
});

// Admin login
app.post('/login/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.render('index', { error: 'Invalid admin credentials' });
    }
    
    const admin = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.render('index', { error: 'Invalid admin credentials' });
    }
    
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.render('index', { error: 'Admin login failed. Please try again.' });
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});


// Test interface
app.get('/test', requireAuth, async (req, res) => {
  try {
    let sessionId = req.session.testSessionId;
    
    // Check if user has already completed test
    const user = await db.query('SELECT has_attempted FROM users WHERE id = $1', [req.session.userId]);
    if (user.rows.length > 0 && user.rows[0].has_attempted) {
      return res.redirect('/test-completed');
    }
    
    // Auto-create test session if none exists
    if (!sessionId) {
      const result = await db.query(
        'INSERT INTO test_sessions (user_id, current_question, answers) VALUES ($1, $2, $3) RETURNING *',
        [req.session.userId, 1, JSON.stringify({})]
      );
      sessionId = result.rows[0].id;
      req.session.testSessionId = sessionId;
    }
    
    const session = await db.query('SELECT * FROM test_sessions WHERE id = $1', [sessionId]);
    if (session.rows.length === 0) {
      // Session was deleted, create new one
      const result = await db.query(
        'INSERT INTO test_sessions (user_id, current_question, answers) VALUES ($1, $2, $3) RETURNING *',
        [req.session.userId, 1, JSON.stringify({})]
      );
      sessionId = result.rows[0].id;
      req.session.testSessionId = sessionId;
      const newSession = await db.query('SELECT * FROM test_sessions WHERE id = $1', [sessionId]);
      session.rows = newSession.rows;
    }
    
    const testSession = session.rows[0];
    const currentQuestion = testSession.current_question;
    const answers = testSession.answers || {};
    
    // Calculate remaining time
    const elapsed = Math.floor((Date.now() - new Date(testSession.start_time)) / 1000);
    const remainingTime = Math.max(0, testSession.time_limit - elapsed);
    
    if (remainingTime <= 0) {
      // Time's up, auto-submit
      return res.redirect('/submit-test');
    }
    
    res.render('test', {
      currentQuestion,
      answers,
      remainingTime,
      sessionId: testSession.id
    });
  } catch (error) {
    console.error('Test interface error:', error);
    res.redirect('/');
  }
});

// Get question data
app.get('/api/question/:number', requireAuth, async (req, res) => {
  try {
    const questionNumber = parseInt(req.params.number);
    const userId = req.session.userId;
    const question = await getQuestion(questionNumber, userId);
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Submit answer
app.post('/api/submit-answer', requireAuth, async (req, res) => {
  try {
    const { questionNumber, answer } = req.body;
    const sessionId = req.session.testSessionId;
    
    // Get current session
    const session = await db.query('SELECT * FROM test_sessions WHERE id = $1', [sessionId]);
    if (session.rows.length === 0) {
      return res.json({ error: 'Invalid session' });
    }
    
    const currentSession = session.rows[0];
    const answers = currentSession.answers || {};
    answers[questionNumber] = answer;
    
    // Update session
    await db.query(
      'UPDATE test_sessions SET answers = $1, current_question = $2 WHERE id = $3',
      [JSON.stringify(answers), Math.max(currentSession.current_question, questionNumber + 1), sessionId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.json({ error: 'Failed to save answer' });
  }
});

// Submit test (GET route for automatic submission when time expires)
app.get('/submit-test', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.testSessionId;
    if (!sessionId) {
      return res.redirect('/');
    }
    
    const session = await db.query('SELECT * FROM test_sessions WHERE id = $1', [sessionId]);
    
    if (session.rows.length === 0) {
      return res.redirect('/');
    }
    
    const testSession = session.rows[0];
    const answers = testSession.answers || {};
    
    // Calculate score
    let correctAnswers = 0;
    let totalQuestions = 30;
    
    for (let i = 1; i <= totalQuestions; i++) {
      const userAnswer = answers[i];
      try {
        const question = await getQuestion(i, req.session.userId);
        const correctAnswer = question.correctAnswer;
        
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      } catch (error) {
        console.error(`Error getting question ${i} for scoring:`, error);
      }
    }
    
    const wrongAnswers = Object.keys(answers).length - correctAnswers;
    const unanswered = totalQuestions - Object.keys(answers).length;
    
    // Calculate IQ score (simplified formula)
    const percentage = (correctAnswers / totalQuestions) * 100;
    let iqScore = Math.round(85 + (percentage * 0.3)); // Scale 85-115
    
    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - new Date(testSession.start_time)) / 1000);
    
    // Save results
    await db.query(
      `INSERT INTO test_results (user_id, session_id, total_questions, correct_answers, 
       wrong_answers, unanswered, iq_score, time_taken) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.session.userId, sessionId, totalQuestions, correctAnswers, wrongAnswers, unanswered, iqScore, timeTaken]
    );
    
    // Mark session as completed
    await db.query('UPDATE test_sessions SET is_completed = TRUE, submitted_at = NOW() WHERE id = $1', [sessionId]);
    
    // Mark user as attempted
    await db.query('UPDATE users SET has_attempted = TRUE WHERE id = $1', [req.session.userId]);
    
    // Redirect to test completed page
    res.redirect('/test-completed');
  } catch (error) {
    console.error('Auto submit test error:', error);
    res.redirect('/');
  }
});

// Submit test (POST API route for frontend JavaScript)
app.post('/api/submit-test', requireAuth, async (req, res) => {
  try {
    const sessionId = req.session.testSessionId;
    const session = await db.query('SELECT * FROM test_sessions WHERE id = $1', [sessionId]);
    
    if (session.rows.length === 0) {
      return res.json({ error: 'Invalid session' });
    }
    
    const testSession = session.rows[0];
    const answers = testSession.answers || {};
    
    // Calculate score
    let correctAnswers = 0;
    let totalQuestions = 30;
    
    for (let i = 1; i <= totalQuestions; i++) {
      const userAnswer = answers[i];
      try {
        const question = await getQuestion(i, req.session.userId);
        const correctAnswer = question.correctAnswer;
        
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      } catch (error) {
        console.error(`Error getting question ${i} for scoring:`, error);
      }
    }
    
    const wrongAnswers = Object.keys(answers).length - correctAnswers;
    const unanswered = totalQuestions - Object.keys(answers).length;
    
    // Calculate IQ score (simplified formula)
    const percentage = (correctAnswers / totalQuestions) * 100;
    let iqScore = Math.round(85 + (percentage * 0.3)); // Scale 85-115
    
    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - new Date(testSession.start_time)) / 1000);
    
    // Save results
    await db.query(
      `INSERT INTO test_results (user_id, session_id, total_questions, correct_answers, 
       wrong_answers, unanswered, iq_score, time_taken) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.session.userId, sessionId, totalQuestions, correctAnswers, wrongAnswers, unanswered, iqScore, timeTaken]
    );
    
    // Mark session as completed
    await db.query('UPDATE test_sessions SET is_completed = TRUE, submitted_at = NOW() WHERE id = $1', [sessionId]);
    
    // Mark user as attempted
    await db.query('UPDATE users SET has_attempted = TRUE WHERE id = $1', [req.session.userId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Submit test error:', error);
    res.json({ error: 'Failed to submit test' });
  }
});

// Test completed page
app.get('/test-completed', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM test_results WHERE user_id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
      return res.redirect('/');
    }
    
    res.render('test-completed', { result: result.rows[0] });
  } catch (error) {
    console.error('Test completed error:', error);
    res.redirect('/');
  }
});

// Admin dashboard
app.get('/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const results = await db.query(`
      SELECT 
        u.full_name,
        u.email,
        tr.total_questions,
        tr.correct_answers,
        tr.wrong_answers,
        tr.unanswered,
        tr.iq_score,
        tr.time_taken,
        tr.completion_date
      FROM test_results tr
      JOIN users u ON tr.user_id = u.id
      ORDER BY tr.completion_date DESC
    `);
    
    res.render('admin-dashboard', { results: results.rows });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin-dashboard', { results: [] });
  }
});



// Question randomization and management functions
async function getUserQuestionSet(userId) {
  try {
    // Check if user already has a question set
    const existingSet = await db.query(
      'SELECT question_ids FROM user_question_sets WHERE user_id = $1',
      [userId]
    );
    
    if (existingSet.rows.length > 0) {
      return existingSet.rows[0].question_ids;
    }
    
    // Generate new question set
    const questionSet = await generateRandomQuestionSet();
    
    // Save the question set for this user
    await db.query(
      'INSERT INTO user_question_sets (user_id, question_ids) VALUES ($1, $2)',
      [userId, questionSet]
    );
    
    return questionSet;
  } catch (error) {
    console.error('Error getting user question set:', error);
    throw error;
  }
}

async function generateRandomQuestionSet() {
  try {
    // Get all available questions
    const result = await db.query(
      'SELECT id FROM questions_bank WHERE is_active = TRUE ORDER BY id'
    );
    
    const allQuestionIds = result.rows.map(row => row.id);
    
    if (allQuestionIds.length < 30) {
      throw new Error('Not enough questions in database. Need at least 30 questions.');
    }
    
    // Shuffle the array using Fisher-Yates algorithm
    const shuffled = [...allQuestionIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Take first 30 questions
    return shuffled.slice(0, 30);
  } catch (error) {
    console.error('Error generating random question set:', error);
    throw error;
  }
}

async function getQuestion(questionNumber, userId) {
  try {
    // Get user's question set
    const questionSet = await getUserQuestionSet(userId);
    
    if (questionNumber < 1 || questionNumber > questionSet.length) {
      throw new Error('Invalid question number');
    }
    
    // Get the specific question ID for this position
    const questionId = questionSet[questionNumber - 1];
    
    // Retrieve the question from database
    const result = await db.query(
      'SELECT * FROM questions_bank WHERE id = $1',
      [questionId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Question not found');
    }
    
    const dbQuestion = result.rows[0];
    
    // Format the question for frontend
    const question = {
      number: questionNumber,
      id: dbQuestion.id,
      type: "pattern",
      question: dbQuestion.question_text,
      questionImage: dbQuestion.question_image,
      options: [
        { 
          label: "A", 
          text: dbQuestion.option_a_text,
          image: dbQuestion.option_a_image
        },
        { 
          label: "B", 
          text: dbQuestion.option_b_text,
          image: dbQuestion.option_b_image
        },
        { 
          label: "C", 
          text: dbQuestion.option_c_text,
          image: dbQuestion.option_c_image
        },
        { 
          label: "D", 
          text: dbQuestion.option_d_text,
          image: dbQuestion.option_d_image
        },
        { 
          label: "E", 
          text: dbQuestion.option_e_text,
          image: dbQuestion.option_e_image
        },
        { 
          label: "F", 
          text: dbQuestion.option_f_text,
          image: dbQuestion.option_f_image
        }
      ],
      correctAnswer: dbQuestion.correct_answer,
      difficulty: dbQuestion.difficulty_level,
      category: dbQuestion.category
    };
    
    return question;
  } catch (error) {
    console.error('Error getting question:', error);
    throw error;
  }
}

// Initialize database
async function initDatabase() {
  try {
    const fs = require('fs');
    const schemaSQL = fs.readFileSync('./database/schema.sql', 'utf8');
    await db.query(schemaSQL);
    console.log('Database initialized successfully');
    
    // Create admin user from environment variables
    await createAdminUser();
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Create admin user from environment variables
async function createAdminUser() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin already exists
    const existingAdmin = await db.query('SELECT * FROM admins WHERE username = $1', [adminUsername]);
    
    if (existingAdmin.rows.length === 0) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // Insert admin user
      await db.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        [adminUsername, hashedPassword]
      );
      
      console.log(`Admin user '${adminUsername}' created successfully`);
    } else {
      console.log(`Admin user '${adminUsername}' already exists`);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDatabase();
}); 