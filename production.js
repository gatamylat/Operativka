// production.js - Основная логика приложения

const ProductionApp = {
    // Состояние приложения
    data: {
        tasks: [],
        shipments: [],
        installations: [],
        daily_notes: {}
    },
    
    currentFilter: 'all',
    currentTab: 'input',
    editingTask: null,
    editingShipment: null,
    currentEditingInstallationId: null,

    // Инициализация
    init() {
        this.migrateOldData(); // Мигрируем старые данные если есть
        this.loadData();
        this.setupEventListeners();
        this.render();
        this.showNotifications();
        this.updateLastUpdateTime();
    },

    // Миграция со старого ключа localStorage
    migrateOldData() {
        const oldData = localStorage.getItem('production_data');
        const newData = localStorage.getItem('production_app_v2');
        
        // Если есть старые данные и нет новых - мигрируем
        if (oldData && !newData) {
            console.log('🔄 Обнаружены старые данные, выполняю миграцию...');
            
            try {
                const parsed = JSON.parse(oldData);
                
                // Проверяем что данные валидные
                if (parsed && typeof parsed === 'object') {
                    // Очищаем невалидные отгрузки (где date = null)
                    if (parsed.shipments && Array.isArray(parsed.shipments)) {
                        const validShipments = parsed.shipments.filter(s => s.date && s.date !== 'null');
                        parsed.shipments = validShipments;
                        console.log(`✅ Отфильтровано ${validShipments.length} валидных отгрузок`);
                    }
                    
                    // Сохраняем в новый ключ
                    localStorage.setItem('production_app_v2', JSON.stringify(parsed));
                    console.log('✅ Миграция завершена!');
                    
                    // НЕ удаляем старые данные - пусть остаются как бэкап
                }
            } catch (e) {
                console.error('❌ Ошибка миграции:', e);
            }
        }
    },

    // Загрузка данных из localStorage
    loadData() {
        const saved = localStorage.getItem('production_app_v2');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    },

    // Сохранение данных в localStorage
    saveData() {
        localStorage.setItem('production_app_v2', JSON.stringify(this.data));
        this.updateLastUpdateTime();
    },

    // Очистка данных приложения
    clearAppData() {
        if (!confirm('⚠️ ВНИМАНИЕ!\n\nЭто удалит ВСЕ данные приложения "Оперативка Производство":\n• Все задачи\n• Все отгрузки\n• Все заметки\n\nПродолжить?')) {
            return;
        }

        // Удаляем данные
        localStorage.removeItem('production_app_v2');
        localStorage.removeItem('production_data'); // Старый ключ, если есть
        
        // Сбрасываем состояние
        this.data = {
            tasks: [],
            shipments: [],
            daily_notes: {}
        };
        
        alert('✅ Данные успешно очищены!\n\nСтраница будет перезагружена.');
        
        // Перезагружаем страницу
        location.reload();
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Фильтры задач
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterTasks(e.target.dataset.filter);
            });
        });

        // Добавление задачи/отгрузки
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.openTaskModal());
        }

        const addShipmentBtn = document.getElementById('addShipmentBtn');
        if (addShipmentBtn) {
            addShipmentBtn.addEventListener('click', () => this.openShipmentModal());
        }

        const addInstallationBtn = document.getElementById('addInstallationBtn');
        if (addInstallationBtn) {
            addInstallationBtn.addEventListener('click', () => this.openInstallationModal());
        }

        // Формы
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => this.saveTask(e));
        }

        const shipmentForm = document.getElementById('shipmentForm');
        if (shipmentForm) {
            shipmentForm.addEventListener('submit', (e) => this.saveShipment(e));
        }

        const installationForm = document.getElementById('installationForm');
        if (installationForm) {
            installationForm.addEventListener('submit', (e) => this.saveInstallation(e));
        }

        // Закрытие модальных окон
        document.querySelectorAll('.close, #cancelTaskBtn, #cancelShipmentBtn, #cancelInstallationBtn').forEach(el => {
            el.addEventListener('click', () => this.closeModals());
        });

        // Кнопка печати
        const printBtn = document.getElementById('printBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.print());
        }

        // Кнопки копирования в мессенджер
        const copyToMessengerBtn = document.getElementById('copyToMessengerBtn');
        if (copyToMessengerBtn) {
            copyToMessengerBtn.addEventListener('click', () => this.copyFullToMessenger());
        }

        const copyShipmentsBtn = document.getElementById('copyShipmentsBtn');
        if (copyShipmentsBtn) {
            copyShipmentsBtn.addEventListener('click', () => this.copyShipmentsPlan());
        }

        const copyInstallationsBtn = document.getElementById('copyInstallationsBtn');
        if (copyInstallationsBtn) {
            copyInstallationsBtn.addEventListener('click', () => this.copyInstallationsPlan());
        }

        // Кнопки экспорта/импорта JSON
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => this.exportToJSON());
        }

        const importJsonBtn = document.getElementById('importJsonBtn');
        const importJsonFile = document.getElementById('importJsonFile');
        if (importJsonBtn && importJsonFile) {
            importJsonBtn.addEventListener('click', () => importJsonFile.click());
            importJsonFile.addEventListener('change', (e) => this.importFromJSON(e));
        }

        // Кнопка очистки данных
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearAppData());
        }

        // Чекбокс наслоения отгрузок
        const overlayCheckbox = document.getElementById('overlayShipmentsCheckbox');
        if (overlayCheckbox) {
            overlayCheckbox.addEventListener('change', () => this.renderInstallations());
        }

        // Чекбокс режима отображения отгрузок
        const shipmentsCalendarViewCheckbox = document.getElementById('shipmentsCalendarViewCheckbox');
        if (shipmentsCalendarViewCheckbox) {
            shipmentsCalendarViewCheckbox.addEventListener('change', () => this.renderShipments());
        }

        // FAB (Floating Action Button) для мобильных
        const fabButton = document.getElementById('fabButton');
        const fabMenu = document.getElementById('fabMenu');
        if (fabButton && fabMenu) {
            fabButton.addEventListener('click', () => {
                fabButton.classList.toggle('active');
                fabMenu.classList.toggle('active');
            });

            // Закрытие меню при клике вне его
            document.addEventListener('click', (e) => {
                if (!fabButton.contains(e.target) && !fabMenu.contains(e.target)) {
                    fabButton.classList.remove('active');
                    fabMenu.classList.remove('active');
                }
            });

            // Обработчики для кнопок в меню
            fabMenu.querySelectorAll('.fab-menu-item').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.dataset.action;
                    this.handleFabAction(action);
                    fabButton.classList.remove('active');
                    fabMenu.classList.remove('active');
                });
            });
        }

        // Закрытие модала по клику вне его
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    },

    // Переключение вкладок
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        if (tabName === 'tasks') {
            this.renderTasks();
        } else if (tabName === 'shipments') {
            this.renderShipments();
        } else if (tabName === 'installations') {
            this.renderInstallations();
        } else if (tabName === 'input') {
            // Показываем последние оперативки БЕЗ загрузки в форму
            if (typeof this.renderRecentNotes === 'function') {
                this.renderRecentNotes();
            }
        }

        // Обновляем видимость секции "В Telegram" в FAB меню
        const fabTelegramSection = document.getElementById('fabTelegramSection');
        if (fabTelegramSection) {
            if (tabName === 'shipments' || tabName === 'installations') {
                fabTelegramSection.classList.remove('hidden');
                // Обновляем текст кнопки
                const fabCopyPlanText = document.getElementById('fabCopyPlanText');
                if (fabCopyPlanText) {
                    fabCopyPlanText.textContent = tabName === 'shipments' ? 'Копировать план отгрузок' : 'Копировать план монтажа';
                }
            } else {
                fabTelegramSection.classList.add('hidden');
            }
        }
    },

    // Сохранение текстовой заметки
    saveNote() {
        const text = document.getElementById('textInput').value.trim();
        if (!text) return;

        const today = new Date().toISOString().split('T')[0];
        this.data.daily_notes[today] = text;
        this.saveData();

        alert('Заметка сохранена');
        this.renderNotes();
    },

    // Парсинг и импорт задач
    parseAndImport() {
        const text = document.getElementById('textInput').value.trim();
        if (!text) return;

        const parsed = Parser.parse(text);
        
        // Добавляем задачи
        this.data.tasks.push(...parsed.tasks);
        
        // Добавляем отгрузки
        this.data.shipments.push(...parsed.shipments);

        // Сохраняем заметку
        const today = new Date().toISOString().split('T')[0];
        this.data.daily_notes[today] = text;

        this.saveData();

        // Показываем результат
        const resultDiv = document.getElementById('parseResult');
        resultDiv.innerHTML = `
            <strong>✅ Импортировано:</strong><br>
            📋 Задач: ${parsed.tasks.length}<br>
            📦 Отгрузок: ${parsed.shipments.length}
        `;
        resultDiv.classList.add('show');

        setTimeout(() => {
            resultDiv.classList.remove('show');
            document.getElementById('textInput').value = '';
            this.switchTab('tasks');
        }, 2000);
    },

    // Отображение заметок
    renderNotes() {
        const notesList = document.getElementById('notesList');
        if (!notesList) return;

        const notes = Object.entries(this.data.daily_notes)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 5);

        if (notes.length === 0) {
            notesList.innerHTML = '<p style="color: #64748b;">Нет сохраненных оперативок</p>';
            return;
        }

        notesList.innerHTML = notes.map(([date, text]) => `
            <div class="note-item">
                <div class="note-date">${this.formatDate(date)}</div>
                <div style="font-size: 14px; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${text.substring(0, 100)}...
                </div>
            </div>
        `).join('');
    },

    // Загрузка заметки в текстовое поле
    loadNote(date) {
        const text = this.data.daily_notes[date];
        const textInput = document.getElementById('textInput');
        if (text && textInput) {
            textInput.value = text;
        }
    },

    // Фильтрация задач
    filterTasks(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.renderTasks();
    },

    // Отображение задач
    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        
        // Фильтруем задачи
        let filteredTasks = this.data.tasks;
        if (this.currentFilter !== 'all') {
            filteredTasks = this.data.tasks.filter(t => t.status === this.currentFilter);
        }

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Нет задач</p>';
            return;
        }

        // Группируем по категориям
        const categories = {
            'Задачи по объекту': [],
            'Столяра': [],
            'Малярка': [],
            'Сборщики': []
        };

        filteredTasks.forEach(task => {
            const category = task.category || 'Задачи по объекту';
            if (categories[category]) {
                categories[category].push(task);
            }
        });

        let html = '';

        // Выводим по категориям
        Object.entries(categories).forEach(([categoryName, tasks]) => {
            if (tasks.length === 0) return;

            html += `<div class="category-group">`;
            html += `<div class="category-header">${categoryName}</div>`;

            // Группируем по исполнителям внутри категории
            const grouped = this.groupByAssignee(tasks);

            html += Object.entries(grouped).map(([assignee, assigneeTasks]) => `
                <div class="assignee-group">
                    <div class="assignee-header">
                        <span class="assignee-name">${assignee}</span>
                        <span class="task-count">${assigneeTasks.length} ${this.plural(assigneeTasks.length, 'задача', 'задачи', 'задач')}</span>
                    </div>
                    ${assigneeTasks.map(task => this.renderTask(task)).join('')}
                </div>
            `).join('');

            html += `</div>`;
        });

        tasksList.innerHTML = html;
    },

    // Группировка задач по исполнителю
    groupByAssignee(tasks) {
        return tasks.reduce((acc, task) => {
            const assignee = task.assignee || 'Без исполнителя';
            if (!acc[assignee]) {
                acc[assignee] = [];
            }
            acc[assignee].push(task);
            return acc;
        }, {});
    },

    // Отрисовка одной задачи
    renderTask(task) {
        const priorityClass = task.priority === 'high' ? 'priority-high' : '';
        const statusClass = `status-${task.status}`;
        const statusLabels = {
            'in_progress': 'В работе',
            'waiting': 'Ожидание',
            'ready': 'Готово',
            'done': 'Завершено'
        };

        return `
            <div class="task-item ${priorityClass} ${statusClass}">
                <input type="checkbox" class="task-checkbox" 
                    ${task.status === 'done' ? 'checked' : ''}
                    onchange="ProductionApp.toggleTaskDone('${task.id}', this.checked)">
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="task-badge badge-project">📁 ${task.project}</span>
                        ${task.deadline ? `<span class="task-badge badge-deadline">📅 ${this.formatDate(task.deadline)}</span>` : ''}
                        ${task.blocker ? `<span class="task-badge badge-blocker">⏳ Ждем: ${task.blocker}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <select class="task-status-select" onchange="ProductionApp.changeTaskStatus('${task.id}', this.value)">
                        ${Object.entries(statusLabels).map(([value, label]) => 
                            `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`
                        ).join('')}
                    </select>
                    <button class="btn-icon" onclick="ProductionApp.editTask('${task.id}')" title="Редактировать">✏️</button>
                    <button class="btn-icon" onclick="ProductionApp.deleteTask('${task.id}')" title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    },

    // Изменение статуса задачи
    changeTaskStatus(taskId, newStatus) {
        const task = this.data.tasks.find(t => t.id == taskId);
        if (!task) return;

        task.status = newStatus;
        task.updated = Date.now();
        task.history.push({
            timestamp: Date.now(),
            action: 'status_changed',
            status: newStatus
        });

        this.saveData();
        this.renderTasks();
    },

    // Переключение завершенности задачи
    toggleTaskDone(taskId, isDone) {
        const task = this.data.tasks.find(t => t.id == taskId);
        if (!task) return;

        task.status = isDone ? 'done' : 'in_progress';
        task.updated = Date.now();
        task.history.push({
            timestamp: Date.now(),
            action: isDone ? 'completed' : 'uncompleted',
            status: task.status
        });

        this.saveData();
        this.renderTasks();
    },

    // Удаление задачи
    deleteTask(taskId) {
        if (!confirm('Удалить задачу?')) return;

        this.data.tasks = this.data.tasks.filter(t => t.id != taskId);
        this.saveData();
        this.renderTasks();
    },

    // Открытие модального окна задачи
    openTaskModal(task = null) {
        this.editingTask = task;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');

        if (task) {
            title.textContent = 'Редактировать задачу';
            document.getElementById('taskProject').value = task.project;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskAssignee').value = task.assignee;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskDeadline').value = task.deadline || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskBlocker').value = task.blocker || '';
        } else {
            title.textContent = 'Новая задача';
            document.getElementById('taskForm').reset();
        }

        modal.classList.add('show');
    },

    // Редактирование задачи
    editTask(taskId) {
        const task = this.data.tasks.find(t => t.id == taskId);
        if (task) {
            this.openTaskModal(task);
        }
    },

    // Сохранение задачи
    saveTask(e) {
        e.preventDefault();

        const taskData = {
            project: document.getElementById('taskProject').value,
            title: document.getElementById('taskTitle').value,
            assignee: document.getElementById('taskAssignee').value,
            status: document.getElementById('taskStatus').value,
            deadline: document.getElementById('taskDeadline').value || null,
            priority: document.getElementById('taskPriority').value,
            blocker: document.getElementById('taskBlocker').value || null,
            type: 'production'
        };

        if (this.editingTask) {
            // Обновление существующей задачи
            const task = this.data.tasks.find(t => t.id === this.editingTask.id);
            Object.assign(task, taskData);
            task.updated = Date.now();
            task.history.push({
                timestamp: Date.now(),
                action: 'updated'
            });
        } else {
            // Создание новой задачи
            const newTask = {
                ...taskData,
                id: Date.now() + Math.random(),
                created: Date.now(),
                updated: Date.now(),
                history: [{
                    timestamp: Date.now(),
                    action: 'created',
                    status: taskData.status
                }]
            };
            this.data.tasks.push(newTask);
        }

        this.saveData();
        this.closeModals();
        this.renderTasks();
    },

    // Отображение отгрузок
    renderShipments() {
        const shipmentsList = document.getElementById('shipmentsList');
        const calendarViewCheckbox = document.getElementById('shipmentsCalendarViewCheckbox');
        const isCalendarView = calendarViewCheckbox && calendarViewCheckbox.checked;
        
        if (this.data.shipments.length === 0) {
            shipmentsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Нет отгрузок</p>';
            return;
        }

        if (isCalendarView) {
            // Режим: График отгрузок (по дням)
            this.renderShipmentsCalendar(shipmentsList);
        } else {
            // Режим: Отгрузки (список)
            this.renderShipmentsList(shipmentsList);
        }
    },

    // Отображение отгрузок списком
    renderShipmentsList(container) {
        // Сортируем по дате
        const sorted = [...this.data.shipments].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        // Компактная таблица
        let html = '<div class="shipments-table">';
        
        sorted.forEach((ship, index) => {
            const today = new Date().setHours(0, 0, 0, 0);
            const shipDate = new Date(ship.date).setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((shipDate - today) / (1000 * 60 * 60 * 24));
            
            let urgentClass = '';
            let statusText = '';
            
            if (daysUntil < 0) {
                urgentClass = 'urgent';
                statusText = `Просрочено ${Math.abs(daysUntil)} дн`;
            } else if (daysUntil === 0) {
                urgentClass = 'urgent';
                statusText = 'Сегодня!';
            } else if (daysUntil <= 2) {
                urgentClass = 'urgent';
                statusText = `Через ${daysUntil} дн`;
            } else {
                statusText = `Через ${daysUntil} дн`;
            }
            
            const rowClass = index % 2 === 0 ? 'even' : 'odd';
            
            html += `
                <div class="shipment-row ${rowClass} ${urgentClass}">
                    <div class="shipment-cell shipment-project">${ship.project}</div>
                    <div class="shipment-cell shipment-date">${this.formatDate(ship.date)}</div>
                    <div class="shipment-cell shipment-status">${statusText}</div>
                    <div class="shipment-cell shipment-assembler">${ship.assembler || '—'}</div>
                    <div class="shipment-cell shipment-installer">${ship.installer || '—'}</div>
                    <div class="shipment-cell shipment-actions">
                        <button class="btn-icon-small" onclick="ProductionApp.editShipment('${ship.id}')" title="Редактировать">✏️</button>
                        <button class="btn-icon-small" onclick="ProductionApp.deleteShipment('${ship.id}')" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // Отображение отгрузок по дням (календарь)
    renderShipmentsCalendar(container) {
        // Группируем по дням
        const grouped = {};
        this.data.shipments.forEach(ship => {
            const key = ship.dayName || (ship.date ? this.formatDate(ship.date) : 'БЕЗ ДАТЫ');
            if (!grouped[key]) {
                grouped[key] = {
                    date: ship.date,
                    dayName: ship.dayName,
                    items: []
                };
            }
            grouped[key].items.push(ship);
        });

        // Сортируем группы по дате
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'БЕЗ ДАТЫ') return -1;
            if (b === 'БЕЗ ДАТЫ') return 1;
            const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
            const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
            return dateA - dateB;
        });

        let html = '';
        
        sortedKeys.forEach(key => {
            const group = grouped[key];
            const dateStr = group.date ? this.formatDate(group.date) : '';
            
            html += `<div class="day-group">`;
            html += `<div class="day-header">${group.dayName || key}${dateStr ? ` · ${dateStr}` : ''}</div>`;
            
            group.items.forEach((ship, index) => {
                const rowClass = index % 2 === 0 ? 'even' : 'odd';
                
                html += `
                    <div class="item-row ${rowClass}">
                        <span class="item-icon">📦</span>
                        <span class="item-project">${ship.project}</span>
                        <span class="item-installer">${ship.assembler || ship.installer || '—'}</span>
                        <button class="btn-edit" onclick="ProductionApp.editShipment('${ship.id}')">✏️</button>
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        container.innerHTML = html;
    },

    // Отображение монтажей
    renderInstallations() {
        const installationsList = document.getElementById('installationsList');
        const overlayCheckbox = document.getElementById('overlayShipmentsCheckbox');
        const shouldOverlay = overlayCheckbox && overlayCheckbox.checked;
        
        // Собираем данные: монтажи + возможно отгрузки
        let items = [];
        
        if (this.data.installations && this.data.installations.length > 0) {
            items = this.data.installations.map(inst => ({
                ...inst,
                type: 'installation'
            }));
        }
        
        if (shouldOverlay && this.data.shipments && this.data.shipments.length > 0) {
            const shipmentsWithType = this.data.shipments.map(ship => ({
                ...ship,
                type: 'shipment',
                installer: ship.installer || ship.assembler || '' // Для единообразия
            }));
            items = items.concat(shipmentsWithType);
        }
        
        if (items.length === 0) {
            installationsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Нет данных</p>';
            return;
        }

        // Группируем по дням
        const grouped = {};
        items.forEach(item => {
            const key = item.dayName || (item.date ? this.formatDate(item.date) : 'БЕЗ ДАТЫ');
            if (!grouped[key]) {
                grouped[key] = {
                    date: item.date,
                    items: []
                };
            }
            grouped[key].items.push(item);
        });

        // Сортируем группы по дате
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'БЕЗ ДАТЫ') return -1;
            if (b === 'БЕЗ ДАТЫ') return 1;
            const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
            const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
            return dateA - dateB;
        });

        let html = '';
        
        sortedKeys.forEach(dayName => {
            const group = grouped[dayName];
            const dateStr = group.date ? this.formatDate(group.date) : '';
            
            html += `<div class="day-group">`;
            html += `<div class="day-header">${dayName}${dateStr ? ` · ${dateStr}` : ''}</div>`;
            
            group.items.forEach((item, index) => {
                const rowClass = index % 2 === 0 ? 'even' : 'odd';
                const typeClass = item.type === 'shipment' ? 'shipment-item' : 'installation-item';
                const icon = item.type === 'shipment' ? '📦' : '🔧';
                
                html += `
                    <div class="item-row ${rowClass} ${typeClass}">
                        <span class="item-icon">${icon}</span>
                        <span class="item-project">${item.project}</span>
                        <span class="item-installer">${item.installer || '—'}</span>
                        ${item.type === 'installation' ? `<button class="btn-edit" onclick="ProductionApp.editInstallation('${item.id}')">✏️</button>` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
        });
        
        installationsList.innerHTML = html;
        
        // Обновляем время последнего обновления
        const lastUpdate = document.getElementById('installationsLastUpdate');
        if (lastUpdate) {
            const now = new Date();
            lastUpdate.textContent = now.toLocaleString('ru-RU', { 
                day: 'numeric', 
                month: 'short',
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    },

    // Отрисовка одной отгрузки
    renderShipment(ship) {
        // Проверяем валидность даты
        if (!ship.date || ship.date === 'null') {
            return `
                <div class="shipment-item">
                    <div class="shipment-header">
                        <span class="shipment-project">${ship.project}</span>
                        <span class="shipment-date" style="color: red;">Дата не указана</span>
                    </div>
                    <div class="shipment-details">
                        ${ship.assembler ? `Сборщик: ${ship.assembler}` : ''}
                        ${ship.installer ? ` | Монтаж: ${ship.installer}` : ''}
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="btn-icon" onclick="ProductionApp.editShipment('${ship.id}')" style="margin-left: 10px;">✏️</button>
                        <button class="btn-icon" onclick="ProductionApp.deleteShipment('${ship.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }

        const today = new Date().setHours(0, 0, 0, 0);
        const shipDate = new Date(ship.date).setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((shipDate - today) / (1000 * 60 * 60 * 24));
        
        let urgentClass = '';
        let statusClass = '';
        let statusText = '';

        if (daysUntil < 0) {
            urgentClass = 'urgent';
            statusText = `Просрочено на ${Math.abs(daysUntil)} дн`;
        } else if (daysUntil <= 2) {
            urgentClass = 'urgent';
            statusText = daysUntil === 0 ? 'Сегодня!' : `Через ${daysUntil} дн`;
        } else {
            statusClass = 'ready';
            statusText = `Через ${daysUntil} дн`;
        }

        return `
            <div class="shipment-item ${urgentClass}">
                <div class="shipment-header">
                    <span class="shipment-project">${ship.project}</span>
                    <span class="shipment-date">${this.formatDate(ship.date)}</span>
                </div>
                <div class="shipment-details">
                    ${ship.assembler ? `Сборщик: ${ship.assembler}` : ''}
                    ${ship.installer ? ` | Монтаж: ${ship.installer}` : ''}
                </div>
                ${ship.notes ? `<div style="font-size: 13px; color: #64748b; margin-top: 5px;">${ship.notes}</div>` : ''}
                <div style="margin-top: 10px;">
                    <span class="shipment-status status-${statusClass}">${statusText}</span>
                    <button class="btn-icon" onclick="ProductionApp.editShipment('${ship.id}')" style="margin-left: 10px;">✏️</button>
                    <button class="btn-icon" onclick="ProductionApp.deleteShipment('${ship.id}')">🗑️</button>
                </div>
            </div>
        `;
    },

    // Открытие модального окна отгрузки
    openShipmentModal(shipment = null) {
        this.editingShipment = shipment;
        const modal = document.getElementById('shipmentModal');
        const title = document.getElementById('shipmentModalTitle');

        if (shipment) {
            title.textContent = 'Редактировать отгрузку';
            document.getElementById('shipmentProject').value = shipment.project;
            document.getElementById('shipmentDate').value = shipment.date;
            document.getElementById('shipmentAssembler').value = shipment.assembler || '';
            document.getElementById('shipmentInstaller').value = shipment.installer || '';
            document.getElementById('shipmentNotes').value = shipment.notes || '';
        } else {
            title.textContent = 'Новая отгрузка';
            document.getElementById('shipmentForm').reset();
        }

        modal.classList.add('show');
    },

    // Редактирование отгрузки
    editShipment(shipmentId) {
        const shipment = this.data.shipments.find(s => s.id == shipmentId);
        if (shipment) {
            this.openShipmentModal(shipment);
        }
    },

    // Сохранение отгрузки
    saveShipment(e) {
        e.preventDefault();

        const shipmentData = {
            project: document.getElementById('shipmentProject').value,
            date: document.getElementById('shipmentDate').value,
            assembler: document.getElementById('shipmentAssembler').value,
            installer: document.getElementById('shipmentInstaller').value,
            notes: document.getElementById('shipmentNotes').value,
            status: 'planned'
        };

        if (this.editingShipment) {
            const shipment = this.data.shipments.find(s => s.id === this.editingShipment.id);
            Object.assign(shipment, shipmentData);
            shipment.updated = Date.now();
        } else {
            const newShipment = {
                ...shipmentData,
                id: Date.now() + Math.random(),
                created: Date.now(),
                updated: Date.now()
            };
            this.data.shipments.push(newShipment);
        }

        this.saveData();
        this.closeModals();
        this.renderShipments();
    },

    // Удаление отгрузки
    deleteShipment(shipmentId) {
        if (!confirm('Удалить отгрузку?')) return;

        this.data.shipments = this.data.shipments.filter(s => s.id != shipmentId);
        this.saveData();
        this.renderShipments();
    },

    // Открытие модального окна для создания монтажа
    openInstallationModal() {
        this.currentEditingInstallationId = null;
        
        // Очищаем форму
        document.getElementById('installationProject').value = '';
        document.getElementById('installationDate').value = '';
        document.getElementById('installationInstaller').value = '';
        
        // Показываем модальное окно
        const modal = document.getElementById('installationModal');
        modal.classList.add('show');
    },

    // Редактирование монтажа через модальное окно
    editInstallation(installationId) {
        const installation = this.data.installations.find(i => i.id == installationId);
        if (!installation) return;

        // Сохраняем ID для последующего сохранения
        this.currentEditingInstallationId = installationId;

        // Заполняем форму
        document.getElementById('installationProject').value = installation.project || '';
        document.getElementById('installationDate').value = installation.date || '';
        document.getElementById('installationInstaller').value = installation.installer || '';

        // Показываем модальное окно
        const modal = document.getElementById('installationModal');
        modal.classList.add('show');
    },

    // Сохранение изменений монтажа (создание или редактирование)
    saveInstallation(event) {
        event.preventDefault();

        // Получаем данные из формы
        const newProject = document.getElementById('installationProject').value.trim();
        const newDate = document.getElementById('installationDate').value;
        const newInstaller = document.getElementById('installationInstaller').value.trim();

        if (!newProject) {
            alert('Укажите проект');
            return;
        }

        if (this.currentEditingInstallationId) {
            // Режим редактирования
            const installation = this.data.installations.find(i => i.id == this.currentEditingInstallationId);
            if (!installation) return;

            installation.project = newProject;
            installation.installer = newInstaller;
            installation.updated = Date.now();

            // Пересчитываем dayName и date
            if (newDate) {
                installation.date = newDate;
                const date = new Date(newDate + 'T00:00:00');
                const dayNames = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];
                installation.dayName = dayNames[date.getDay()];
            } else {
                installation.date = null;
                installation.dayName = 'БЕЗ ДАТЫ';
            }
        } else {
            // Режим создания
            const newInstallation = {
                id: Date.now().toString(),
                project: newProject,
                date: newDate || null,
                installer: newInstaller,
                created: Date.now(),
                updated: Date.now()
            };

            // Вычисляем dayName
            if (newDate) {
                const date = new Date(newDate + 'T00:00:00');
                const dayNames = ['ВОСКРЕСЕНЬЕ', 'ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА'];
                newInstallation.dayName = dayNames[date.getDay()];
            } else {
                newInstallation.dayName = 'БЕЗ ДАТЫ';
            }

            this.data.installations.push(newInstallation);
        }

        this.saveData();
        this.closeModals();
        this.renderInstallations();
    },

    // Удаление монтажа
    deleteInstallation(installationId) {
        if (!confirm('Удалить монтаж?')) return;

        this.data.installations = this.data.installations.filter(i => i.id != installationId);
        this.saveData();
        this.renderInstallations();
    },

    // Закрытие всех модальных окон
    // Экспорт данных в JSON
    exportToJSON() {
        const dataToExport = {
            version: '2.9.0',
            exportDate: new Date().toISOString(),
            data: this.data
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `operativka-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('✅ Данные экспортированы в JSON!');
    },

    // Импорт данных из JSON
    async importFromJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            // Проверяем структуру
            if (!imported.data || !imported.data.tasks) {
                throw new Error('Неверный формат файла');
            }

            // Спрашиваем подтверждение
            if (!confirm('Импорт заменит все текущие данные. Продолжить?')) {
                event.target.value = ''; // Очищаем input
                return;
            }

            // Загружаем данные
            this.data = imported.data;
            this.saveData();
            
            // Перерисовываем все
            this.renderTasks();
            this.renderShipments();
            this.renderInstallations();

            alert(`✅ Данные импортированы!\nВерсия: ${imported.version || 'неизвестно'}\nДата экспорта: ${imported.exportDate ? new Date(imported.exportDate).toLocaleString('ru') : 'неизвестно'}`);
        } catch (error) {
            alert(`❌ Ошибка импорта: ${error.message}`);
            console.error('Import error:', error);
        }

        event.target.value = ''; // Очищаем input для следующего импорта
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
        this.editingTask = null;
        this.editingShipment = null;
        this.currentEditingInstallationId = null;
    },

    // Обработка действий FAB меню
    handleFabAction(action) {
        switch(action) {
            case 'addTask':
                this.openTaskModal();
                break;
            case 'addShipment':
                this.openShipmentModal();
                break;
            case 'addInstallation':
                this.openInstallationModal();
                break;
            case 'export':
                this.exportToJSON();
                break;
            case 'import':
                document.getElementById('importJsonFile').click();
                break;
            case 'copyAll':
                this.copyFullToMessenger();
                break;
            case 'print':
                this.print();
                break;
            case 'clear':
                this.clearAppData();
                break;
            case 'copyPlan':
                // Копируем план в зависимости от текущей вкладки
                if (this.currentTab === 'shipments') {
                    this.copyShipmentsPlan();
                } else if (this.currentTab === 'installations') {
                    this.copyInstallationsPlan();
                }
                break;
        }
    },

    // Копирование плана отгрузок в мессенджер
    async copyShipmentsPlan() {
        if (this.data.shipments.length === 0) {
            alert('Нет отгрузок для копирования');
            return;
        }

        let text = '📦**ПЛАН ОТГРУЗОК**\n\n';

        // Группируем по дням
        const grouped = {};
        this.data.shipments.forEach(ship => {
            const key = ship.dayName || (ship.date ? this.formatDate(ship.date) : 'БЕЗ ДАТЫ');
            if (!grouped[key]) {
                grouped[key] = {
                    date: ship.date,
                    dayName: ship.dayName,
                    items: []
                };
            }
            grouped[key].items.push(ship);
        });

        // Сортируем группы
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'БЕЗ ДАТЫ') return -1;
            if (b === 'БЕЗ ДАТЫ') return 1;
            const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
            const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
            return dateA - dateB;
        });

        sortedKeys.forEach(key => {
            const group = grouped[key];
            const dateStr = group.date ? this.formatDate(group.date) : '';
            
            text += `**${group.dayName || key}${dateStr ? ' · ' + dateStr : ''}**\n`;
            
            group.items.forEach(ship => {
                text += `● ${ship.project}`;
                if (ship.assembler || ship.installer) {
                    text += ` | __${ship.assembler || ship.installer}__`;
                }
                text += '\n';
            });
            text += '\n';
        });

        await this.copyToClipboard(text);
    },

    // Копирование плана монтажа в мессенджер
    async copyInstallationsPlan() {
        if (!this.data.installations || this.data.installations.length === 0) {
            alert('Нет монтажей для копирования');
            return;
        }

        let text = '🔧**ПЛАН МОНТАЖА**\n\n';

        // Группируем по дням
        const grouped = {};
        this.data.installations.forEach(inst => {
            const key = inst.dayName || 'БЕЗ ДАТЫ';
            if (!grouped[key]) {
                grouped[key] = {
                    date: inst.date,
                    items: []
                };
            }
            grouped[key].items.push(inst);
        });

        // Сортируем группы
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'БЕЗ ДАТЫ') return -1;
            if (b === 'БЕЗ ДАТЫ') return 1;
            const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
            const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
            return dateA - dateB;
        });

        sortedKeys.forEach(dayName => {
            const group = grouped[dayName];
            const dateStr = group.date ? this.formatDate(group.date) : '';
            
            text += `**${dayName}${dateStr ? ' · ' + dateStr : ''}**\n`;
            
            group.items.forEach(inst => {
                text += `● ${inst.project}`;
                if (inst.installer) {
                    text += ` | __${inst.installer}__`;
                }
                text += '\n';
            });
            text += '\n';
        });

        await this.copyToClipboard(text);
    },

    // Копирование полного вывода в мессенджер
    async copyFullToMessenger() {
        let text = '**ОПЕРАТИВКА ПРОИЗВОДСТВО**\n';
        text += `__${this.formatDate(new Date().toISOString().split('T')[0])}__\n\n`;

        // Проверяем чекбокс наслоения
        const overlayCheckbox = document.getElementById('overlayShipmentsCheckbox');
        const shouldOverlay = overlayCheckbox && overlayCheckbox.checked;

        // Отгрузки и монтажи
        if (shouldOverlay && (this.data.installations.length > 0 || this.data.shipments.length > 0)) {
            text += '**ОТГРУЗКИ И МОНТАЖИ**\n\n';
            
            let items = [];
            if (this.data.installations) {
                items = items.concat(this.data.installations.map(inst => ({...inst, type: 'installation'})));
            }
            if (this.data.shipments) {
                items = items.concat(this.data.shipments.map(ship => ({...ship, type: 'shipment'})));
            }
            
            const grouped = {};
            items.forEach(item => {
                const key = item.dayName || (item.date ? this.formatDate(item.date) : 'БЕЗ ДАТЫ');
                if (!grouped[key]) {
                    grouped[key] = {date: item.date, dayName: item.dayName, items: []};
                }
                grouped[key].items.push(item);
            });
            
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
                if (a === 'БЕЗ ДАТЫ') return -1;
                if (b === 'БЕЗ ДАТЫ') return 1;
                const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                return dateA - dateB;
            });
            
            sortedKeys.forEach(key => {
                const group = grouped[key];
                const dateStr = group.date ? this.formatDate(group.date) : '';
                text += `**${group.dayName || key}${dateStr ? ' · ' + dateStr : ''}**\n`;
                
                group.items.forEach(item => {
                    const installer = item.installer || item.assembler || '';
                    text += `● ${item.project}`;
                    if (installer) text += ` | __${installer}__`;
                    text += '\n';
                });
                text += '\n';
            });
        } else {
            // Отдельно отгрузки и монтажи
            if (this.data.shipments.length > 0) {
                text += '📦**ПЛАН ОТГРУЗОК**\n\n';
                const grouped = {};
                this.data.shipments.forEach(ship => {
                    const key = ship.dayName || (ship.date ? this.formatDate(ship.date) : 'БЕЗ ДАТЫ');
                    if (!grouped[key]) {
                        grouped[key] = {date: ship.date, dayName: ship.dayName, items: []};
                    }
                    grouped[key].items.push(ship);
                });
                
                const sortedKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === 'БЕЗ ДАТЫ') return -1;
                    if (b === 'БЕЗ ДАТЫ') return 1;
                    const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                    const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                    return dateA - dateB;
                });
                
                sortedKeys.forEach(key => {
                    const group = grouped[key];
                    const dateStr = group.date ? this.formatDate(group.date) : '';
                    text += `**${group.dayName || key}${dateStr ? ' · ' + dateStr : ''}**\n`;
                    group.items.forEach(ship => {
                        text += `● ${ship.project}`;
                        if (ship.assembler || ship.installer) text += ` | __${ship.assembler || ship.installer}__`;
                        text += '\n';
                    });
                    text += '\n';
                });
            }
            
            if (this.data.installations && this.data.installations.length > 0) {
                text += '🔧**ПЛАН МОНТАЖА**\n\n';
                const grouped = {};
                this.data.installations.forEach(inst => {
                    const key = inst.dayName || 'БЕЗ ДАТЫ';
                    if (!grouped[key]) {
                        grouped[key] = {date: inst.date, items: []};
                    }
                    grouped[key].items.push(inst);
                });
                
                const sortedKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === 'БЕЗ ДАТЫ') return -1;
                    if (b === 'БЕЗ ДАТЫ') return 1;
                    const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                    const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                    return dateA - dateB;
                });
                
                sortedKeys.forEach(dayName => {
                    const group = grouped[dayName];
                    const dateStr = group.date ? this.formatDate(group.date) : '';
                    text += `**${dayName}${dateStr ? ' · ' + dateStr : ''}**\n`;
                    group.items.forEach(inst => {
                        text += `● ${inst.project}`;
                        if (inst.installer) text += ` | __${inst.installer}__`;
                        text += '\n';
                    });
                    text += '\n';
                });
            }
        }

        // Задачи
        const activeTasks = this.data.tasks.filter(t => t.status !== 'done');
        if (activeTasks.length > 0) {
            text += '**ЗАДАЧИ**\n\n';
            
            const categories = {
                'Задачи по объекту': [],
                'Столяра': [],
                'Малярка': [],
                'Сборщики': []
            };
            
            activeTasks.forEach(task => {
                const category = task.category || 'Задачи по объекту';
                if (categories[category]) {
                    categories[category].push(task);
                }
            });
            
            Object.entries(categories).forEach(([categoryName, tasks]) => {
                if (tasks.length === 0) return;
                
                text += `**${categoryName}**:\n\n`;
                
                if (categoryName === 'Столяра' || categoryName === 'Сборщики' || categoryName === 'Задачи по объекту') {
                    const grouped = this.groupByAssignee(tasks);
                    Object.entries(grouped).forEach(([assignee, assigneeTasks]) => {
                        text += `**${assignee}**:\n`;
                        assigneeTasks.forEach(task => {
                            text += `● `;
                            if (task.project !== 'Без проекта') text += `${task.project} | `;
                            text += `${task.title}\n`;
                        });
                        text += '\n';
                    });
                } else {
                    tasks.forEach(task => {
                        text += `● `;
                        if (task.project !== 'Без проекта') text += `${task.project} | `;
                        text += `${task.title}`;
                        if (task.assignee && task.assignee !== 'Без исполнителя' && task.assignee !== 'Малярка') {
                            text += ` __(${task.assignee})__`;
                        }
                        text += '\n';
                    });
                    text += '\n';
                }
            });
        }

        await this.copyToClipboard(text);
    },

    // Копирование в буфер обмена
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            alert('✅ Скопировано в буфер обмена!');
        } catch (err) {
            console.error('Ошибка копирования:', err);
            alert('❌ Не удалось скопировать. Попробуйте еще раз.');
        }
    },

    // Печать
    print() {
        const printContent = document.querySelector('.print-content');
        const printDate = document.querySelector('.print-date');
        
        printDate.textContent = `Дата: ${this.formatDate(new Date().toISOString().split('T')[0])}`;

        // Генерируем содержимое для печати
        let html = '';

        // Проверяем чекбокс наслоения
        const overlayCheckbox = document.getElementById('overlayShipmentsCheckbox');
        const shouldOverlay = overlayCheckbox && overlayCheckbox.checked;

        // Если чекбокс включен - показываем объединённо
        if (shouldOverlay && (this.data.installations.length > 0 || this.data.shipments.length > 0)) {
            html += '<div class="print-section">';
            html += '<div class="print-section-title">ОТГРУЗКИ И МОНТАЖИ</div>';
            
            // Объединяем данные
            let items = [];
            
            if (this.data.installations) {
                items = items.concat(this.data.installations.map(inst => ({
                    ...inst,
                    type: 'installation'
                })));
            }
            
            if (this.data.shipments) {
                items = items.concat(this.data.shipments.map(ship => ({
                    ...ship,
                    type: 'shipment'
                })));
            }
            
            // Группируем по дням
            const grouped = {};
            items.forEach(item => {
                const key = item.dayName || (item.date ? this.formatDate(item.date) : 'БЕЗ ДАТЫ');
                if (!grouped[key]) {
                    grouped[key] = {
                        date: item.date,
                        dayName: item.dayName,
                        items: []
                    };
                }
                grouped[key].items.push(item);
            });
            
            // Сортируем группы хронологически
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
                if (a === 'БЕЗ ДАТЫ') return -1;
                if (b === 'БЕЗ ДАТЫ') return 1;
                
                const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                return dateA - dateB;
            });
            
            sortedKeys.forEach(key => {
                const group = grouped[key];
                const dateStr = group.date ? this.formatDate(group.date) : '';
                
                // Заголовок дня с датой
                if (key === 'БЕЗ ДАТЫ') {
                    html += `<div class="print-day-group"><strong>БЕЗ ДАТЫ</strong></div>`;
                } else {
                    html += `<div class="print-day-group"><strong>${group.dayName || key}${dateStr ? ' · ' + dateStr : ''}</strong></div>`;
                }
                
                group.items.forEach(item => {
                    const icon = item.type === 'shipment' ? '📦' : '🔧';
                    const installer = item.installer || item.assembler || '';
                    
                    html += `<div class="print-item">☐ ${icon} ${item.project}`;
                    if (installer) html += ` | ${installer}`;
                    html += '</div>';
                });
            });
            
            html += '</div>';
        } else {
            // Показываем раздельно
            
            // Секция: Отгрузки (План отгрузок - по дням)
            if (this.data.shipments.length > 0) {
                html += '<div class="print-section">';
                html += '<div class="print-section-title">ПЛАН ОТГРУЗОК</div>';
                
                // Группируем по дням
                const grouped = {};
                this.data.shipments.forEach(ship => {
                    const key = ship.dayName || (ship.date ? this.formatDate(ship.date) : 'БЕЗ ДАТЫ');
                    if (!grouped[key]) {
                        grouped[key] = {
                            date: ship.date,
                            dayName: ship.dayName,
                            items: []
                        };
                    }
                    grouped[key].items.push(ship);
                });
                
                // Сортируем группы
                const sortedKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === 'БЕЗ ДАТЫ') return -1;
                    if (b === 'БЕЗ ДАТЫ') return 1;
                    
                    const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                    const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                    return dateA - dateB;
                });
                
                sortedKeys.forEach(key => {
                    const group = grouped[key];
                    const dateStr = group.date ? this.formatDate(group.date) : '';
                    
                    html += `<div class="print-day-group"><strong>${group.dayName || key}${dateStr ? ' · ' + dateStr : ''}</strong></div>`;
                    
                    group.items.forEach(ship => {
                        html += `<div class="print-item">☐ ${ship.project}`;
                        if (ship.assembler || ship.installer) {
                            html += ` | ${ship.assembler || ship.installer}`;
                        }
                        html += '</div>';
                    });
                });

                html += '</div>';
            }
            
            // Секция: Монтажи
            if (this.data.installations && this.data.installations.length > 0) {
                html += '<div class="print-section">';
                html += '<div class="print-section-title">МОНТАЖИ</div>';
                
                // Группируем по дням
                const grouped = {};
                this.data.installations.forEach(inst => {
                    const key = inst.dayName || 'БЕЗ ДАТЫ';
                    if (!grouped[key]) {
                        grouped[key] = {
                            date: inst.date,
                            items: []
                        };
                    }
                    grouped[key].items.push(inst);
                });
                
                // Сортируем группы
                const sortedKeys = Object.keys(grouped).sort((a, b) => {
                    if (a === 'БЕЗ ДАТЫ') return -1;
                    if (b === 'БЕЗ ДАТЫ') return 1;
                    
                    const dateA = grouped[a].date ? new Date(grouped[a].date) : new Date(0);
                    const dateB = grouped[b].date ? new Date(grouped[b].date) : new Date(0);
                    return dateA - dateB;
                });
                
                sortedKeys.forEach(dayName => {
                    const group = grouped[dayName];
                    const dateStr = group.date ? this.formatDate(group.date) : '';
                    
                    html += `<div class="print-day-group"><strong>${dayName}${dateStr ? ' · ' + dateStr : ''}</strong></div>`;
                    
                    group.items.forEach(inst => {
                        html += `<div class="print-item">☐ ${inst.project}`;
                        if (inst.installer) html += ` | ${inst.installer}`;
                        html += '</div>';
                    });
                });
                
                html += '</div>';
            }
        }

        // Секция: Задачи - КОМПАКТНЫЙ ФОРМАТ
        const activeTasks = this.data.tasks.filter(t => t.status !== 'done');
        if (activeTasks.length > 0) {
            html += '<div class="print-section">';
            html += '<div class="print-section-title">ЗАДАЧИ</div>';

            // Группируем по категориям
            const categories = {
                'Задачи по объекту': [],
                'Столяра': [],
                'Малярка': [],
                'Сборщики': []
            };

            activeTasks.forEach(task => {
                const category = task.category || 'Задачи по объекту';
                if (categories[category]) {
                    categories[category].push(task);
                }
            });

            // Выводим по категориям
            Object.entries(categories).forEach(([categoryName, tasks]) => {
                if (tasks.length === 0) return;

                html += `<div class="print-category-title">${categoryName}:</div>`;

                // Для Столяров и Сборщиков - группируем по исполнителям
                if (categoryName === 'Столяра' || categoryName === 'Сборщики') {
                    const grouped = this.groupByAssignee(tasks);

                    Object.entries(grouped).forEach(([assignee, assigneeTasks]) => {
                        html += `<div class="print-assignee-group">${assignee}:</div>`;
                        
                        assigneeTasks.forEach(task => {
                            html += `<div class="print-task-compact">☐ `;
                            
                            if (task.project !== 'Без проекта') {
                                html += `${task.project} | `;
                            }
                            
                            html += task.title;
                            html += '</div>';
                        });
                    });
                } else {
                    // Для остальных - без группировки по исполнителям
                    tasks.forEach(task => {
                        html += `<div class="print-task-compact">☐ `;
                        
                        if (task.project !== 'Без проекта') {
                            html += `${task.project} | `;
                        }
                        
                        html += task.title;
                        
                        // Исполнитель в конце (если есть и не Малярка)
                        if (task.assignee && task.assignee !== 'Без исполнителя' && task.assignee !== 'Малярка') {
                            html += ` <span class="print-assignee-inline">(${task.assignee})</span>`;
                        }
                        
                        html += '</div>';
                    });
                }
            });

            html += '</div>';
        }

        printContent.innerHTML = html;

        // Печатаем
        window.print();
    },

    // Уведомления
    showNotifications() {
        const notifications = this.checkNotifications();
        const banner = document.getElementById('notificationsBanner');

        if (notifications.length === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'block';
        banner.innerHTML = notifications.map(n => 
            `<div class="notification">${n}</div>`
        ).join('');
    },

    checkNotifications() {
        const today = new Date().setHours(0, 0, 0, 0);
        const notifications = [];

        // Просроченные дедлайны
        this.data.tasks.forEach(task => {
            if (task.deadline && task.status !== 'done') {
                const deadline = new Date(task.deadline).setHours(0, 0, 0, 0);
                if (deadline < today) {
                    notifications.push(`⚠️ Просрочено: ${task.title} (${task.project})`);
                }
            }
        });

        // Долгие блокеры
        this.data.tasks.forEach(task => {
            if (task.status === 'waiting' && task.blocker) {
                const days = (Date.now() - task.updated) / (1000 * 60 * 60 * 24);
                if (days > 3) {
                    notifications.push(`⏰ Долго ждем: ${task.blocker} для ${task.project} (${Math.floor(days)} дн)`);
                }
            }
        });

        // Скорые отгрузки
        this.data.shipments.forEach(ship => {
            const shipDate = new Date(ship.date).setHours(0, 0, 0, 0);
            const daysUntil = (shipDate - today) / (1000 * 60 * 60 * 24);
            
            if (daysUntil >= 0 && daysUntil <= 2) {
                const relatedTasks = this.data.tasks.filter(t => 
                    t.project === ship.project && t.status !== 'done'
                );
                
                if (relatedTasks.length > 0) {
                    const daysText = daysUntil === 0 ? 'СЕГОДНЯ' : `через ${Math.ceil(daysUntil)} дн`;
                    notifications.push(`📦 Отгрузка ${ship.project} ${daysText}: ${relatedTasks.length} задач не готово`);
                }
            }
        });

        return notifications.slice(0, 5); // Максимум 5 уведомлений
    },

    // Обновление времени последнего изменения
    updateLastUpdateTime() {
        const lastUpdate = document.getElementById('lastUpdate');
        if (!lastUpdate) return;
        
        const now = new Date();
        lastUpdate.textContent = `Обновлено: ${now.toLocaleTimeString('ru-RU')}`;
    },

    // Вспомогательные функции
    formatDate(dateStr) {
        if (!dateStr || dateStr === 'null') return 'Нет даты';
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Неверная дата';
        
        const months = [
            'янв', 'фев', 'мар', 'апр', 'май', 'июн',
            'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
        ];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    },

    plural(num, one, two, five) {
        let n = Math.abs(num) % 100;
        let n1 = n % 10;
        if (n > 10 && n < 20) return five;
        if (n1 > 1 && n1 < 5) return two;
        if (n1 === 1) return one;
        return five;
    },

    render() {
        this.renderTasks();
        this.renderShipments();
        // renderNotes() убран - не нужно показывать старые заметки
        
        // Инициализация видимости секции "В Telegram" в FAB
        const fabTelegramSection = document.getElementById('fabTelegramSection');
        if (fabTelegramSection) {
            // По умолчанию скрываем, так как currentTab = 'input'
            if (this.currentTab === 'shipments' || this.currentTab === 'installations') {
                fabTelegramSection.classList.remove('hidden');
            } else {
                fabTelegramSection.classList.add('hidden');
            }
        }
    }
};

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    ProductionApp.init();
});
