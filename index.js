const express = require('express');
const { Pool, types } = require('pg');

types.setTypeParser(1700, val => parseFloat(val));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for front-end
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'notas_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    connectionTimeoutMillis: 2000,
});

let inMemoryNotas = [
    { id: 1, aluno: "João Lacerda", disciplina: "DevOps & Docker", nota: 9.5 },
    { id: 2, aluno: "Maria Clara", disciplina: "Automação CI/CD", nota: 10.0 },
    { id: 3, aluno: "Lucas Lacerda", disciplina: "Arquitetura Cloud", nota: 8.8 },
    { id: 4, aluno: "Ana Souza", disciplina: "Banco de Dados", nota: 9.2 }
];
let nextId = 5;

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
        console.log('PostgreSQL indisponível localmente. Usando banco em memória.');
    }
};

initDB();

app.get('/status', (req, res) => {
    res.json({ status: 'API de Notas Node.js rodando com sucesso!' });
});

app.get('/notas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        // Fallback em memória se PostgreSQL estiver offline
        res.json(inMemoryNotas);
    }
});

app.get('/notas/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM notas WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }
    } catch (err) {
        const nota = inMemoryNotas.find(n => n.id === id);
        if (nota) return res.json(nota);
    }
    res.status(404).json({ mensagem: 'Nota não encontrada' });
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
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        const novaNota = { id: nextId++, aluno, disciplina, nota: parseFloat(nota) };
        inMemoryNotas.push(novaNota);
        return res.status(201).json(novaNota);
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
            return res.json(result.rows[0]);
        }
    } catch (err) {
        const index = inMemoryNotas.findIndex(n => n.id === id);
        if (index !== -1) {
            inMemoryNotas[index] = { id, aluno, disciplina, nota: parseFloat(nota) };
            return res.json(inMemoryNotas[index]);
        }
    }
    res.status(404).json({ mensagem: 'Nota não encontrada' });
});

app.delete('/notas/:id', async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const result = await pool.query('DELETE FROM notas WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length > 0) {
            return res.json({ mensagem: 'Nota removida com sucesso', nota: result.rows[0] });
        }
    } catch (err) {
        const index = inMemoryNotas.findIndex(n => n.id === id);
        if (index !== -1) {
            const removed = inMemoryNotas.splice(index, 1);
            return res.json({ mensagem: 'Nota removida com sucesso', nota: removed[0] });
        }
    }
    res.status(404).json({ mensagem: 'Nota não encontrada' });
});

app.listen(port, () => {
    console.log(`API de notas rodando na porta ${port}`);
    console.log(`Acesse: http://localhost:${port}/notas`);
});

