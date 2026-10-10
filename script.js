// ============================================
// POKÉMON COMPARE
// PARTE 1 DE 3
// Base, configurações e carregamento da Pokédex
// ============================================

// ============================================
// 1. ESTADO DO JOGO
// ============================================

let pokemon = [];
let currentPair = [];
let currentQuestion = null;

let selectedDifficulty = "normal";
let selectedMode = "physical";
let matchFormat = "free";
let includeSpecial = false;

let score = 0;
let correctAnswers = 0;
let roundNumber = 0;
let currentStreak = 0;
let bestStreak = 0;

let lives = 0;
let maxLives = 0;
let questionsAnswered = 0;

let answered = false;
let roundId = 0;
let gameOver = false;

// Configurações gerais.
const TOTAL_ROUNDS = 10;
const CORRECT_POINTS = 1;
const RESULT_DELAY = 1200;

// Limite de vidas e recuperação por dificuldade.
const difficultyRules = {
  easy: {
    lives: 1,
    recoveryEvery: 0,
    endBonusPerLife: 2,
    label: "Fácil"
  },

  normal: {
    lives: 2,
    recoveryEvery: 15,
    endBonusPerLife: 3,
    label: "Intermediária"
  },

  hard: {
    lives: 3,
    recoveryEvery: 10,
    endBonusPerLife: 4,
    label: "Difícil"
  }
};

// IDs das Ultra Beasts clássicas.
const ultraBeastIds = new Set([
  793, 794, 795, 796, 797, 798,
  799, 803, 804, 805, 806
]);

// ============================================
// 2. ELEMENTOS DO HTML
// ============================================

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const summaryScreen = document.getElementById("summaryScreen");

const startButton = document.getElementById("startGame");
const homeMessage = document.getElementById("homeMessage");

const card1 = document.getElementById("card1");
const card2 = document.getElementById("card2");

const questionText = document.getElementById("questionText");
const roundLabel = document.getElementById("roundLabel");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");

const newRoundButton = document.getElementById("newRound");
const backHomeButton = document.getElementById("backHome");

const scoreValue = document.getElementById("scoreValue");
const roundValue = document.getElementById("roundValue");
const correctValue = document.getElementById("correctValue");

// Elementos que serão usados na tela de resumo.
const finalScore = document.getElementById("finalScore");
const summaryDetails = document.getElementById("summaryDetails");

const playAgainButton = document.getElementById("playAgain");
const summaryHomeButton = document.getElementById("summaryHome");

// ============================================
// 3. FUNÇÕES UTILITÁRIAS
// ============================================

// Formata números no padrão brasileiro.
function formatNumber(value, maximumFractionDigits = 2) {
  return Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  });
}

// Sorteia um elemento.
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Embaralha uma lista sem alterar a original.
function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// Converte valores booleanos do CSV.
function isTrue(value) {
  return value === true ||
    ["1", "true", "yes", "sim"].includes(
      String(value).trim().toLowerCase()
    );
}

// ============================================
// 4. LEITOR DE CSV
// ============================================

function parseCSV(text) {
  const rows = [];

  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !quoted
    ) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(field);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);

    if (row.some(value => value.trim() !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    throw new Error("O CSV está vazio ou não contém Pokémon.");
  }

  const headers = rows.shift().map(value =>
    value.trim().replace(/^\uFEFF/, "")
  );

  return rows.map(values => {
    const item = {};

    headers.forEach((header, index) => {
      item[header] = (values[index] ?? "").trim();
    });

    return item;
  });
}

// Lê um número sem aceitar campos vazios como zero.
function readNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// ============================================
// 5. CARREGAMENTO DA POKÉDEX
// ============================================

async function loadPokemon() {
  try {
    startButton.disabled = true;
    startButton.textContent = "Carregando Pokédex...";
    homeMessage.textContent = "Carregando os dados dos Pokémon...";

    const response = await fetch("data/pokemon_utf8.csv");

    if (!response.ok) {
      throw new Error(
        `Falha ao carregar o CSV: HTTP ${response.status}`
      );
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (!rows.length) {
      throw new Error("Nenhum registro encontrado no CSV.");
    }

    const headers = Object.keys(rows[0]);

    const requiredColumns = [
      "national_number",
      "english_name",
      "height_m",
      "weight_kg"
    ];

    const missingColumns = requiredColumns.filter(
      column => !headers.includes(column)
    );

    if (missingColumns.length) {
      throw new Error(
        "Colunas obrigatórias ausentes: " +
        missingColumns.join(", ")
      );
    }

    // As colunas competitivas são opcionais nesta etapa.
    // A Parte 2 usará esses dados para as comparações.
    pokemon = rows.map(row => {
      const id = readNumber(row.national_number);

      return {
        id,
        name: row.english_name,

        type: [
          row.primary_type,
          row.secondary_type
        ].filter(Boolean).join(" / "),

        height: readNumber(row.height_m),
        weight: readNumber(row.weight_kg),

        hp: readNumber(row.hp),
        attack: readNumber(row.attack),
        defense: readNumber(row.defense),
        sp_attack: readNumber(row.sp_attack),
        sp_defense: readNumber(row.sp_defense),
        speed: readNumber(row.speed),

        legendary: isTrue(row.is_legendary) || id === 898,
        mythical: isTrue(row.is_mythical),
        sublegendary: isTrue(row.is_sublegendary),

        ultraBeast: ultraBeastIds.has(id)
      };
    }).filter(p =>
      Number.isInteger(p.id) &&
      p.id > 0 &&
      p.name &&
      p.height !== null &&
      p.height > 0 &&
      p.weight !== null &&
      p.weight > 0
    );

    if (pokemon.length < 2) {
      throw new Error(
        "A Pokédex precisa ter pelo menos dois Pokémon válidos."
      );
    }

    startButton.disabled = false;
    startButton.textContent = "Começar partida";

    homeMessage.textContent =
      `${pokemon.length} Pokémon carregados! Escolha suas configurações.`;

  } catch (error) {
    console.error("Erro ao carregar a Pokédex:", error);

    startButton.disabled = true;
    startButton.textContent = "Erro ao carregar";

    homeMessage.textContent =
      "Não foi possível carregar a Pokédex. Confira o caminho data/pokemon_utf8.csv e o Console do navegador.";
  }
}

// ============================================
// 6. FILTRO DE POKÉMON ESPECIAIS
// ============================================

function getAvailablePokemon() {
  if (includeSpecial) {
    return pokemon;
  }

  return pokemon.filter(p =>
    p.legendary !== true &&
    p.mythical !== true &&
    p.sublegendary !== true &&
    p.ultraBeast !== true
  );
}

// ============================================
// FIM DA PARTE 1 DE 3
// A Parte 2 continuará neste mesmo arquivo.
// ============================================
// ============================================
// POKÉMON COMPARE
// PARTE 2 DE 3
// Perguntas, comparação, sequência e vidas
// ============================================

// ============================================
// 7. BANCO DE PERGUNTAS
// ============================================

function getQuestions() {
  if (selectedMode === "competitive") {
    return [
      {
        attribute: "hp",
        direction: "higher",
        text: "Quem tem mais HP?",
        unit: "pontos",
        label: "HP"
      },
      {
        attribute: "attack",
        direction: "higher",
        text: "Quem tem mais Ataque?",
        unit: "pontos",
        label: "Ataque"
      },
      {
        attribute: "defense",
        direction: "higher",
        text: "Quem tem mais Defesa?",
        unit: "pontos",
        label: "Defesa"
      },
      {
        attribute: "sp_attack",
        direction: "higher",
        text: "Quem tem mais Ataque Especial?",
        unit: "pontos",
        label: "Ataque Especial"
      },
      {
        attribute: "sp_defense",
        direction: "higher",
        text: "Quem tem mais Defesa Especial?",
        unit: "pontos",
        label: "Defesa Especial"
      },
      {
        attribute: "speed",
        direction: "higher",
        text: "Quem tem mais Velocidade?",
        unit: "pontos",
        label: "Velocidade"
      }
    ];
  }

  return [
    {
      attribute: "height",
      direction: "higher",
      text: "Quem é mais alto/longo?",
      unit: "m",
      label: "altura"
    },
    {
      attribute: "height",
      direction: "lower",
      text: "Quem é mais baixo/curto?",
      unit: "m",
      label: "altura"
    },
    {
      attribute: "weight",
      direction: "higher",
      text: "Quem é mais pesado?",
      unit: "kg",
      label: "peso"
    },
    {
      attribute: "weight",
      direction: "lower",
      text: "Quem é mais leve?",
      unit: "kg",
      label: "peso"
    }
  ];
}

// ============================================
// 8. REGRAS DE DIFICULDADE
// ============================================

function isValidDifference(value1, value2, attribute) {
  if (
    !Number.isFinite(value1) ||
    !Number.isFinite(value2) ||
    value1 === value2
  ) {
    return false;
  }

  const difference = Math.abs(value1 - value2);

  if (selectedDifficulty === "easy") {
    // Fácil: diferenças bem evidentes.
    if (attribute === "height") {
      return difference >= 3;
    }

    if (attribute === "weight") {
      return difference >= 50;
    }

    return difference >= 40;
  }

  if (selectedDifficulty === "normal") {
    // Intermediária: diferenças moderadas.
    if (attribute === "height") {
      return difference >= 0.5 && difference <= 3;
    }

    if (attribute === "weight") {
      return difference >= 5 && difference <= 100;
    }

    return difference >= 10 && difference <= 60;
  }

  if (selectedDifficulty === "hard") {
    // Difícil: diferenças mais sutis.
    if (attribute === "height") {
      return difference >= 0.1 && difference <= 0.5;
    }

    if (attribute === "weight") {
      return difference >= 0.1 && difference <= 10;
    }

    return difference >= 1 && difference <= 15;
  }

  return false;
}

// ============================================
// 9. GERAÇÃO DE UMA RODADA
// ============================================

function getValidRound(pool) {
  if (!Array.isArray(pool) || pool.length < 2) {
    return null;
  }

  const availableQuestions = shuffle(
    getQuestions().filter(question =>
      pool.some(p =>
        Number.isFinite(p[question.attribute])
      )
    )
  );

  for (const question of availableQuestions) {
    const candidates = pool.filter(p =>
      Number.isFinite(p[question.attribute])
    );

    if (candidates.length < 2) continue;

    // Tentativas aleatórias para manter variedade.
    for (let attempt = 0; attempt < 500; attempt++) {
      const p1 = getRandomItem(candidates);
      const p2 = getRandomItem(candidates);

      if (p1.id === p2.id) continue;

      if (
        isValidDifference(
          p1[question.attribute],
          p2[question.attribute],
          question.attribute
        )
      ) {
        return {
          pair: Math.random() < 0.5
            ? [p1, p2]
            : [p2, p1],
          question
        };
      }
    }

    // Busca completa caso o sorteio não encontre um par.
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const p1 = candidates[i];
        const p2 = candidates[j];

        if (
          isValidDifference(
            p1[question.attribute],
            p2[question.attribute],
            question.attribute
          )
        ) {
          return {
            pair: Math.random() < 0.5
              ? [p1, p2]
              : [p2, p1],
            question
          };
        }
      }
    }
  }

  return null;
}

// ============================================
// 10. RESPOSTA CORRETA
// ============================================

function getCorrectPokemon() {
  if (!currentQuestion || currentPair.length !== 2) {
    return null;
  }

  const [p1, p2] = currentPair;

  const value1 = p1[currentQuestion.attribute];
  const value2 = p2[currentQuestion.attribute];

  if (
    !Number.isFinite(value1) ||
    !Number.isFinite(value2) ||
    value1 === value2
  ) {
    return null;
  }

  if (currentQuestion.direction === "higher") {
    return value1 > value2 ? p1 : p2;
  }

  return value1 < value2 ? p1 : p2;
}

// ============================================
// 11. CARTÕES DOS POKÉMON
// ============================================

function renderCard(p, card) {
  const img = card.querySelector("img");
  const title = card.querySelector("h2");
  const details = card.querySelector(".details");
  const answerLabel = card.querySelector(".answer-label");

  img.src =
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

  img.alt = `Imagem de ${p.name}`;
  title.textContent = p.name;

  // Antes da resposta, não revelar nenhum atributo.
  details.replaceChildren();

  const typeLine = document.createElement("div");
  typeLine.textContent = `Tipo: ${p.type || "Desconhecido"}`;
  details.appendChild(typeLine);

  const hiddenLine = document.createElement("div");
  hiddenLine.className = "hidden-attributes";
  hiddenLine.textContent = "❓ Atributos ocultos";
  details.appendChild(hiddenLine);

  answerLabel.textContent = "";

  card.className = "pokemon";
  card.disabled = false;
  card.dataset.pokemonId = String(p.id);

  card.setAttribute(
    "aria-label",
    `Escolher ${p.name}`
  );
}

// ============================================
// 12. PLACAR
// ============================================

function updateScoreboard() {
  if (scoreValue) {
    scoreValue.textContent = String(score);
  }

  if (roundValue) {
    roundValue.textContent = matchFormat === "ten"
      ? `${Math.min(roundNumber, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`
      : String(roundNumber);
  }

  if (correctValue) {
    correctValue.textContent = String(correctAnswers);
  }

  // Atualiza os indicadores de vidas e sequência
  // quando esses elementos forem adicionados ao HTML.
  const livesValue = document.getElementById("livesValue");
  const streakValue = document.getElementById("streakValue");

  if (livesValue) {
    livesValue.textContent =
      "♥".repeat(lives) + "♡".repeat(maxLives - lives);
  }

  if (streakValue) {
    streakValue.textContent = String(currentStreak);
  }
}

// ============================================
// 13. PREPARAÇÃO DA RODADA
// ============================================

function prepareRound() {
  roundId++;
  answered = false;

  roundNumber++;

  questionText.textContent = currentQuestion.text;

  const modeName = selectedMode === "competitive"
    ? "Atributos Competitivos"
    : "Atributos Físicos";

  const rule = difficultyRules[selectedDifficulty];

  const roundDescription = matchFormat === "ten"
    ? `Rodada ${roundNumber}/${TOTAL_ROUNDS}`
    : `Rodada ${roundNumber}`;

  roundLabel.textContent =
    `${modeName} · ${rule.label} · ${roundDescription}`;

  renderCard(currentPair[0], card1);
  renderCard(currentPair[1], card2);

  statusText.className = "";
  statusText.textContent =
    "Escolha o Pokémon que responde à pergunta!";

  spinner.hidden = true;
  newRoundButton.hidden = true;

  updateScoreboard();
}

// ============================================
// 14. ESCOLHA DO POKÉMON
// ============================================

function choosePokemon(event) {
  if (answered || gameOver) return;

  const selectedId = Number(
    event.currentTarget.dataset.pokemonId
  );

  const selectedPokemon = currentPair.find(
    p => p.id === selectedId
  );

  if (!selectedPokemon) return;

  answered = true;
  questionsAnswered++;

  const thisRound = roundId;

  card1.disabled = true;
  card2.disabled = true;

  spinner.hidden = false;
  statusText.className = "calculating";
  statusText.textContent = "Calculando...";

  window.setTimeout(() => {
    if (thisRound !== roundId || gameOver) return;

    revealResult(selectedPokemon);
  }, RESULT_DELAY);
}

// ============================================
// 15. REVELAÇÃO E PONTUAÇÃO
// ============================================

function revealResult(selectedPokemon) {
  const correctPokemon = getCorrectPokemon();

  spinner.hidden = true;
  statusText.className = "";

  if (!correctPokemon) {
    statusText.textContent =
      "Não foi possível determinar o vencedor. Vamos tentar outra rodada.";

    newRoundButton.hidden = false;
    return;
  }

  const wasCorrect =
    selectedPokemon.id === correctPokemon.id;

  if (wasCorrect) {
    currentStreak++;
    bestStreak = Math.max(bestStreak, currentStreak);

    score += CORRECT_POINTS * currentStreak;
    correctAnswers++;
  } else {
    currentStreak = 0;
    lives = Math.max(0, lives - 1);
  }

  // Revela os atributos após a escolha.
  [card1, card2].forEach(card => {
    const id = Number(card.dataset.pokemonId);

    const p = currentPair.find(item => item.id === id);
    const isWinner = p.id === correctPokemon.id;
    const isSelected = p.id === selectedPokemon.id;

    const details = card.querySelector(".details");
    details.replaceChildren();

    const typeLine = document.createElement("div");
    typeLine.textContent = `Tipo: ${p.type || "Desconhecido"}`;
    details.appendChild(typeLine);

    if (selectedMode === "physical") {
      const heightLine = document.createElement("div");
      heightLine.textContent =
        `Altura: ${formatNumber(p.height)} m`;
      details.appendChild(heightLine);

      const weightLine = document.createElement("div");
      weightLine.textContent =
        `Peso: ${formatNumber(p.weight)} kg`;
      details.appendChild(weightLine);
    } else {
      const stats = [
        ["HP", p.hp],
        ["Ataque", p.attack],
        ["Defesa", p.defense],
        ["Ataque Especial", p.sp_attack],
        ["Defesa Especial", p.sp_defense],
        ["Velocidade", p.speed]
      ];

      stats.forEach(([label, value]) => {
        const line = document.createElement("div");

        line.textContent =
          `${label}: ${Number.isFinite(value) ? value : "N/D"}`;

        details.appendChild(line);
      });
    }

    card.classList.add("revealed");
    card.classList.add(isWinner ? "winner" : "wrong");

    card.querySelector("h2").textContent = p.name;

    card.querySelector(".answer-label").textContent =
      isWinner
        ? "✓ Resposta correta"
        : isSelected
          ? "✗ Sua escolha"
          : "Resposta correta";
  });

  if (wasCorrect) {
    const pointsEarned = CORRECT_POINTS * currentStreak;

    statusText.textContent =
      `🎉 Acertou! ${correctPokemon.name} venceu. ` +
      `+${pointsEarned} ponto${pointsEarned === 1 ? "" : "s"}! ` +
      `Sequência: ${currentStreak}.`;
  } else {
    statusText.textContent =
      `Não foi dessa vez! ${correctPokemon.name} venceu. ` +
      `Você perdeu uma vida e sua sequência voltou a zero.`;
  }

  // Recuperação periódica somente no modo infinito.
  const recoveryEvery =
    difficultyRules[selectedDifficulty].recoveryEvery;

  if (
    matchFormat === "free" &&
    wasCorrect &&
    recoveryEvery > 0 &&
    questionsAnswered % recoveryEvery === 0 &&
    lives < maxLives
  ) {
    lives++;

    statusText.textContent +=
      ` Você recuperou uma vida! (${lives}/${maxLives})`;
  } else if (
    matchFormat === "free" &&
    wasCorrect &&
    recoveryEvery > 0 &&
    questionsAnswered % recoveryEvery === 0 &&
    lives === maxLives
  ) {
    statusText.textContent +=
      " Você chegou a um marco de recuperação, mas já está com a vida máxima.";
  }

  updateScoreboard();

  // Só encerra por falta de vidas no modo infinito.
  if (lives <= 0 && matchFormat === "free") {
    finishGame("lives");
    return;
  }

  // No desafio de 10 perguntas, todos podem concluir.
  if (
    matchFormat === "ten" &&
    roundNumber >= TOTAL_ROUNDS
  ) {
    finishGame("completed");
    return;
  }

  newRoundButton.hidden = false;
}

// ============================================
// FIM DA PARTE 2 DE 3
// A Parte 3 adicionará início, encerramento,
// navegação e eventos.
// ============================================
// ============================================
// POKÉMON COMPARE
// PARTE 3 DE 3
// Início, encerramento, navegação e eventos
// ============================================

// ============================================
// 16. INICIAR PARTIDA
// ============================================

function startGame() {
  const modeInput = document.querySelector(
    'input[name="gameMode"]:checked'
  );

  const formatInput = document.querySelector(
    'input[name="matchFormat"]:checked'
  );

  const difficultyInput = document.querySelector(
    'input[name="difficulty"]:checked'
  );

  if (!modeInput || !formatInput || !difficultyInput) {
    homeMessage.textContent =
      "Selecione o modo, o formato e a dificuldade.";
    return;
  }

  selectedMode = modeInput.value;
  matchFormat = formatInput.value;
  selectedDifficulty = difficultyInput.value;

  includeSpecial = document.getElementById(
    "includeSpecial"
  ).checked;

  const pool = getAvailablePokemon();

  if (pool.length < 2) {
    homeMessage.textContent =
      "Não há Pokémon suficientes para iniciar.";
    return;
  }

  // Verifica se a dificuldade escolhida possui
  // pelo menos uma comparação possível.
  const firstRound = getValidRound(pool);

  if (!firstRound) {
    homeMessage.textContent =
      "Não encontrei comparações válidas nesta configuração. " +
      "Experimente outra dificuldade ou inclua Pokémon especiais.";
    return;
  }

  // Reinicia todos os dados da partida.
  score = 0;
  roundNumber = 0;
  questionsAnswered = 0;
  correctAnswers = 0;
  currentStreak = 0;
  bestStreak = 0;
  gameOver = false;
  answered = false;

  // Limite de vidas por dificuldade.
  maxLives = difficultyRules[selectedDifficulty].lives;
  lives = maxLives;

  currentPair = firstRound.pair;
  currentQuestion = firstRound.question;

  homeScreen.hidden = true;
  summaryScreen.hidden = true;
  gameScreen.hidden = false;

  homeMessage.textContent = "";

  prepareRound();
}

// ============================================
// 17. PRÓXIMA RODADA
// ============================================

function nextRound() {
  if (gameOver) return;

  const pool = getAvailablePokemon();
  const round = getValidRound(pool);

  if (!round) {
    statusText.textContent =
      "Não encontrei outra comparação válida. " +
      "Volte às configurações e escolha outra dificuldade.";
    newRoundButton.hidden = true;
    return;
  }

  currentPair = round.pair;
  currentQuestion = round.question;

  prepareRound();
}

// ============================================
// 18. ENCERRAR PARTIDA
// ============================================

function finishGame(reason) {
  if (gameOver) return;

  gameOver = true;
  answered = true;
  roundId++;

  card1.disabled = true;
  card2.disabled = true;

  spinner.hidden = true;
  newRoundButton.hidden = true;

  if (reason === "lives") {
    statusText.textContent =
      "Fim de jogo! Você ficou sem vidas.";
  } else {
    statusText.textContent =
      "Você concluiu as dez rodadas!";
  }

  if (matchFormat === "ten") {
    const bonusPerLife =
  difficultyRules[selectedDifficulty].endBonusPerLife;

    const lifeBonus = lives * bonusPerLife;

    score += lifeBonus;

    finalScore.textContent = String(score);

    summaryDetails.textContent =
      `Acertos: ${correctAnswers} de ${roundNumber}. ` +
      `Melhor sequência: ${bestStreak}. ` +
      `Vidas restantes: ${lives}/${maxLives}. ` +
      `Bônus por vidas restantes: ${lifeBonus} pontos.`;

    gameScreen.hidden = true;
    summaryScreen.hidden = false;
  } else {
    statusText.textContent +=
      ` Pontuação final: ${score} pontos. ` +
      `Acertos: ${correctAnswers}. ` +
      `Melhor sequência: ${bestStreak}.`;
  }
}

// ============================================
// 19. VOLTAR ÀS CONFIGURAÇÕES
// ============================================

function backHome() {
  roundId++;
  answered = true;
  gameOver = true;

  gameScreen.hidden = true;
  summaryScreen.hidden = true;
  homeScreen.hidden = false;

  homeMessage.textContent =
    "Configurações preservadas. Você pode alterá-las antes de começar.";
}

// ============================================
// 20. JOGAR NOVAMENTE
// ============================================

function playAgain() {
  summaryScreen.hidden = true;
  homeScreen.hidden = false;

  homeMessage.textContent =
    "Pronto para outra partida? Suas configurações foram preservadas.";
}

// ============================================
// 21. EVENTOS DOS BOTÕES
// ============================================

card1.addEventListener("click", choosePokemon);
card2.addEventListener("click", choosePokemon);

startButton.addEventListener("click", startGame);
newRoundButton.addEventListener("click", nextRound);
backHomeButton.addEventListener("click", backHome);

playAgainButton.addEventListener("click", startGame);
summaryHomeButton.addEventListener("click", backHome);

// ============================================
// 22. CARREGAMENTO INICIAL
// ============================================

loadPokemon();

// ============================================
// FIM DO SCRIPT
// ============================================