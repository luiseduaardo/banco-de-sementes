import { MongoClient } from "mongodb";
import 'dotenv/config';

const client = new MongoClient(process.env.DB_URL);
const dbname = "repositorio-sementes";

try {
    await client.connect();
    console.log("Conexão com servidor do MongoDB realizada com sucesso!");
    const db = client.db(dbname);

    // FIND:
    // Mostra as amostras oferecidas pela instituição de id 10
    await db.collection("amostra").find({ instituicao_id: 10 });

    // $SIZE, $EXISTS, COUNT:
    // Conta quantas instituições NÃO possuem informação de contato
    await db.collection("instituicao").find({ $or: [
        { contato: { $exists: false } },
        { "contato.telefones": { $size: 0 }, "contato.e-mails": { $size: 0 } }
    ]}).count();

    // $GTE:
    // Conta quantas amostras têm 5000 ou mais unidades
    await db.collection("amostra").find({ unidades: { $gte: 5000 } }).count();

    // $GROUP, $SUM:
    // Calcula a quantidade movimentada em ENTRADAS de amostras
    await db.collection("movimentacao").aggregate([
        { $match: { tipo: "Entrada" } },
        { $group: { _id: "$amostra", total_entrada: { $sum: "$quantidade" } } }
    ]);

    // COUNTDOCUMENTS:
    // Conta a quantidade de salas
    await db.collection("sala").countDocuments();

    // MAX:
    // Mostra os detalhes da maior amostra oferecida por instituição
    await db.collection("amostra").aggregate([
        { 
            $group: {
                _id: "$instituicao_id",
                amostra: { 
                    $max: { // $max ordena pelo primeiro item no objeto
                        unidades: "$unidades",
                        semente: "$semente",
                        armazenamento: "$armazenamento",
                        data_entrada: "$data_entrada"
                    } 
                }
            }
        },
        {
            $lookup: {
                from: "instituicao",
                localField: "_id",
                foreignField: "id",
                as: "instituição"
            }
        }
    ]);

    // AVG:
    // Mostra a média de unidades de amostras oferecidas por instituição
    await db.collection("amostra").aggregate([
        { $group: { _id: "$instituicao_id", média: { $avg: "$unidades" } } },
        { $lookup: { from: "instituicao", localField: "_id", foreignField: "id", as: "instituição" } }
    ]);

    // SORT, LIMIT:
    // Mostra as 5 amostras com maior peso
    await db.collection("amostra").find().sort({ peso: -1 }).limit(5);

    // $WHERE:
    // Seleciona todas as amostras nas salas de ID D### a F### que pesam entre 10g e 50g
    await db.collection("amostra").find({ 
        $where: function() {
            return ["D", "E", "F"].includes(this.armazenamento.sala_id.charAt(0))
                && this.peso >= 10 && this.peso <= 50;
        }
    });

    // AGGREGATE, $MATCH, $PROJECT, $LOOKUP, $SET:
    // Seleciona a espécie e as informações da movimentação de toda amostra que foi RETIRADA do banco
    await db.collection("movimentacao").aggregate([
        { $match: { tipo: "Retirada" } }, // pega toda movimentação do tipo "retirada"
        { $lookup: { from: "amostra", localField: "amostra", foreignField: "código", as: "amostra" } }, // "join" com amostra.
        { $set: { amostra: { $arrayElemAt: [ "$amostra", 0 ] } } }, // o resultado do join é um array. retirando do array
        { $project: { _id: 0, "amostra.código": 1, "amostra.semente": 1, razão: 1, data: 1, quantidade: 1 } } // filtrando campos
    ]);

    // $TEXT, $SEARCH:
    // Mostra as informações de espécie das sementes armazenadas nas salas C001 e C002
    await db.collection("amostra").createIndex({ "armazenamento.sala_id": "text"});
    await db.collection("amostra").find({ $text: { $search: "C001 C002" } }, { _id: 0, semente: 1 });

    // RENAMECOLLECTION:
    await db.collection("instituicao").rename("instituição");
} catch (err) {
    console.error("Erro encontrado:", err);
} finally {
    await client.close();
}