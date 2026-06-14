import { salas } from "./sala/registros_sala.js";
import { amostras } from "./amostra/registros_amostra.js";
import { instituicoes } from "./instituicao/registros_instituicao.js";
import { movimentacoes } from "./movimentacao/log_movimentacao.js";
import { MongoClient } from "mongodb";
import 'dotenv/config';

const client = new MongoClient(process.env.DB_URL);
const dbname = "repositorio-sementes";

try {
    await client.connect();
    console.log("Conexão com servidor do MongoDB realizada com sucesso!");
    const db = client.db(dbname);

    await db.collection("amostra").drop().catch(() => {});
    await db.collection("instituicao").drop().catch(() => {});
    await db.collection("sala").drop().catch(() => {});
    await db.collection("movimentacao").drop().catch(() => {});

    const resInst = await db.collection("instituicao").insertMany(instituicoes);
    const resSala = await db.collection("sala").insertMany(salas);
    const resAmos = await db.collection("amostra").insertMany(amostras);
    const resMovi = await db.collection("movimentacao").insertMany(movimentacoes);

    console.log(`\nImportação Finalizada!`);
    console.log(`Instituições inseridas: ${resInst.insertedCount}`);
    console.log(`Salas inseridas: ${resSala.insertedCount}`);
    console.log(`Amostras inseridas: ${resAmos.insertedCount}`);
    console.log(`Movimentações inseridas: ${resMovi.insertedCount}`);

} catch (err) {
    console.error("Erro encontrado:", err);
} finally {
    await client.close();
}