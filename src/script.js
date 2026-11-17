
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    const DB_URL = 'challenges/db.json';
    const STORAGE_KEY = 'secure-review-progress';

    const difficultyInfo = {
        'very-easy': { label: 'Muito fácil', colorClass: 'very-easy-badge' },
        easy: { label: 'Fácil', colorClass: 'easy-badge' },
        medium: { label: 'Médio', colorClass: 'medium-badge' },
        hard: { label: 'Difícil', colorClass: 'hard-badge' }
    };

    const elements = {
        challengeList: document.getElementById('challenge-list'),
        progressCount: document.getElementById('progress-count'),
        progressValue: document.getElementById('progress-value'),
        progressDescription: document.getElementById('progress-description'),
        breadcrumbTitle: document.getElementById('breadcrumb-title'),
        difficultyBadge: document.getElementById('difficulty-badge'),
        title: document.getElementById('challenge-title'),
        description: document.getElementById('challenge-description'),
        language: document.getElementById('challenge-language'),
        editorLanguage: document.getElementById('editor-language'),
        editorFooterLanguage: document.getElementById('editor-footer-language'),
        editorTabs: document.getElementById('editor-tabs'),
        editorBody: document.getElementById('editor-body'),
        cursorPosition: document.getElementById('editor-cursor-position'),
        challengePosition: document.getElementById('challenge-position'),
        choiceSection: document.getElementById('choice-section'),
        textSection: document.getElementById('text-section'),
        lineSection: document.getElementById('line-section'),
        answerOptions: document.getElementById('answer-options'),
        textAnswer: document.getElementById('text-answer'),
        selectedLines: document.getElementById('selected-lines'),
        answerDivider: document.getElementById('answer-divider'),
        answerFeedback: document.getElementById('answer-feedback'),
        submitAnswer: document.getElementById('submit-answer'),
        skipChallenge: document.getElementById('skip-challenge')
    };

    let challengesByDifficulty = {};
    let allChallenges = [];
    let currentChallenge = null;
    let selectedLine = null;
    let currentFiles = [];
    let progress = loadProgress();

    function loadProgress() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || '{}'
            );

            return stored && typeof stored === 'object' && !Array.isArray(stored)
                ? stored
                : {};
        } catch {
            return {};
        }
    }

    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }

    function isCompleted(challenge) {
        return progress[challenge.id] === true;
    }

    function updateProgress() {
        const completed = allChallenges.filter(isCompleted).length;
        const total = allChallenges.length;
        const percentage = total
            ? Math.round((completed / total) * 100)
            : 0;

        elements.progressCount.textContent = `${completed}/${total}`;
        elements.progressValue.style.width = `${percentage}%`;
        elements.progressDescription.textContent =
            `${percentage}% dos desafios concluídos`;
    }

    function createIcon(className) {
        const icon = document.createElement('i');
        icon.className = className;
        return icon;
    }

    function renderChallengeNavigation() {
        elements.challengeList.replaceChildren();

        Object.entries(difficultyInfo).forEach(([difficulty, info]) => {
            const challenges = challengesByDifficulty[difficulty] || [];

            const group = document.createElement('div');
            group.className = 'difficulty-group';

            const heading = document.createElement('div');
            heading.className = 'difficulty-title';

            const dot = document.createElement('span');
            dot.className = `difficulty-dot ${difficulty}`;

            const label = document.createElement('span');
            label.textContent = info.label;

            const count = document.createElement('span');
            count.className = 'group-count';
            count.textContent = String(challenges.length);

            heading.append(dot, label, count);
            group.appendChild(heading);

            challenges.forEach((challenge) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'challenge-item';
                item.dataset.challengeId = challenge.id;

                const statusIcon = isCompleted(challenge)
                    ? 'fa-solid fa-circle-check status'
                    : 'fa-regular fa-circle status';

                item.appendChild(createIcon(statusIcon));

                const title = document.createElement('span');
                title.textContent = challenge.title;
                item.appendChild(title);

                if (currentChallenge?.id === challenge.id) {
                    item.classList.add('active');
                }

                if (isCompleted(challenge)) {
                    item.classList.add('completed');
                }

                item.addEventListener('click', () => {
                    selectChallenge(difficulty, challenge);
                });

                group.appendChild(item);
            });

            elements.challengeList.appendChild(group);
        });
    }

    function updateActiveNavigation() {
        elements.challengeList
            .querySelectorAll('.challenge-item')
            .forEach((item) => {
                const active = currentChallenge
                    && item.dataset.challengeId === currentChallenge.id;

                item.classList.toggle('active', Boolean(active));

                const challenge = allChallenges.find(
                    (entry) => entry.id === item.dataset.challengeId
                );

                item.classList.toggle(
                    'completed',
                    Boolean(challenge && isCompleted(challenge))
                );

                const icon = item.querySelector('.status');

                if (icon && challenge) {
                    icon.className = isCompleted(challenge)
                        ? 'fa-solid fa-circle-check status'
                        : 'fa-regular fa-circle status';
                }
            });
    }

    function setFeedback(message, kind = 'info') {
        const iconClass = kind === 'success'
            ? 'fa-solid fa-circle-check'
            : kind === 'error'
                ? 'fa-solid fa-circle-exclamation'
                : 'fa-solid fa-circle-info';

        elements.answerFeedback.replaceChildren();
        elements.answerFeedback.append(createIcon(iconClass));

        const text = document.createElement('span');
        text.textContent = message;

        elements.answerFeedback.appendChild(text);

        elements.answerFeedback.classList.toggle(
            'feedback-success',
            kind === 'success'
        );

        elements.answerFeedback.classList.toggle(
            'feedback-error',
            kind === 'error'
        );
    }

    function clearAnswerState() {
        selectedLine = null;
        elements.textAnswer.value = '';

        elements.answerOptions
            .querySelectorAll('input[type="radio"]')
            .forEach((radio) => {
                radio.checked = false;
            });

        renderSelectedLine();
        setFeedback('Revise sua resposta antes de enviar.');
    }

    function showAnswerType(type) {
        elements.choiceSection.hidden = type !== 'choice';
        elements.textSection.hidden = type !== 'text';
        elements.lineSection.hidden = type !== 'line';
        elements.answerDivider.hidden = true;
    }

    function renderChoices(choices) {
        elements.answerOptions.replaceChildren();

        choices.forEach((choice, index) => {
            const label = document.createElement('label');
            label.className = 'answer-option';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'challenge-choice';
            input.value = String(index + 1);

            const customRadio = document.createElement('span');
            customRadio.className = 'custom-radio';

            const text = document.createElement('span');
            text.textContent = choice;

            label.append(input, customRadio, text);
            elements.answerOptions.appendChild(label);
        });
    }

    function renderSelectedLine() {
        elements.selectedLines.replaceChildren();

        if (!selectedLine) {
            const empty = document.createElement('div');
            empty.className = 'empty-selection';
            empty.textContent = 'Nenhuma linha selecionada.';

            elements.selectedLines.appendChild(empty);
            return;
        }

        const item = document.createElement('div');
        item.className = 'selected-line-item';

        const fileName = document.createElement('span');
        fileName.textContent = selectedLine.file;

        const lineNumber = document.createElement('strong');
        lineNumber.textContent = `Linha ${selectedLine.line}`;

        item.append(fileName, lineNumber);
        elements.selectedLines.appendChild(item);
    }

    function getLanguageIcon(language) {
        const normalized = String(language || '').toLowerCase();

        if (normalized === 'python') return 'fa-brands fa-python';
        if (normalized === 'javascript' || normalized === 'js') {
            return 'fa-brands fa-js';
        }
        if (normalized === 'typescript' || normalized === 'ts') {
            return 'fa-brands fa-js';
        }
        if (normalized === 'html') return 'fa-brands fa-html5';
        if (normalized === 'css') return 'fa-brands fa-css3-alt';

        return 'fa-solid fa-file-code';
    }

    function renderFileTabs(files) {
        elements.editorTabs.replaceChildren();
        elements.editorBody.replaceChildren();

        files.forEach((file, index) => {
            const tabId = `file-tab-${index}`;

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'file-tab';
            input.id = tabId;
            input.checked = index === 0;

            input.addEventListener('change', () => {
                activateFile(index);
            });

            const label = document.createElement('label');
            label.htmlFor = tabId;
            label.className = 'editor-tab';

            label.appendChild(
                createIcon(getLanguageIcon(currentChallenge.language))
            );

            const fileLabel = document.createElement('span');
            fileLabel.textContent = file.name;

            label.appendChild(fileLabel);
            elements.editorTabs.append(input, label);

            const content = document.createElement('div');
            content.className = 'code-content';
            content.dataset.file = file.name;
            content.hidden = index !== 0;

            const lines = file.content.split(/\r\n|\n|\r/);

            lines.forEach((lineText, lineIndex) => {
                const line = document.createElement('div');
                line.className = 'code-line';

                const number = document.createElement('span');
                number.className = 'line-number';
                number.textContent = String(lineIndex + 1);

                const code = document.createElement('code');
                code.textContent = lineText || ' ';

                line.append(number, code);
                content.appendChild(line);
            });

            elements.editorBody.appendChild(content);
        });

        currentFiles = files;
    }

    function activateFile(index) {
        const contents = elements.editorBody.querySelectorAll('.code-content');

        contents.forEach((content, contentIndex) => {
            content.hidden = contentIndex !== index;
        });

        elements.cursorPosition.textContent = 'Ln --, Col --';

        if (currentFiles[index]) {
            elements.editorLanguage.textContent = currentChallenge.language;
        }
    }

    async function loadChallengeFiles(challenge) {
        const entries = Object.entries(challenge.files || {});

        if (!entries.length) {
            throw new Error(
                'Este desafio não possui arquivos fonte definidos.'
            );
        }

        return Promise.all(entries.map(async ([name, path]) => {
            const url = new URL(path, document.baseURI);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(
                    `Não foi possível carregar "${name}" (${response.status}).`
                );
            }

            return {
                name,
                content: await response.text()
            };
        }));
    }

    async function selectChallenge(difficulty, challenge) {
        currentChallenge = challenge;
        selectedLine = null;

        updateActiveNavigation();
        updateProgress();

        elements.breadcrumbTitle.textContent = challenge.title;
        elements.title.textContent = challenge.title;
        elements.description.textContent = challenge.description || '';
        elements.language.textContent = challenge.language || '';
        elements.editorLanguage.textContent = challenge.language || '';
        elements.editorFooterLanguage.textContent = challenge.language || '';

        const info = difficultyInfo[difficulty];

        elements.difficultyBadge.textContent = info
            ? info.label
            : difficulty;

        elements.difficultyBadge.className =
            `difficulty-badge ${info ? info.colorClass : ''}`;

        showAnswerType(challenge.type);
        clearAnswerState();

        if (challenge.type === 'choice') {
            renderChoices(
                Array.isArray(challenge.choices)
                    ? challenge.choices
                    : []
            );
        }

        const index = allChallenges.findIndex(
            (item) => item.id === challenge.id
        );

        elements.challengePosition.textContent =
            `Desafio ${index + 1} de ${allChallenges.length}`;

        elements.editorTabs.replaceChildren();
        elements.editorBody.replaceChildren();

        const loading = document.createElement('p');
        loading.className = 'loading-message';
        loading.textContent = 'Carregando arquivos...';

        elements.editorBody.appendChild(loading);

        try {
            const files = await loadChallengeFiles(challenge);

            // Evita que uma requisição antiga sobrescreva a seleção atual.
            if (!currentChallenge || currentChallenge.id !== challenge.id) {
                return;
            }

            renderFileTabs(files);
        } catch (error) {
            elements.editorBody.replaceChildren();

            const message = document.createElement('p');
            message.className = 'loading-message error-message';
            message.textContent = error.message;

            elements.editorBody.appendChild(message);
        }
    }

    function checkAnswer() {
        if (!currentChallenge) return false;

        let correct = false;

        if (currentChallenge.type === 'choice') {
            const selected = elements.answerOptions.querySelector(
                'input:checked'
            );

            correct = Boolean(selected)
                && Number(selected.value) === Number(currentChallenge.answer);

        } else if (currentChallenge.type === 'text') {
            correct = elements.textAnswer.value.trim()
                === String(currentChallenge.answer).trim();

        } else if (currentChallenge.type === 'line') {
            const expected = String(currentChallenge.answer);

            correct = Boolean(selectedLine)
                && `${selectedLine.file}:${selectedLine.line}` === expected;
        }

        if (correct) {
            progress[currentChallenge.id] = true;

            saveProgress();
            updateProgress();
            updateActiveNavigation();

            setFeedback(
                'Resposta correta! Desafio concluído.',
                'success'
            );

            return true;
        }

        setFeedback(
            'Resposta incorreta. Revise o código e tente novamente.',
            'error'
        );

        return false;
    }

    function skipChallenge() {
        if (!currentChallenge || !allChallenges.length) return;

        const currentIndex = allChallenges.findIndex(
            (challenge) => challenge.id === currentChallenge.id
        );

        const nextIndex = (currentIndex + 1) % allChallenges.length;
        const next = allChallenges[nextIndex];

        const difficulty = Object.keys(challengesByDifficulty).find(
            (key) => (challengesByDifficulty[key] || []).some(
                (challenge) => challenge.id === next.id
            )
        );

        if (difficulty) {
            selectChallenge(difficulty, next);
        }
    }

    function validateDatabase(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error(
                'O JSON de desafios possui um formato inválido.'
            );
        }

        const normalized = {};

        Object.keys(difficultyInfo).forEach((difficulty) => {
            const challenges = data[difficulty] ?? [];

            if (!Array.isArray(challenges)) {
                throw new Error(
                    `A categoria "${difficulty}" precisa ser uma lista.`
                );
            }

            normalized[difficulty] = challenges;
        });

        const ids = new Set();

        Object.values(normalized).flat().forEach((challenge) => {
            if (
                !challenge
                || typeof challenge.id !== 'string'
                || !challenge.id.trim()
            ) {
                throw new Error(
                    'Todo desafio precisa ter um ID único não vazio.'
                );
            }

            if (ids.has(challenge.id)) {
                throw new Error(
                    `O ID "${challenge.id}" está duplicado. Os IDs precisam ser únicos.`
                );
            }

            ids.add(challenge.id);

            if (!['choice', 'text', 'line'].includes(challenge.type)) {
                throw new Error(
                    `Tipo inválido no desafio "${challenge.id}".`
                );
            }

            if (
                !challenge.files
                || typeof challenge.files !== 'object'
                || Array.isArray(challenge.files)
            ) {
                throw new Error(
                    `O desafio "${challenge.id}" precisa definir "files" como objeto.`
                );
            }

            if (
                challenge.type === 'choice'
                && !Array.isArray(challenge.choices)
            ) {
                throw new Error(
                    `O desafio "${challenge.id}" precisa definir "choices" como lista.`
                );
            }
        });

        return normalized;
    }

    elements.submitAnswer.addEventListener('click', checkAnswer);
    elements.skipChallenge.addEventListener('click', skipChallenge);

    elements.editorBody.addEventListener('click', (event) => {
        if (!currentChallenge || currentChallenge.type !== 'line') {
            return;
        }

        const clickedLine = event.target.closest('.code-line');

        if (
            !clickedLine
            || !elements.editorBody.contains(clickedLine)
        ) {
            return;
        }

        const fileContent = clickedLine.closest('.code-content');

        if (!fileContent || fileContent.hidden) {
            return;
        }

        const fileName = fileContent.dataset.file;

        const lineNumber = clickedLine
            .querySelector('.line-number')
            ?.textContent.trim();

        if (!fileName || !lineNumber) return;

        if (selectedLine && selectedLine.element === clickedLine) {
            clickedLine.classList.remove('selected-line');
            selectedLine = null;
        } else {
            if (selectedLine) {
                selectedLine.element.classList.remove('selected-line');
            }

            clickedLine.classList.add('selected-line');

            selectedLine = {
                file: fileName,
                line: lineNumber,
                element: clickedLine
            };
        }

        renderSelectedLine();
    });

    try {
        const response = await fetch(DB_URL);

        if (!response.ok) {
            throw new Error(
                `Não foi possível carregar ${DB_URL} (${response.status}).`
            );
        }

        const database = await response.json();

        challengesByDifficulty = validateDatabase(database);
        allChallenges = Object.values(challengesByDifficulty).flat();

        renderChallengeNavigation();
        updateProgress();

        if (!allChallenges.length) {
            elements.title.textContent = 'Nenhum desafio cadastrado';
            elements.description.textContent =
                'Adicione desafios ao arquivo challenges/db.json.';

            elements.editorBody.replaceChildren();
            return;
        }

        const firstDifficulty = Object.keys(challengesByDifficulty).find(
            (difficulty) => challengesByDifficulty[difficulty].length > 0
        );

        selectChallenge(
            firstDifficulty,
            challengesByDifficulty[firstDifficulty][0]
        );

    } catch (error) {
        elements.challengeList.textContent = error.message;
        elements.title.textContent = 'Erro ao carregar desafios';
        elements.description.textContent =
            'Verifique o arquivo challenges/db.json e tente novamente.';

        elements.editorBody.textContent = error.message;
    }
});
