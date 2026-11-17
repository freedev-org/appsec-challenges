
document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    const DB_URL = 'challenges/db.json';
    const STORAGE_KEY = 'secure-review-progress';
    const OPEN_STATE_STORAGE_KEY = 'secure-review-open-state';

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
        shareButton: document.getElementById('share-challenge'),
        shareFeedback: document.getElementById('share-feedback'),
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
        skipChallenge: document.getElementById('skip-challenge'),
        explanationModal: document.getElementById('explanation-modal'),
        explanationModalBody: document.getElementById('explanation-modal-body'),
        closeExplanationModal: document.getElementById('close-explanation-modal'),
        explanationModalDone: document.getElementById('explanation-modal-done')
    };

    let challengesByDifficulty = {};
    let allChallenges = [];
    let currentChallenge = null;
    let currentDifficulty = null;
    let selectedLine = null;
    let currentFiles = [];
    let activeFileIndex = 0;
    let progress = loadProgress();
    const savedOpenState = loadOpenState();

    function loadOpenState() {
        try {
            const stored = JSON.parse(localStorage.getItem(OPEN_STATE_STORAGE_KEY) || 'null');

            if (
                !stored
                || typeof stored !== 'object'
                || typeof stored.challengeId !== 'string'
            ) {
                return null;
            }

            return {
                challengeId: stored.challengeId,
                fileName: typeof stored.fileName === 'string' ? stored.fileName : null
            };
        } catch {
            return null;
        }
    }

    function saveOpenState(fileName = null) {
        if (!currentChallenge) return;

        try {
            localStorage.setItem(OPEN_STATE_STORAGE_KEY, JSON.stringify({
                challengeId: currentChallenge.id,
                fileName
            }));
        } catch (error) {
            console.warn('Não foi possível salvar o estado atual:', error);
        }
    }

    async function copyChallengeLink() {
        if (!currentChallenge) return;

        const url = new URL(window.location.href);
        url.hash = currentChallenge.id;
        const link = url.toString();

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(link);
            } else {
                const temporaryInput = document.createElement('textarea');
                temporaryInput.value = link;
                temporaryInput.setAttribute('readonly', '');
                temporaryInput.style.position = 'fixed';
                temporaryInput.style.opacity = '0';
                document.body.appendChild(temporaryInput);
                temporaryInput.select();

                const copied = document.execCommand('copy');
                temporaryInput.remove();

                if (!copied) {
                    throw new Error('O navegador não permitiu copiar o link.');
                }
            }

            elements.shareFeedback.textContent = 'Link copiado!';
            elements.shareFeedback.classList.remove('error');
            elements.shareFeedback.classList.add('visible');
            elements.shareButton.classList.add('copied');
            elements.shareButton.querySelector('i').className = 'fa-solid fa-check';
            elements.shareButton.querySelector('span').textContent = 'Copiado!';
        } catch (error) {
            elements.shareFeedback.textContent = 'Não foi possível copiar o link.';
            elements.shareFeedback.classList.add('visible', 'error');
            console.error('Erro ao copiar link do desafio:', error);
        }
    }

    function resetShareFeedback() {
        elements.shareFeedback.textContent = '';
        elements.shareFeedback.classList.remove('visible', 'error');
        elements.shareButton.classList.remove('copied');
        elements.shareButton.querySelector('i').className = 'fa-solid fa-share-nodes';
        elements.shareButton.querySelector('span').textContent = 'Compartilhar';
    }

    function getChallengeFromUrl(challenges) {
        if (!window.location.hash) return null;

        let challengeId;

        try {
            challengeId = decodeURIComponent(window.location.hash.slice(1));
        } catch {
            return null;
        }

        return challenges.find((challenge) => challenge.id === challengeId) || null;
    }

    function loadProgress() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
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
        const percentage = total ? Math.round((completed / total) * 100) : 0;

        elements.progressCount.textContent = `${completed}/${total}`;
        elements.progressValue.style.width = `${percentage}%`;
        elements.progressDescription.textContent = `${percentage}% dos desafios concluídos`;
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

                if (currentChallenge && currentChallenge.id === challenge.id) {
                    item.classList.add('active');
                }

                if (isCompleted(challenge)) {
                    item.classList.add('completed');
                }

                item.addEventListener('click', () => selectChallenge(difficulty, challenge));
                group.appendChild(item);
            });

            elements.challengeList.appendChild(group);
        });
    }

    function updateActiveNavigation() {
        elements.challengeList.querySelectorAll('.challenge-item').forEach((item) => {
            const active = currentChallenge && item.dataset.challengeId === currentChallenge.id;
            item.classList.toggle('active', Boolean(active));

            const challenge = allChallenges.find((entry) => entry.id === item.dataset.challengeId);
            item.classList.toggle('completed', Boolean(challenge && isCompleted(challenge)));

            const icon = item.querySelector('.status');

            if (icon && challenge) {
                icon.className = isCompleted(challenge)
                    ? 'fa-solid fa-circle-check status'
                    : 'fa-regular fa-circle status';
            }
        });
    }

    /**
     * Converte a sintaxe de markup dos campos description e explanation em nós DOM.
     * O conteúdo original é tratado como texto; somente os links gerados são HTML.
     */
    function renderMarkup(container, source) {
        container.replaceChildren();

        const text = String(source || '');
        const tokenPattern = /#CWE-(\d+)|owasp\{(A\d{2}):(\d{4})\s+([^}]+)\}|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gi;
        let lastIndex = 0;
        let match;

        function appendText(value) {
            if (value) container.appendChild(document.createTextNode(value));
        }

        while ((match = tokenPattern.exec(text)) !== null) {
            appendText(text.slice(lastIndex, match.index));

            const link = document.createElement('a');
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            if (match[1]) {
                link.href = `https://cwe.mitre.org/data/definitions/${match[1]}.html`;
                link.textContent = `CWE-${match[1]}`;
            } else if (match[2]) {
                const code = match[2].toUpperCase();
                const year = match[3];
                const title = match[4].trim();
                const slug = `${code}_${year}-${title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '')}`;
                link.href = year === '2025'
                    ? `https://owasp.org/Top10/2025/${slug}/`
                    : `https://owasp.org/Top10/${slug}/`;
                link.textContent = `${code}:${year} ${title}`;
            } else {
                const article = match[5].trim();
                link.href = `https://pt.wikipedia.org/wiki/${encodeURIComponent(article.replace(/ /g, '_'))}`;
                link.textContent = (match[6] || article).trim();
            }

            const externalIcon = document.createElement('i');
            externalIcon.className = 'fa-solid fa-arrow-up-right-from-square markup-external-link-icon';
            externalIcon.setAttribute('aria-hidden', 'true');
            link.appendChild(externalIcon);

            container.appendChild(link);
            lastIndex = tokenPattern.lastIndex;
        }

        appendText(text.slice(lastIndex));
    }

    function showExplanation() {
        if (!currentChallenge) return;

        renderMarkup(elements.explanationModalBody, currentChallenge.explanation || 'Nenhuma explicação foi cadastrada para este desafio.');
        elements.explanationModal.hidden = false;
        elements.closeExplanationModal.focus();
    }

    function closeExplanation() {
        elements.explanationModal.hidden = true;
        elements.submitAnswer.focus();
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

        elements.answerFeedback.classList.toggle('feedback-success', kind === 'success');
        elements.answerFeedback.classList.toggle('feedback-error', kind === 'error');
    }

    function clearAnswerState() {
        selectedLine = null;
        elements.textAnswer.value = '';

        elements.answerOptions.querySelectorAll('input[type="radio"]').forEach((radio) => {
            radio.checked = false;
        });

        renderSelectedLine();
        setFeedback('Você pode fazer quantas tentativas quiser.');
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
        if (normalized === 'javascript' || normalized === 'js') return 'fa-brands fa-js';
        if (normalized === 'typescript' || normalized === 'ts') return 'fa-brands fa-js';
        if (normalized === 'html') return 'fa-brands fa-html5';
        if (normalized === 'css') return 'fa-brands fa-css3-alt';

        return 'fa-solid fa-file-code';
    }

    function getHighlightLanguage(fileName) {
        const extension = String(fileName).split('.').pop().toLowerCase();

        const languages = {
            py: 'python',
            pyw: 'python',
            js: 'javascript',
            mjs: 'javascript',
            cjs: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            html: 'xml',
            htm: 'xml',
            xhtml: 'xml',
            xml: 'xml',
            svg: 'xml',
            css: 'css',
            scss: 'scss',
            less: 'less',
            json: 'json',
            jsonc: 'json',
            sql: 'sql',
            java: 'java',
            c: 'c',
            h: 'c',
            cc: 'cpp',
            cpp: 'cpp',
            cxx: 'cpp',
            hpp: 'cpp',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            php: 'php',
            rb: 'ruby',
            sh: 'bash',
            bash: 'bash',
            zsh: 'bash',
            yml: 'yaml',
            yaml: 'yaml',
            toml: 'ini',
            ini: 'ini',
            md: 'markdown',
            markdown: 'markdown',
            dockerfile: 'dockerfile'
        };

        if (languages[extension]) return languages[extension];

        // Fallback para arquivos sem extensão reconhecida, usando language do desafio.
        const challengeLanguage = String(currentChallenge?.language || '').toLowerCase();

        const fallback = {
            python: 'python',
            javascript: 'javascript',
            js: 'javascript',
            typescript: 'typescript',
            html: 'xml',
            xml: 'xml',
            css: 'css',
            sql: 'sql',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            'c++': 'cpp',
            csharp: 'csharp',
            'c#': 'csharp',
            go: 'go',
            rust: 'rust',
            php: 'php',
            ruby: 'ruby',
            shell: 'bash',
            bash: 'bash'
        };

        return fallback[challengeLanguage] || null;
    }

    function highlightSource(source, language) {
        if (!language || !window.hljs || !hljs.getLanguage(language)) {
            return null;
        }

        try {
            return hljs.highlight(source, {
                language,
                ignoreIllegals: true
            }).value;
        } catch (error) {
            console.warn(`Falha ao aplicar syntax highlight (${language}):`, error);
            return null;
        }
    }

    function splitHighlightedHtml(highlightedHtml) {
        const template = document.createElement('template');
        template.innerHTML = highlightedHtml;

        const lines = [document.createDocumentFragment()];

        function appendText(text, ancestors) {
            if (!text) return;

            let parent = lines[lines.length - 1];
            let root = null;

            ancestors.forEach((ancestor) => {
                const clone = ancestor.cloneNode(false);

                if (parent === lines[lines.length - 1]) {
                    root = clone;
                } else {
                    parent.appendChild(clone);
                }

                parent = clone;
            });

            const textNode = document.createTextNode(text);

            if (ancestors.length) {
                parent.appendChild(textNode);

                if (root) {
                    lines[lines.length - 1].appendChild(root);
                }
            } else {
                lines[lines.length - 1].appendChild(textNode);
            }
        }

        function visit(node, ancestors = []) {
            if (node.nodeType === Node.TEXT_NODE) {
                const parts = node.nodeValue.split('\n');

                parts.forEach((part, index) => {
                    appendText(part, ancestors);

                    if (index < parts.length - 1) {
                        lines.push(document.createDocumentFragment());
                    }
                });

                return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    lines.push(document.createDocumentFragment());
                    return;
                }

                const nextAncestors = [...ancestors, node];
                node.childNodes.forEach((child) => visit(child, nextAncestors));
                return;
            }

            node.childNodes?.forEach((child) => visit(child, ancestors));
        }

        visit(template.content);

        return lines;
    }

    function renderFileTabs(files, preferredFileName = null) {
        elements.editorTabs.replaceChildren();
        elements.editorBody.replaceChildren();

        const preferredFileIndex = preferredFileName
            ? files.findIndex((file) => file.name === preferredFileName)
            : -1;

        const initialFileIndex = preferredFileIndex >= 0 ? preferredFileIndex : 0;

        files.forEach((file, index) => {
            const tabId = `file-tab-${index}`;

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'file-tab';
            input.id = tabId;
            input.checked = index === initialFileIndex;
            input.addEventListener('change', () => activateFile(index));

            const label = document.createElement('label');
            label.htmlFor = tabId;
            label.className = 'editor-tab';
            label.appendChild(createIcon(getLanguageIcon(currentChallenge.language)));

            const fileLabel = document.createElement('span');
            fileLabel.textContent = file.name;
            label.appendChild(fileLabel);

            elements.editorTabs.append(input, label);

            const content = document.createElement('div');
            content.className = 'code-content';
            content.dataset.file = file.name;
            content.hidden = index !== initialFileIndex;

            const sourceLines = file.content.split(/\r\n|\n|\r/);
            const highlightLanguage = getHighlightLanguage(file.name);
            const highlightedSource = highlightSource(file.content, highlightLanguage);

            const highlightedLines = highlightedSource !== null
                ? splitHighlightedHtml(highlightedSource)
                : null;

            sourceLines.forEach((lineText, lineIndex) => {
                const line = document.createElement('div');
                line.className = 'code-line';

                const number = document.createElement('span');
                number.className = 'line-number';
                number.textContent = String(lineIndex + 1);

                const code = document.createElement('code');
                code.classList.add('hljs');

                if (highlightedLines && highlightedLines[lineIndex]) {
                    code.appendChild(highlightedLines[lineIndex].cloneNode(true));
                } else {
                    code.textContent = lineText || ' ';
                }

                line.append(number, code);
                content.appendChild(line);
            });

            elements.editorBody.appendChild(content);
        });

        currentFiles = files;
        activeFileIndex = initialFileIndex;
        activateFile(initialFileIndex);
    }

    function activateFile(index) {
        activeFileIndex = index;

        const contents = elements.editorBody.querySelectorAll('.code-content');

        contents.forEach((content, contentIndex) => {
            content.hidden = contentIndex !== index;
        });

        const selected = currentFiles[index];
        elements.cursorPosition.textContent = 'Ln --, Col --';

        if (selected) {
            elements.editorLanguage.textContent = currentChallenge.language;
            saveOpenState(selected.name);
        }
    }

    async function loadChallengeFiles(challenge) {
        const entries = Object.entries(challenge.files || {});

        if (!entries.length) {
            throw new Error('Este desafio não possui arquivos fonte definidos.');
        }

        const files = await Promise.all(entries.map(async ([name, path]) => {
            const url = new URL(path, document.baseURI);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Não foi possível carregar "${name}" (${response.status}).`);
            }

            return {
                name,
                content: await response.text()
            };
        }));

        return files;
    }

    async function selectChallenge(difficulty, challenge, preferredFileName = null) {
        currentDifficulty = difficulty;
        currentChallenge = challenge;
        selectedLine = null;
        resetShareFeedback();
        saveOpenState(preferredFileName);

        updateActiveNavigation();
        updateProgress();

        elements.breadcrumbTitle.textContent = challenge.title;
        elements.title.textContent = challenge.title;
        renderMarkup(elements.description, challenge.description || '');
        elements.language.textContent = challenge.language || '';
        elements.editorLanguage.textContent = challenge.language || '';
        elements.editorFooterLanguage.textContent = challenge.language || '';

        const info = difficultyInfo[difficulty];

        elements.difficultyBadge.textContent = info ? info.label : difficulty;
        elements.difficultyBadge.className =
            `difficulty-badge ${info ? info.colorClass : ''}`;

        showAnswerType(challenge.type);
        clearAnswerState();

        if (challenge.type === 'choice') {
            renderChoices(Array.isArray(challenge.choices) ? challenge.choices : []);
        }

        const index = allChallenges.findIndex((item) => item.id === challenge.id);

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

            // Evita que uma requisição antiga sobrescreva o desafio selecionado mais recentemente.
            if (!currentChallenge || currentChallenge.id !== challenge.id) {
                return;
            }

            renderFileTabs(files, preferredFileName);
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
            const selected = elements.answerOptions.querySelector('input:checked');

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

            setFeedback('Resposta correta! Desafio concluído.', 'success');
            showExplanation();

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

        const difficulty = Object.keys(challengesByDifficulty).find((key) =>
            (challengesByDifficulty[key] || []).some(
                (challenge) => challenge.id === next.id
            )
        );

        if (difficulty) {
            selectChallenge(difficulty, next);
        }
    }

    function validateDatabase(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('O JSON de desafios possui um formato inválido.');
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

    elements.shareButton.addEventListener('click', copyChallengeLink);
    elements.submitAnswer.addEventListener('click', checkAnswer);
    elements.skipChallenge.addEventListener('click', skipChallenge);
    elements.closeExplanationModal.addEventListener('click', closeExplanation);
    elements.explanationModalDone.addEventListener('click', closeExplanation);
    elements.explanationModal.addEventListener('click', (event) => {
        if (event.target.matches('[data-close-modal]')) closeExplanation();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.explanationModal.hidden) closeExplanation();
    });

    elements.editorBody.addEventListener('click', (event) => {
        if (!currentChallenge || currentChallenge.type !== 'line') {
            return;
        }

        const clickedLine = event.target.closest('.code-line');

        if (!clickedLine || !elements.editorBody.contains(clickedLine)) {
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

        // Um ID válido na URL tem prioridade sobre o desafio salvo no localStorage.
        const urlChallenge = getChallengeFromUrl(allChallenges);
        const savedChallenge = savedOpenState
            ? allChallenges.find((challenge) => challenge.id === savedOpenState.challengeId)
            : null;

        const initialChallenge = urlChallenge || savedChallenge || allChallenges[0];

        const initialDifficulty = Object.keys(challengesByDifficulty).find(
            (difficulty) => (challengesByDifficulty[difficulty] || []).some(
                (challenge) => challenge.id === initialChallenge.id
            )
        );

        const preferredFileName = savedChallenge
            && (!urlChallenge || urlChallenge.id === savedChallenge.id)
            ? savedOpenState.fileName
            : null;

        selectChallenge(
            initialDifficulty,
            initialChallenge,
            preferredFileName
        );

    } catch (error) {
        elements.challengeList.textContent = error.message;
        elements.title.textContent = 'Erro ao carregar desafios';
        elements.description.textContent =
            'Verifique o arquivo challenges/db.json e tente novamente.';

        elements.editorBody.textContent = error.message;
    }
});
