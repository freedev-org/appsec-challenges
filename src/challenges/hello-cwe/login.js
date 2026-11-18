import { generateAccessToken } from './access-control.js'

app.post("/admin-panel/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            message: "Nome de usuário e senha são obrigatórios"
        });
    }

    if (username !== "ademir" || password !== "sempre&nunc@-573") {
        return res.status(401).json({
            message: "Nome de usuário ou senha inválidos"
        });
    }

    tokenData = generateAccessToken("ademir");

    return res.status(200).json({
        message: "Login bem-sucedido",
        token: tokenData.token,
        token_type: tokenData.type,
        expires_in: tokenData.expiresIn,
    });
});
