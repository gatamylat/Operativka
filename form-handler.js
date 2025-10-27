// form-handler.js - Обработка структурированной формы ввода

// Расширение ProductionApp для работы с формой
ProductionApp.additionalProjects = [];

// Добавление дополнительного блока проекта
ProductionApp.addProjectSection = function() {
    const container = document.getElementById('additionalProjects');
    const index = this.additionalProjects.length + 2; // +2 т.к. первый уже есть
    
    const projectBlock = document.createElement('div');
    projectBlock.className = 'form-section additional-project';
    projectBlock.innerHTML = `
        <div class="section-header-inline">
            <h4>Проект ${index}</h4>
            <button class="btn-icon btn-remove" onclick="ProductionApp.removeProjectSection(this)">🗑️</button>
        </div>
        <div class="form-group">
            <label>Название проекта:</label>
            <input type="text" class="additional-project-name" placeholder="Название проекта">
        </div>
        <div class="form-group">
            <label>Задачи:</label>
            <textarea class="additional-project-tasks" rows="4" placeholder="Каждая строка = задача"></textarea>
        </div>
    `;
    
    container.appendChild(projectBlock);
    this.additionalProjects.push(projectBlock);
};

// Удаление блока проекта
ProductionApp.removeProjectSection = function(button) {
    const section = button.closest('.additional-project');
    const index = this.additionalProjects.indexOf(section);
    if (index > -1) {
        this.additionalProjects.splice(index, 1);
    }
    section.remove();
};

// Очистка формы
ProductionApp.clearForm = function() {
    if (!confirm('Очистить всю форму?')) return;
    
    document.getElementById('projectName').value = '';
    document.getElementById('projectTasks').value = '';
    document.getElementById('shipmentsInput').value = '';
    document.getElementById('shipmentsPlan').value = '';
    document.getElementById('installationPlan').value = '';
    document.getElementById('paintingTasks').value = '';
    document.getElementById('assemblerTasks').value = '';
    document.getElementById('carpenterTasks').value = '';
    
    // Удаляем дополнительные проекты
    document.getElementById('additionalProjects').innerHTML = '';
    this.additionalProjects = [];
};

// Сбор данных из формы
ProductionApp.collectFormData = function() {
    const formData = {
        projects: [],
        shipments: '',
        shipmentsPlan: '',
        installation: '',
        painting: '',
        assembly: '',
        carpentry: ''
    };

    // Основной проект
    const mainProjectName = document.getElementById('projectName').value.trim();
    const mainProjectTasks = document.getElementById('projectTasks').value.trim();
    
    if (mainProjectName && mainProjectTasks) {
        formData.projects.push({
            name: mainProjectName,
            tasks: mainProjectTasks
        });
    }

    // Дополнительные проекты
    document.querySelectorAll('.additional-project').forEach(block => {
        const name = block.querySelector('.additional-project-name').value.trim();
        const tasks = block.querySelector('.additional-project-tasks').value.trim();
        
        if (name && tasks) {
            formData.projects.push({ name, tasks });
        }
    });

    // Остальные секции
    formData.shipments = document.getElementById('shipmentsInput').value.trim();
    formData.shipmentsPlan = document.getElementById('shipmentsPlan').value.trim();
    formData.installation = document.getElementById('installationPlan').value.trim();
    formData.painting = document.getElementById('paintingTasks').value.trim();
    formData.assembly = document.getElementById('assemblerTasks').value.trim();
    formData.carpentry = document.getElementById('carpenterTasks').value.trim();

    return formData;
};

// Импорт из формы
ProductionApp.importFromForm = function() {
    const formData = this.collectFormData();
    
    // Проверяем, есть ли данные
    const hasData = formData.projects.length > 0 || 
                    formData.shipments || 
                    formData.shipmentsPlan ||
                    formData.installation ||
                    formData.painting || 
                    formData.assembly || 
                    formData.carpentry;
    
    if (!hasData) {
        alert('Форма пуста. Заполните хотя бы одну секцию.');
        return;
    }

    // Парсим данные
    const parsed = Parser.parseStructuredForm(formData);
    
    // Добавляем к существующим данным
    this.data.tasks.push(...parsed.tasks);
    this.data.shipments.push(...parsed.shipments);
    this.data.installations.push(...parsed.installations);
    
    // Сохраняем текст оперативки как заметку
    const noteText = this.formatFormDataAsNote(formData);
    const today = new Date().toISOString().split('T')[0];
    this.data.daily_notes[today] = noteText;
    
    // Сохраняем
    this.saveData();

    // Показываем результат
    const resultDiv = document.getElementById('parseResult');
    resultDiv.innerHTML = `
        <strong>✅ Импортировано:</strong><br>
        📋 Задач: ${parsed.tasks.length}<br>
        📦 Отгрузок: ${parsed.shipments.length}<br>
        🔧 Монтажей: ${parsed.installations.length}
    `;
    resultDiv.classList.add('show');

    setTimeout(() => {
        resultDiv.classList.remove('show');
        this.clearForm();
        this.switchTab('tasks');
    }, 2000);
};

// Форматирование данных формы в текст заметки
ProductionApp.formatFormDataAsNote = function(formData) {
    let text = '';
    
    // Проекты
    if (formData.projects.length > 0) {
        formData.projects.forEach(project => {
            text += `${project.name}:\n${project.tasks}\n\n`;
        });
    }
    
    // Отгрузки
    if (formData.shipments) {
        text += `ОТГРУЗКИ:\n${formData.shipments}\n\n`;
    }
    
    // План отгрузки
    if (formData.shipmentsPlan) {
        text += `ПЛАН ОТГРУЗКИ:\n${formData.shipmentsPlan}\n\n`;
    }
    
    // Монтаж
    if (formData.installation) {
        text += `МОНТАЖИ:\n${formData.installation}\n\n`;
    }
    
    // Покраска
    if (formData.painting) {
        text += `ПОКРАСКА:\n${formData.painting}\n\n`;
    }
    
    // Сборщики
    if (formData.assembly) {
        text += `СБОРЩИКИ:\n${formData.assembly}\n\n`;
    }
    
    // Столяры
    if (formData.carpentry) {
        text += `СТОЛЯРЫ:\n${formData.carpentry}\n\n`;
    }
    
    return text.trim();
};

// Отображение последних оперативок (БЕЗ загрузки в форму!)
ProductionApp.renderRecentNotes = function() {
    const notesList = document.getElementById('notesList');
    if (!notesList) return;
    
    const notes = Object.entries(this.data.daily_notes)
        .sort((a, b) => b[0].localeCompare(a[0])) // Сортировка по дате DESC
        .slice(0, 5); // Последние 5
    
    if (notes.length === 0) {
        notesList.innerHTML = '<p style="color: #64748b; padding: 20px; text-align: center;">Нет сохраненных оперативок</p>';
        return;
    }
    
    let html = '<div style="margin-top: 20px;">';
    html += '<h4 style="margin-bottom: 15px;">Последние оперативки:</h4>';
    
    notes.forEach(([date, text]) => {
        const formattedDate = new Date(date).toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long' 
        });
        
        html += `
            <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 5px;">${formattedDate}</div>
                <div style="font-size: 13px; color: #64748b; white-space: pre-wrap; max-height: 100px; overflow: hidden;">${text}</div>
            </div>
        `;
    });
    
    html += '</div>';
    notesList.innerHTML = html;
};

// Обновляем обработчики событий
const originalSetupEventListeners = ProductionApp.setupEventListeners;
ProductionApp.setupEventListeners = function() {
    // Вызываем оригинальные обработчики
    originalSetupEventListeners.call(this);

    // Добавляем новые обработчики
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => this.importFromForm());
    }

    const clearFormBtn = document.getElementById('clearFormBtn');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', () => this.clearForm());
    }
};
