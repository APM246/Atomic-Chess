// Utility module for lessons to update the API with the current progress of the lesson
// Must have already included ajax.js

async function isLessonComplete(lessonId, apiBase = "/api") {
    const lessonData = await ajax(`${apiBase}/lessons/${lessonId}`);
    if (lessonData) {
        return lessonData.lesson.completed;
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
        completed: true,
        progression: 0,
    });
    return response;
}
