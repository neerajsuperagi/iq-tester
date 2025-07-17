const db = require('../database/db');
const fs = require('fs');
const path = require('path');

// Define correct answers for each screenshot
// This mapping should be updated based on analyzing each screenshot
const CORRECT_ANSWERS = {
    'Screenshot from 2025-07-17 11-45-35.png': 'C',  // 3D cube pattern
    'Screenshot from 2025-07-17 11-45-40.png': 'C',  // Number sequence 
    'Screenshot from 2025-07-17 11-45-44.png': 'E',  // Geometric pattern
    'Screenshot from 2025-07-17 11-45-50.png': 'B',  // Matrix pattern
    'Screenshot from 2025-07-17 11-45-55.png': 'F',  // Shape rotation
    'Screenshot from 2025-07-17 11-46-03.png': 'C',  // Logic pattern
    'Screenshot from 2025-07-17 11-46-07.png': 'E',  // Symbol sequence
    'Screenshot from 2025-07-17 11-46-13.png': 'E',  // Spatial pattern
    'Screenshot from 2025-07-17 11-46-18.png': 'E',  // Abstract shapes
    'Screenshot from 2025-07-17 11-46-57.png': 'B',  // Complex pattern
    'Screenshot from 2025-07-17 11-47-04.png': 'C',  // Geometric sequence
    'Screenshot from 2025-07-17 11-47-12.png': 'D',  // Matrix completion
    'Screenshot from 2025-07-17 11-47-25.png': 'E',  // Pattern recognition
    'Screenshot from 2025-07-17 11-47-33.png': 'B',  // Shape logic
    'Screenshot from 2025-07-17 11-49-42.png': 'F',  // Sequential pattern
    'Screenshot from 2025-07-17 11-49-47.png': 'A',  // Rotation pattern
    'Screenshot from 2025-07-17 11-49-54.png': 'E',  // Visual logic
    'Screenshot from 2025-07-17 11-49-59.png': 'C',  // Complex matrix
    'Screenshot from 2025-07-17 11-50-04.png': 'C',  // Geometric logic
    'Screenshot from 2025-07-17 11-50-10.png': 'E',  // Pattern sequence
    'Screenshot from 2025-07-17 11-50-18.png': 'E',  // Shape transformation
    'Screenshot from 2025-07-17 11-50-40.png': 'B',  // Matrix pattern
    'Screenshot from 2025-07-17 11-50-45.png': 'D',  // Logic sequence
    'Screenshot from 2025-07-17 11-50-49.png': 'A',  // Spatial reasoning
    'Screenshot from 2025-07-17 11-50-53.png': 'C',  // Pattern completion
    'Screenshot from 2025-07-17 11-50-57.png': 'D',  // Abstract logic
    'Screenshot from 2025-07-17 11-51-02.png': 'A',  // Complex pattern
    'Screenshot from 2025-07-17 11-51-07.png': 'F',  // Visual reasoning
    'Screenshot from 2025-07-17 11-51-35.png': 'D',  // Matrix logic
    'Screenshot from 2025-07-17 11-51-42.png': 'A'   // Final pattern
};

async function updateAnswers() {
    try {
        console.log('🔄 Updating Question Answers...\n');
        
        // Get all questions
        const questionsResult = await db.query(`
            SELECT id, question_image, correct_answer 
            FROM questions_bank 
            ORDER BY question_image
        `);
        
        let updated = 0;
        let errors = 0;
        
        console.log('📋 Processing Questions:');
        console.log('─'.repeat(70));
        
        for (const question of questionsResult.rows) {
            const filename = question.question_image;
            const currentAnswer = question.correct_answer;
            const newAnswer = CORRECT_ANSWERS[filename];
            
            if (newAnswer) {
                if (currentAnswer !== newAnswer) {
                    // Update the answer
                    await db.query(
                        'UPDATE questions_bank SET correct_answer = $1 WHERE id = $2',
                        [newAnswer, question.id]
                    );
                    
                    console.log(`✅ Q${question.id}: ${filename.substring(0, 30)}... | ${currentAnswer} → ${newAnswer}`);
                    updated++;
                } else {
                    console.log(`✓  Q${question.id}: ${filename.substring(0, 30)}... | Already correct (${newAnswer})`);
                }
            } else {
                console.log(`⚠️  Q${question.id}: ${filename.substring(0, 30)}... | No mapping found`);
                errors++;
            }
        }
        
        console.log('─'.repeat(70));
        console.log(`\n📊 Summary:`);
        console.log(`  ✅ Updated: ${updated} questions`);
        console.log(`  ⚠️  Errors: ${errors} questions`);
        console.log(`  📝 Total: ${questionsResult.rows.length} questions`);
        
        // Show new answer distribution
        const answerDistribution = await db.query(`
            SELECT correct_answer, COUNT(*) as count 
            FROM questions_bank 
            GROUP BY correct_answer 
            ORDER BY correct_answer
        `);
        
        console.log('\n📈 New Answer Distribution:');
        answerDistribution.rows.forEach(row => {
            console.log(`  Option ${row.correct_answer}: ${row.count} questions`);
        });
        
        // Verify images exist
        console.log('\n🔍 Verifying Image Files...');
        const imagesDir = path.join(__dirname, '..', 'public', 'images', 'questions');
        
        for (const question of questionsResult.rows) {
            const imagePath = path.join(imagesDir, question.question_image);
            if (!fs.existsSync(imagePath)) {
                console.log(`❌ Missing: ${question.question_image}`);
            }
        }
        
        console.log('\n✅ Answer mapping update completed!');
        
    } catch (error) {
        console.error('❌ Error updating answers:', error);
    } finally {
        await db.pool.end();
    }
}

updateAnswers(); 