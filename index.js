const express = require('express');
const { Pool, types } = require('pg');

types.setTypeParser(1700, val => parseFloat(val));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'notas_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notas (
                id SERIAL PRIMARY KEY,
                aluno VARCHAR(255) NOT NULL,
                disciplina VARCHAR(255) NOT NULL,
                nota NUMERIC(4,2) NOT NULL
            );
        `);
        console.log('Tabela "notas" inicializada no banco de dados!');
    } catch (err) {
        console.error('Erro ao inicializar o banco:', err);
    }
};

initDB();

app.get('/notas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/notas/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM notas WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ mensagem: 'Nota não encontrada' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar nota' });
    }
});

app.post('/notas', async (req, res) => {
    const { aluno, disciplina, nota } = req.body;

    if (!aluno || !disciplina || nota === undefined) {
        return res.status(400).json({ mensagem: 'Dados incompletos. Informe aluno, disciplina e nota.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO notas (aluno, disciplina, nota) VALUES ($1, $2, $3) RETURNING *',
            [aluno, disciplina, nota]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor ao inserir' });
    }
});

app.put('/notas/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { aluno, disciplina, nota } = req.body;

    try {
        const result = await pool.query(
            'UPDATE notas SET aluno = $1, disciplina = $2, nota = $3 WHERE id = $4 RETURNING *',
            [aluno, disciplina, nota, id]
        );

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ mensagem: 'Nota não encontrada' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor ao atualizar' });
    }
});

app.delete('/notas/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const result = await pool.query('DELETE FROM notas WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length > 0) {
            res.json({ mensagem: 'Nota removida com sucesso', nota: result.rows[0] });
        } else {
            res.status(404).json({ mensagem: 'Nota não encontrada' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: 'Erro interno no servidor ao deletar' });
    }
});

app.listen(port, () => {
    console.log(`API de notas rodando na porta ${port}`);
    console.log(`Acesse: http://localhost:${port}/notas`);
});
