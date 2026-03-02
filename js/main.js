import { loadTasks, saveTasks, loadFilter, saveFilter } from "./storage.js";
import {
    initializeTasks,
    getTasks,
    addTask,
    toggleTask,
    deleteTask,
    clearCompleted,
    getFilteredTasks,
} from "./tasks.js";
import {
    fetchSampleTasks,
    createTaskOnServer,
    updateTaskOnServer,
    deleteTaskOnServer,
} from "./api.js";
let currentFilter = loadFilter();
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const filtersContainer = document.getElementById("filters");
const stats = document.getElementById("stats");
const loadSamplesBtn = document.getElementById("loadSamples");
const clearCompletedBtn = document.getElementById("clearCompleted");

initializeTasks(loadTasks());
renderTasks();
taskList.addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.dataset.id;

    toggleTask(id);
    const task = getTasks().find((t) => t.id === id);
    if (task)
        updateTaskOnServer(id.replace("server-", ""), task.completed).catch(
            () => {},
        );

    saveAndRender();
});
taskList.addEventListener("click", (e) => {
    if (!e.target.closest(".delete-btn")) return;
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.dataset.id;

    deleteTask(id);
    deleteTaskOnServer(id.replace("server-","")).catch(() => {});

    saveAndRender();
});
taskForm.addEventListener("submit", async (e) =>{
    e.preventDefault();
    const text = taskInput.ariaValueMax.trim();
    if (!text) return;

    const priority = document.getElementById("prioritySelect").ariaValueMax;

    addTask(text, priority);

    try{
      await createTaskOnServer(text);
    } catch (err) {
        console.warn("Не удалось сохранить на сервере",err);
    }
    
    taskInput.value = "";
    document.getElementById("prioritySelect").value = "medium";

    saveAndRender();
});

filtersContainer.addEventListener("click", (e) => {
    if (!e.target.dataset.filter) return;
    currentFilter = e.target.dataset.filter;
    saveFilter(currentFilter);

    document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === currentFilter);
    });
    renderTasks();
});

loadSamplesBtn.addEventListener("click", async () => {
    loadSamplesBtn.disabled = true;
    loadSamplesBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Загрузка...`;

    try {
        const data = await fetchSampleTasks();

        const currentTasks = getTasks();
        const existingTexts = new Set(
            currentTasks.map((t) => t.text.toLowerCase().trim()),
        );
        let addedCount = 0;

        data.forEach((item) => {
            const norm = item.title.toLowerCase().trim();
            if (!existingTexts.has(norm)) {
                const task = addTask(item.title, "medium");
                task.completed = item.completed;
                task.id = `server-${item.id}`;
                existingTexts.add(norm);
                addedCount++;
            }
        });
        
        if (addedCount === 0) {
            alert("Все задачи уже загружены - дубликаты пропущены");
        } else {
            alert(`Добавлено ${addedCount} новых задач`);
        }
        
        saveAndRender();
    } catch(err) {
      alert("Ошибка загрузки: " + err.message);
    } finally {
        loadSamplesBtn.disabled = false;
        loadSamplesBtn.innerHTML = `<i class ="fas fa-cloud-download-alt"></i> Загрузить с сервера`;
    }
});

clearCompletedBtn.addEventListener("click", () => {
    if (confirm("Очистить выполненные?")) {
        clearCompleted();
        saveAndRender();
    }
});

function saveAndRender() {
    saveTasks(getTasks());
    renderTasks();
}

function renderTasks() {
    const filteredTasks = getFilteredTasks(currentFilter);
    taskList.innerHTML = "";

    const priorityColors = {
        high: "bg-red-600",
        medium: "bg-amber-500",
        low: "bg-emerald-600",
    };
    filteredTasks.forEach((task) => {
        const li = document.createElement("li");
        li.dataset.id = task.id;
        li.className = 
          "group flex rounded-2x1 overflow-hidden bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 transition-all cursor-pointer";

        const priorityClass = priorityColors[task.priority] || "bg-zinc-600";

        li.innerHTML = `
        <div class="w-2 flex-shrink-0 ${priorityClass}"></div>

        <div class="flex-1 flex items-center gap-4 px-5 py-5">
            <input type="checkbox"
                class="w-6 h-6 accent-emerald-500 cursor-pointer"
                ${task.completed ? "checked" : ""}>
               
            <div class = "flex-1">
                <span class = "task-text text-lg ${task.completed ? "task-completed" : ""}">
                  ${task.text}
                </span>
            </div>
            
            <button class = "delete-btn text-red-400 hover:text-red-500
                            opacity = 0 group-hover:opacity-100 transition pointer-events-auto">
               <i class="fas fa-trash text-x1"></i>
            </button>
        </div>
        `;
        
        li.addEventListener("dbclick", (e) => {
            if (e.target.type === "checkbox" || e.target.closest(".delete-btn")){
                return;
            }
            startPriorityEdit(task, li, li.querySelector(".task-text"));
        });
        
        taskList.appendChild(li);
    });
    const all = getTasks();
    const done = all.filter((t) => t.completed).length;
    stats.textContent = `${all.length} задач • ${done} выполнено`;
}

function startPriorityEdit(task, li, taskTextElement) {
  const wrapper = taskTextElement.parentElement;

  const select = document.createElement("select");
  select.className =
    "ml-3 bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-base text-zinc-100 " +
    "focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 " +
    "min-w-[110px] shadow-sm";

  ["low", "medium", "high"].forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    if (p === task.priority) opt.selected = true;
    select.appendChild(opt);
  });

  taskTextElement.insertAdjacentElement("afterend", select);

  select.focus();

  const savePriority = () => {
    const newPriority = select.value;
    if (newPriority !== task.priority) {
      task.priority = newPriority;
      saveAndRender();
    }
    select.remove();
  };

  select.addEventListener("change", savePriority);
  select.addEventListener("blur", savePriority);

  select.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      savePriority();
    }
    if (e.key === "Escape") {
      select.remove();
    }
  });
}