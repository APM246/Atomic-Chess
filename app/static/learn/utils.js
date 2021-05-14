// Utility module for lessons to update the API with the current progress of the lesson
// Must have already included ajax.js

async function isLessonComplete(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.completed_lesson;
    }
    return false;
}

async function isTestComplete(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.completed_test;
    }
    return false;
}

async function getCurrentLessonStage(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.progression;
    }
    return 0;
}

async function setLessonProgression(lessonId, progression, apiBase = "/api") {
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        progression,
    });
    return response;
}

async function markLessonAsComplete(lessonId, apiBase = "/api") {
    // Also reset progression
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        completed_lesson: true,
        progression: 0,
    });
    return response;
}

async function markTestAsComplete(lessonId, apiBase = "/api") {
    const response = await ajax(`${apiBase}/lessons/${lessonId}`, "PUT", {
        completed_test: true
    });
    return response
}