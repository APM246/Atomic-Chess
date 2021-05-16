// Utility module for lessons to update the API with the current progress of the lesson
// Must have already included ajax.js

// Check if the lesson has already been completed
async function isLessonComplete(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.completed_lesson;
    }
    return false;
}

// Check if the test has already been completed
async function isTestComplete(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.completed_test;
    }
    return false;
}

// Return the current progression through the lesson
async function getCurrentLessonStage(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.progression;
    }
    return 0;
}

// Return all the lesson data
async function getLessonData(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson;
    }
    return null;
}

// Set the current progression through the lesson
async function setLessonProgression(lessonId, progression, apiBase = "/api") {
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        progression,
    });
    return response;
}

// Save the lesson as complete in the database
async function markLessonAsComplete(lessonId, apiBase = "/api") {
    // Also reset progression
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        completed_lesson: true,
        progression: 0,
    });
    return response;
}

// Save the test as complete in the database
async function markTestAsComplete(lessonId, apiBase = "/api") {
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        completed_test: true,
    });
    return response;
}
