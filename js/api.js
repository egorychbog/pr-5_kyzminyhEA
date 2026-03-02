const API_URL = "https://jsonplaceholder.typicode.com/todos";
export async function fetchSampleTasks() {
    const res = await fetch(`${API_URL}?_limit=10`);
    if (!res.ok) throw new Error("Ошибка сервера");
    return await res.json();
}
export async function createTaskOnServer(text) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text, completed: false, userId: 1}),
    });
    return await res.json();
}
export async function updateTaskOnServer(id, completed) {
    await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
    });
}
export async function deleteTaskOnServer(id) {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
}