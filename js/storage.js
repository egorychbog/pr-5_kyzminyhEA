export const STORAGE_KEY = "todo_tasks";
export const FILTER_KEY = "todo_filter";
export const loadTasks = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};
export const saveTasks = (tasks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};
export const loadFilter = () => sessionStorage.getItem(FILTER_KEY) || "all";
export const saveFilter = (filter) =>
    sessionStorage.setItem(FILTER_KEY, filter);