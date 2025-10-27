// parser.js - Новый парсер для структурированного ввода

const Parser = {
    
    // Парсинг структурированных данных из формы
    parseStructuredForm(formData) {
        const result = {
            tasks: [],
            shipments: [],
            installations: []
        };

        // 1. Задачи по объектам
        if (formData.projects && formData.projects.length > 0) {
            formData.projects.forEach(projectData => {
                if (!projectData.name || !projectData.tasks) return;
                
                const projectName = projectData.name.trim();
                const taskLines = projectData.tasks.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                taskLines.forEach(taskText => {
                    const task = this.createTaskFromText(taskText, {
                        project: projectName,
                        type: 'production',
                        category: 'Задачи по объекту'
                    });
                    result.tasks.push(task);
                });
            });
        }

        // 2. Столярка (с исполнителями)
        if (formData.carpentry) {
            const carpentryTasks = this.parseAssigneeSection(formData.carpentry, 'carpentry', 'Столяра');
            result.tasks.push(...carpentryTasks);
        }

        // 3. Малярка (без исполнителей)
        if (formData.painting) {
            const paintingLines = formData.painting.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            paintingLines.forEach(taskText => {
                const task = this.createTaskFromText(taskText, {
                    type: 'painting',
                    assignee: 'Малярка',
                    category: 'Малярка'
                });
                result.tasks.push(task);
            });
        }

        // 4. Сборка (с исполнителями)
        if (formData.assembly) {
            const assemblyTasks = this.parseAssigneeSection(formData.assembly, 'assembly', 'Сборщики');
            result.tasks.push(...assemblyTasks);
        }

        // 5. Отгрузки
        if (formData.shipments) {
            const shipments = this.parseShipmentsSection(formData.shipments);
            result.shipments.push(...shipments);
        }

        // 5.5. План отгрузки
        if (formData.shipmentsPlan) {
            const plannedShipments = this.parseShipmentsPlan(formData.shipmentsPlan);
            result.shipments.push(...plannedShipments);
        }

        // 6. Монтажи
        if (formData.installation) {
            const installations = this.parseInstallations(formData.installation);
            result.installations.push(...installations);
        }

        return result;
    },

    // Парсинг секции с исполнителями (Столярка, Сборка)
    parseAssigneeSection(text, taskType, category = 'Задачи по объекту') {
        const tasks = [];
        const lines = text.split('\n').map(line => line.trim());
        let currentAssignee = '';

        lines.forEach(line => {
            if (!line) return;

            // Проверяем формат "Имя:"
            const assigneeOnlyMatch = line.match(/^([А-ЯЁ][а-яё]+):\s*$/);
            if (assigneeOnlyMatch) {
                currentAssignee = assigneeOnlyMatch[1];
                return;
            }

            // Проверяем формат "Имя: задача"
            const assigneeWithTaskMatch = line.match(/^([А-ЯЁ][а-яё]+):\s*(.+)$/);
            if (assigneeWithTaskMatch) {
                currentAssignee = assigneeWithTaskMatch[1];
                const taskText = assigneeWithTaskMatch[2].trim();
                if (taskText) {
                    const task = this.createTaskFromText(taskText, {
                        assignee: currentAssignee,
                        type: taskType,
                        category: category
                    });
                    tasks.push(task);
                }
                return;
            }

            // Это задача для текущего исполнителя
            if (currentAssignee) {
                // Убираем начальные маркеры * - •
                const cleanText = line.replace(/^[\*\-•]\s*/, '');
                const task = this.createTaskFromText(cleanText, {
                    assignee: currentAssignee,
                    type: taskType,
                    category: category
                });
                tasks.push(task);
            } else {
                // Задача без исполнителя - пытаемся угадать
                const task = this.createTaskFromText(line, {
                    type: taskType,
                    category: category
                });
                tasks.push(task);
            }
        });

        return tasks;
    },

    // Парсинг отгрузок
    parseShipmentsSection(text) {
        const shipments = [];
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        lines.forEach(line => {
            const shipment = this.parseShipmentLine(line);
            if (shipment) {
                shipments.push(shipment);
            }
        });

        return shipments;
    },

    // Парсинг одной строки отгрузки
    parseShipmentLine(line) {
        console.log('=== ПАРСИНГ ОТГРУЗКИ ===');
        console.log('Входная строка:', line);
        
        // Разбиваем по первому " - "
        const dashIndex = line.indexOf(' - ');
        if (dashIndex === -1) {
            console.warn('❌ Не найден разделитель " - " в строке:', line);
            return null;
        }

        const project = line.substring(0, dashIndex).trim();
        const restText = line.substring(dashIndex + 3).trim();

        console.log('✓ Проект:', project);
        console.log('✓ Остаток текста:', restText);

        // Извлекаем дату - ищем паттерн "число месяц" или "до число месяц"
        const datePatterns = [
            /(\d+(?:\s+или\s+\d+)?(?:-\d+)?\s+[а-яё]+)/i,  // "5 ноября", "6-7 ноября", "7 или 10 ноября"
            /до\s+(\d+\s+[а-яё]+)/i                        // "до 15 ноября"
        ];

        let dateStr = null;
        for (const pattern of datePatterns) {
            const match = restText.match(pattern);
            if (match) {
                dateStr = match[1];
                console.log('✓ Найдена строка даты:', dateStr);
                break;
            }
        }

        if (!dateStr) {
            console.warn('❌ Дата не найдена в тексте:', restText);
        }

        // Извлекаем сборщика (в скобках)
        const assemblerMatch = restText.match(/\(([^)]+)\)/);
        const assembler = assemblerMatch ? assemblerMatch[1].trim() : '';
        console.log('✓ Сборщик:', assembler || 'нет');

        // Извлекаем монтажника (после "монтаж" БЕЗ скобок или ДО скобок)
        // "монтаж Денис" → Денис
        // "монтаж (Иваны)" → нет (Иваны в скобках = сборщик)
        const installerMatch = restText.match(/монтаж\s+([А-ЯЁ][а-яё]+(?:\s+\+\s+[А-ЯЁ][а-яё]+)*)(?:\s|$)/i);
        const installer = installerMatch ? installerMatch[1].trim() : '';
        console.log('✓ Монтажник:', installer || 'нет');

        const parsedDate = this.parseDate(dateStr);
        console.log('✓ Распарсенная дата:', parsedDate);
        console.log('===================\n');

        return {
            id: Date.now() + Math.random(),
            project: project,
            date: parsedDate,
            assembler: assembler,
            installer: installer,
            status: 'planned',
            notes: '',
            created: Date.now(),
            updated: Date.now()
        };
    },

    // Создание задачи из текста
    createTaskFromText(text, options = {}) {
        const project = options.project || this.extractProject(text);
        const deadline = this.extractDeadline(text);
        const blocker = this.extractBlocker(text);
        const assignee = options.assignee || this.guessAssignee(text);

        return {
            id: Date.now() + Math.random(),
            project: project,
            title: text,
            assignee: assignee,
            status: blocker ? 'waiting' : 'in_progress',
            type: options.type || 'production',
            category: options.category || 'Задачи по объекту',
            deadline: deadline,
            blocker: blocker,
            priority: 'normal',
            created: Date.now(),
            updated: Date.now(),
            history: [{
                timestamp: Date.now(),
                action: 'created',
                status: blocker ? 'waiting' : 'in_progress'
            }]
        };
    },

    // Извлечение проекта из текста
    extractProject(text) {
        // Паттерны для поиска названий проектов
        const patterns = [
            // "Охтинский парк", "Новая рига"
            /([А-ЯЁ][а-яё]+(?:\s+[а-яё]+)?)\s*(?:-|–|—)/,
            // В начале строки большими буквами
            /^([А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?)/,
            // Известные проекты
            /(Доминанта|Левел|Муравьев|Петровская|Жизневская|Лобачева|Данилушкина|Охтинский|Токсово|Привилегия|Рылеева|Шидловский|Пикунов|Новая\s+рига)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'Без проекта';
    },

    // Извлечение дедлайна
    extractDeadline(text) {
        const patterns = [
            /до\s+(\d+\s+\w+)/i,
            /к\s+(\d+\s+\w+|\w+)/i,
            /(\d+\s+\w+)/,
            /(\d+-\d+\s+\w+)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return this.parseDate(match[1]);
            }
        }

        return null;
    },

    // Извлечение блокера
    extractBlocker(text) {
        const patterns = [
            /ждем?\s+([^-\n]+?)(?:\s*(?:-|$|\()|,)/i,
            /ожида[ею][тм]\s+([^-\n]+?)(?:\s*(?:-|$|\()|,)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return null;
    },

    // Угадываем исполнителя по ключевым словам
    guessAssignee(text) {
        const lower = text.toLowerCase();
        
        const keywords = {
            'Максим': ['прихожую', 'разобра', 'дособра'],
            'Владимир': ['кухн', '1812'],
            'Вова': ['фасад', 'витрин', 'двер', 'профил'],
            'Денис': ['монтаж', 'отгрузк', 'новая рига'],
            'Шероз': ['гардероб', 'шр'],
            'Антон': ['шкаф', 'радиус', 'кровать'],
            'Артем': ['откос', 'лиственниц'],
            'Константин': ['библиотек', 'столик', 'тумб'],
            'Андрей': ['тв зон', 'тумб']
        };

        for (const [assignee, words] of Object.entries(keywords)) {
            if (words.some(word => lower.includes(word))) {
                return assignee;
            }
        }

        return '';
    },

    // Парсинг даты
    parseDate(dateStr) {
        if (!dateStr) return null;

        const months = {
            'январ': 0, 'феврал': 1, 'март': 2, 'мар': 2, 'апрел': 3,
            'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'август': 7,
            'сентябр': 8, 'октябр': 9, 'ноябр': 10, 'декабр': 11
        };

        const days = {
            'понедельник': 1, 'вторник': 2, 'среда': 3, 'среду': 3,
            'четверг': 4, 'пятница': 5, 'пятницу': 5, 'суббота': 6, 'субботу': 6, 'воскресенье': 0
        };

        // Формат: "5 ноября" или "6-7 ноября" или "7 или 10 ноября"
        const monthMatch = dateStr.match(/(\d+)(?:\s+или\s+\d+)?(?:-\d+)?\s+([а-яё]+)/i);
        if (monthMatch) {
            const day = parseInt(monthMatch[1]);
            const monthName = monthMatch[2].toLowerCase();
            
            for (const [key, monthNum] of Object.entries(months)) {
                if (monthName.includes(key)) {
                    const now = new Date();
                    let year = now.getFullYear();
                    
                    // Если месяц уже прошел в этом году, берем следующий год
                    const targetMonth = new Date(year, monthNum, day);
                    if (targetMonth < now) {
                        year++;
                    }
                    
                    // Форматируем дату вручную чтобы избежать проблем с часовыми поясами
                    const month = String(monthNum + 1).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    return `${year}-${month}-${dayStr}`;
                }
            }
        }

        // Формат: "к среде", "до пятницы"
        for (const [dayName, targetDay] of Object.entries(days)) {
            if (dateStr.toLowerCase().includes(dayName)) {
                const today = new Date();
                const currentDay = today.getDay();
                let daysToAdd = targetDay - currentDay;
                
                if (daysToAdd <= 0) {
                    daysToAdd += 7;
                }
                
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + daysToAdd);
                return targetDate.toISOString().split('T')[0];
            }
        }

        return null;
    },

    // Парсинг плана монтажа
    parseInstallations(text) {
        if (!text || !text.trim()) return [];
        
        const installations = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        let currentDate = null;
        let currentDay = null;
        
        for (const line of lines) {
            // Проверяем заголовок дня: "ПОНЕДЕЛЬНИК 27/10" или "БЕЗ ДАТЫ"
            const dayMatch = line.match(/^([А-ЯЁ]+)\s+(\d{1,2})\/(\d{1,2})$/i);
            if (dayMatch) {
                const dayName = dayMatch[1];
                const day = parseInt(dayMatch[2]);
                const month = parseInt(dayMatch[3]);
                const year = new Date().getFullYear();
                
                currentDay = dayName;
                // Форматируем дату вручную без Date объекта чтобы избежать сдвига
                const monthStr = String(month).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                currentDate = `${year}-${monthStr}-${dayStr}`;
                continue;
            }
            
            // Проверяем "БЕЗ ДАТЫ"
            if (line.match(/^БЕЗ\s+ДАТЫ$/i)) {
                currentDay = 'БЕЗ ДАТЫ';
                currentDate = null;
                continue;
            }
            
            // Проверяем задачу монтажа: "- Проект - Исполнитель"
            if (line.startsWith('- ')) {
                const taskText = line.substring(2).trim();
                
                // Разбиваем по последнему " - " для извлечения исполнителя
                const lastDashIndex = taskText.lastIndexOf(' - ');
                let project = taskText;
                let installer = '';
                
                if (lastDashIndex > 0) {
                    project = taskText.substring(0, lastDashIndex).trim();
                    installer = taskText.substring(lastDashIndex + 3).trim();
                }
                
                installations.push({
                    id: Date.now() + Math.random(),
                    project: project,
                    date: currentDate,
                    dayName: currentDay,
                    installer: installer,
                    created: Date.now(),
                    updated: Date.now()
                });
            }
        }
        
        console.log('📦 Распарсено монтажей:', installations.length);
        return installations;
    },

    // Парсинг плана отгрузки (аналогично монтажам, но проще)
    parseShipmentsPlan(text) {
        if (!text || !text.trim()) return [];
        
        const shipments = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        let currentDate = null;
        let currentDay = null;
        
        for (const line of lines) {
            // Проверяем заголовок дня: "ПОНЕДЕЛЬНИК 27/10"
            const dayMatch = line.match(/^([А-ЯЁ]+)\s+(\d{1,2})\/(\d{1,2})$/i);
            if (dayMatch) {
                const dayName = dayMatch[1];
                const day = parseInt(dayMatch[2]);
                const month = parseInt(dayMatch[3]);
                const year = new Date().getFullYear();
                
                currentDay = dayName;
                // Форматируем дату вручную
                const monthStr = String(month).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                currentDate = `${year}-${monthStr}-${dayStr}`;
                continue;
            }
            
            // Проверяем задачу отгрузки: "- Текст"
            if (line.startsWith('- ')) {
                const project = line.substring(2).trim();
                
                shipments.push({
                    id: Date.now() + Math.random(),
                    project: project,
                    date: currentDate,
                    dayName: currentDay,
                    assembler: '',
                    installer: '',
                    status: 'planned',
                    notes: '',
                    created: Date.now(),
                    updated: Date.now()
                });
            }
        }
        
        console.log('📦 Распарсено отгрузок из плана:', shipments.length);
        return shipments;
    }
};

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Parser;
}
