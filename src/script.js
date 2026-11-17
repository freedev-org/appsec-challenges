
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.querySelector('.editor');
    const selectedLinesContainer = document.getElementById('selected-lines');

    if (!editor || !selectedLinesContainer) {
        return;
    }

    // O desafio permite selecionar uma única linha vulnerável por vez.
    let selectedLine = null;

    function renderSelectedLine() {
        selectedLinesContainer.replaceChildren();

        if (!selectedLine) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-selection';
            emptyMessage.textContent = 'Nenhuma linha selecionada.';
            selectedLinesContainer.appendChild(emptyMessage);
            return;
        }

        const item = document.createElement('div');
        item.className = 'selected-line-item';

        const fileName = document.createElement('span');
        fileName.textContent = selectedLine.file;

        const lineNumber = document.createElement('strong');
        lineNumber.textContent = `Linha ${selectedLine.line}`;

        item.append(fileName, lineNumber);
        selectedLinesContainer.appendChild(item);
    }

    editor.addEventListener('click', (event) => {
        const clickedLine = event.target.closest('.code-line');

        if (!clickedLine || !editor.contains(clickedLine)) {
            return;
        }

        const fileContent = clickedLine.closest('.code-content');

        // Ignora linhas pertencentes a arquivos que não estão visíveis.
        if (!fileContent || getComputedStyle(fileContent).display === 'none') {
            return;
        }

        const fileName = fileContent.dataset.file;
        const lineNumberElement = clickedLine.querySelector('.line-number');

        if (!fileName || !lineNumberElement) {
            return;
        }

        const lineNumber = lineNumberElement.textContent.trim();

        // Clicar novamente na linha selecionada remove a seleção.
        if (
            selectedLine
            && selectedLine.element === clickedLine
        ) {
            clickedLine.classList.remove('selected-line');
            selectedLine = null;
        } else {
            // Remove o destaque anterior antes de selecionar a nova linha.
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

    renderSelectedLine();
});
