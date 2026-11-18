import { storage } from './storage.js'

app.get("/file/:id", async (req, res) => {
    const { id } = req.params;

    const file = storage.getFile(id)

    if (!file) {
        return res.status(403).json({
            message: "ID de arquivo inválido",
        });
    }

    return res.status(200).json({
        name: file.name,
        type: file.type,
        url: file.url,
    });
});
