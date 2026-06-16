import { MongoClient } from "mongodb";
import 'dotenv/config';

const client = new MongoClient(process.env.DB_URL);
const dbname = "repositorio-sementes";

try {
    await client.connect();
    console.log("Conexão com servidor do MongoDB realizada com sucesso!");
    const db = client.db(dbname);
    // isso é equivalente à utilização do use, que é utilizado quando realizamos as consultas por meio do mongosh
        // use repositorio-sementes

    // FIND:
    // Mostra as amostras oferecidas pela instituição de id 10
    const result_amostra = await db.collection("amostra").find({ instituicao_id: 10 });

    // PRETTY
    // O pretty() é um método exclusivo do mongosh, mas como estamos rodando por meio dos 
    // drivers do NodeJS, simulamos esse comportamento do pretty por meio do JSON.stringify
    console.log(JSON.stringify(result_amostra, null, 2));
    // db.collection("amostra").find({ instituicao_id: 10 }).pretty()

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

    // $FUNCTION
    // Busca as amostras onde o nome comum da semente tem no máximo 5 letras
    await db.collection("amostra").find({
        $expr: {
            $function: {
                body: "function(nome) { return nome.length <= 5; }",
                args: ["$semente.nome_comum"],
                lang: "js"
            }
        }
    });

    // ALL
    // Busca a instituição que tem ambos esses e-mails cadastrados em contato
    await db.collection("instituicao").find({
        "contato.e-mails": { $all: ["banco@embrapa-rg.br", "diretoria@embrapa-rg.br"] }
    });  

    // FINDONE
    // Retorna a primeira amostra cadastrada que seja da família "Poaceae"
    await db.collection("amostra").findOne({ "semente.família": "Poaceae" });

    // $ADDTOSET, UPDATE (UPDATEONE/UPDATEMANY)
    // Adiciona um e-mail na instituição de id 2
    await db.collection("instituicao").updateOne(
        { id: 2 },
        { $addToSet: { "contato.e-mails": "contactseedbank@kew.org" } },
    );

    // SAVE (UPDATEONE/INSERTONE)
    // Atualiza a capacidade da sala Z001 ou salva uma nova se ela não existir
    await db.collection("sala").updateOne(
        { id: "Z001" },
        { $set: { id: "Z001", capacidade: 1500 } },
        { upsert: true }
    );

    // $COND
    // Cria um campo tamanho na busca, se capacidade >= 50000 é grande, caso não, é normal.
    await db.collection("sala").aggregate([
        { 
            $project: {
                id: 1,
                tamanho: {
                    $cond: {
                        if: { $gte: ["$capacidade", 50000] },
                        then: "Grande",
                        else: "Normal"
                    }
                }
            }
        }
    ]);

    // $FILTER:
    // Passa pelo array de telefones e mantém apenas os números maiores que 50000000000
    await db.collection("instituicao").aggregate([
        {
            $project: {
                nome: 1,
                telefones_validos: {
                    $filter: {
                        input: "$contato.telefones", 
                        as: "num_telefone",
                        cond: { $gt: ["$$num_telefone", 50000000000] }
                    }
                }
            }
        }
    ]);

    // MAPREDUCE
    // O método mapReduce foi depreciado, mas poderíamos rodar ele da forma a seguir
    // Calcula o peso total de amostras agrupadas por família
    
    /*
    const mapping = function() {
        emit(this.semente.família, this.peso); 
    };

    const reduce = function(keyFamília, valuesPesos) {
        return Array.sum(valuesPesos);
    };

    const result_mapreduce = await db.collection("amostra").mapreduce(
        mapping,
        reduce,
        { out: { inline: 1 } }
    );
    */

} catch (err) {
    console.error("Erro encontrado:", err);
} finally {
    await client.close();
}