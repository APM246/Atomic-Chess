// Helper function to send a GET request to an endpoint and parse it as JSON
async function ajax(endpoint, method = "GET", body = null) {
    if (method === "GET") {
        try {
            const response = await fetch(endpoint);
            if (response.status === 200) {
                return await response.json();
            }
        } catch(err) {
            console.error(err);
        }
        return null;
    } else if (method === "POST") {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            return response.status === 200;
        } catch (err) {
            console.error(err);
        }
    }
    return false;
}
