# Repositório Global de Sementes

Este repositório contém os artefatos para a geração de um banco de dados NoSQL, orientado a documentos, para um Repositório Global de Sementes.

## Equipe
* Jesper Ian Santos Brayner Rodrigues Alves <[jisbra](mailto:jisbra@cin.ufpe.br)>
* João Vitor Figueiredo de Vasconcelos <[jvfv](mailto:jvfv@cin.ufpe.br)>
* Luan Gustavo Nogueira de Souza <[lgns](mailto:lgns@cin.ufpe.br)>
* Luís Eduardo Cavalcante Santos <[lecs2](mailto:lecs2@cin.ufpe.br)>
* Mairon Rodrigues Nunes <[mrn](mailto:mrn@cin.ufpe.br)>
* Nara Maria Silva de Pontes <[nmsp](mailto:nmsp@cin.ufpe.br)>

## Estrutura do Repositório

- [`package.json`](./package.json) e [`package-lock.json`](./package-lock.json): define as dependências do projeto, incluindo os pacotes `mongodb` e `dotenv`.
- [`.env.example`](./.env.example): arquivo para configuração da string de conexão com o banco de dados.

Além desses arquivos, temos os seguintes arquivos e diretórios:

- [`scripts/instituicao/registros_instituicao.js`](./scripts/instituicao/registros_instituicao.js): dados referentes às instituições parceiras.

- [`scripts/sala/registros_sala.js`](./scripts/sala/registros_sala.js): dados contendo a capacidade de cada sala de armazenamento.

- [`scripts/amostra/registros_amostra.js`](./scripts/amostra/registros_amostra.js): dados contendo os lotes de sementes e onde estão guardados.

- [`scripts/movimentacao/log_movimentacao.js`](./scripts/movimentacao/log_movimentacao.js): dados com o histórico de interações com o estoque.

- [`scripts/load_seeds.js`](./scripts/load_seeds.js): script que se conecta ao MongoDB (database repositorio-sementes) e insere todos os registros iniciais no banco.

- [`queries/`](./queries/): todas as queries atendendo aos requisitos de comandos do projeto.

## Modelagem dos dados

### Modelo entidade-relacionamento (ER)

### Implementação física em coleções
Diferente da implementação que já havíamos feito para o modelo relacional com base no Modelo ER, realizamos uma modelagem projetada para uma estrutura orientada a documentos, implementando aninhamento de objetos (*embedding*) para agrupar informações logicamente relacionadas.

As coleções implementadas foram as seguintes:

```javascript
Instituição {
	_id: ObjectId
	id: int
	nome: string
	país: string
	contato: {
		e-mails: array [string]
		telefones: array [int]
	}
}
```

```javascript
Amostra {
	_id: ObjectId
	código: string
	instituição: int
	semente: {
		família: string
		gênero: string
		espécie: string
	    nome_comum: string
	}
	armazenamento: {
		sala: string
		módulo: int
		estante: int
	}
	data_entrada: timestamp
	unidades: int
	peso: double
}
```

```javascript
Sala {
	_id: ObjectId
	id: string
	capacidade: int
}
```

```javascript
Movimentação {
	_id: ObjectId
	amostra: string
	tipo: string
	razão: string
	data: timestamp
	quantidade: int
}
```

## Como executar
Para configurar e rodar o projeto localmente:

1. Tendo o `.env.example` como base, configure a variável `DB_URL` no arquivo `.env` para apontar para sua instância do MongoDB.

2. Baixe as dependências executando o comando `npm install` na raiz do repositório.

3. Insira os registros no banco executando o script principal: `node scripts/load_seeds.js`.
- O terminal confirmará a inserção retornando a contagem de documentos criados para Instituições, Salas, Amostras e Movimentações.