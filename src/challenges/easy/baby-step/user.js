app.get("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            "SELECT id, name, email, github_url FROM users WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Usuário não encontrado"
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);

        return res.status(500).json({
            message: "Erro interno do servidor"
        });
    }
});

app.post("/users", async (req, res) => {
    try {
        const { name, email, github_url } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Nome e email são obrigatórios"
            });
        }

        const result = await db.query(
            `INSERT INTO users (name, email, github_url)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, github_url`,
            [name, email, github_url || null]
        );

        return res.status(201).json({
            message: "Usuário cadastrado com sucesso",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Este email já está cadastrado"
            });
        }

        return res.status(500).json({
            message: "Erro interno do servidor"
        });
    }
});
