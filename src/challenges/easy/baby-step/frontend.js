async function loadUser(userId) {
    try {
        const response = await fetch(
            `http://localhost:3000/users/${userId}`
        );

        if (!response.ok) {
            throw new Error("Erro ao buscar usuário");
        }

        const user = await response.json();

        document.getElementById("user-name").textContent = user.name;
        document.getElementById("user-email").textContent = user.email;

        const github = document.getElementById("user-github");
        github.href = user.github_url;
    } catch (error) {
        console.error("Erro:", error);
    }
}
