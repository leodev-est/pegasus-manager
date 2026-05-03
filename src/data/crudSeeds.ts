export type AthleteRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: "Sub-19" | "Adulto";
  position: string;
  status: "ativo" | "teste" | "inativo";
  payment: "pago" | "pendente" | "atrasado";
  notes: string;
};

export type FinanceRecord = {
  id: string;
  type: "receita" | "despesa";
  description: string;
  value: number;
  date: string;
  category: string;
  owner: string;
  status: "pago" | "pendente" | "atrasado";
};

export type ManagementTask = {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "baixa" | "media" | "alta";
  status: "A Fazer" | "Em Andamento" | "Concluído";
};

export type MarketingTask = {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "baixa" | "media" | "alta";
  status: "Ideias" | "Produção" | "Revisão" | "Publicado";
  channel: "Instagram" | "WhatsApp" | "Arte" | "Captação" | "Evento";
};

export type TrainingRecord = {
  id: string;
  date: string;
  title: string;
  category: string;
  objective: string;
  warmup: string;
  mainPart: string;
  finalPart: string;
  notes: string;
  createdBy: string;
};

export type SchoolRecord = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  region: string;
  status: "não contatada" | "em conversa" | "reunião marcada" | "recusada" | "parceria fechada";
  owner: string;
  nextAction: string;
  notes: string;
};

export const athleteSeed: AthleteRecord[] = [
  {
    id: "ath-joao",
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "(11) 99999-1111",
    category: "Sub-19",
    position: "Ponteiro",
    status: "ativo",
    payment: "pago",
    notes: "Atleta ativo no elenco principal.",
  },
  {
    id: "ath-maria",
    name: "Maria Souza",
    email: "maria@exemplo.com",
    phone: "(11) 99999-2222",
    category: "Adulto",
    position: "Levantadora",
    status: "ativo",
    payment: "pendente",
    notes: "Acompanhar mensalidade deste mês.",
  },
  {
    id: "ath-pedro",
    name: "Pedro Lima",
    email: "pedro@exemplo.com",
    phone: "(11) 99999-3333",
    category: "Sub-19",
    position: "Central",
    status: "teste",
    payment: "pendente",
    notes: "Em período de avaliação técnica.",
  },
];

export const financeSeed: FinanceRecord[] = [
  {
    id: "fin-1",
    type: "receita",
    description: "Mensalidades abril",
    value: 2400,
    date: "2026-04-05",
    category: "Mensalidades",
    owner: "Giulia",
    status: "pago",
  },
  {
    id: "fin-2",
    type: "despesa",
    description: "Compra de bolas",
    value: 420,
    date: "2026-04-08",
    category: "Materiais",
    owner: "Leo",
    status: "pago",
  },
  {
    id: "fin-3",
    type: "receita",
    description: "Mensalidades pendentes",
    value: 780,
    date: "2026-04-18",
    category: "Mensalidades",
    owner: "Giulia",
    status: "pendente",
  },
  {
    id: "fin-4",
    type: "despesa",
    description: "Materiais de treino",
    value: 260,
    date: "2026-04-20",
    category: "Operacao",
    owner: "Allef",
    status: "pendente",
  },
];

export const managementTaskSeed: ManagementTask[] = [
  {
    id: "mg-1",
    title: "Formalizar agenda de treinos",
    description: "Consolidar horários e exceções do uso da quadra.",
    owner: "Leto",
    dueDate: "2026-05-08",
    priority: "alta",
    status: "A Fazer",
  },
  {
    id: "mg-2",
    title: "Alinhar comunicados oficiais",
    description: "Preparar comunicação sobre autorização de uso.",
    owner: "Giu",
    dueDate: "2026-05-12",
    priority: "media",
    status: "Em Andamento",
  },
  {
    id: "mg-3",
    title: "Registrar autorização de uso",
    description: "Arquivar documento M.O no 19957/2026.",
    owner: "Leto",
    dueDate: "2026-04-30",
    priority: "alta",
    status: "Concluído",
  },
];

export const marketingTaskSeed: MarketingTask[] = [
  {
    id: "mk-1",
    title: "Série de posts sobre atletas",
    description: "Criar pauta com histórias do elenco.",
    owner: "Vito",
    dueDate: "2026-05-10",
    priority: "media",
    status: "Ideias",
    channel: "Instagram",
  },
  {
    id: "mk-2",
    title: "Arte de inscrições abertas",
    description: "Layout para divulgação no feed e WhatsApp.",
    owner: "Vito",
    dueDate: "2026-05-06",
    priority: "alta",
    status: "Produção",
    channel: "Arte",
  },
  {
    id: "mk-3",
    title: "Comunicado de treinos aos sábados",
    description: "Publicação institucional sobre horários.",
    owner: "Vito",
    dueDate: "2026-04-29",
    priority: "baixa",
    status: "Publicado",
    channel: "WhatsApp",
  },
];

export const trainingSeed: TrainingRecord[] = [
  {
    id: "tr-1",
    date: "2026-05-02",
    title: "Fundamentos e jogo reduzido",
    category: "Misto",
    objective: "Trabalhar saque, recepção e organização de quadra.",
    warmup: "Mobilidade, corrida leve e ativação com bola.",
    mainPart: "Sequências de saque/recepção e jogos 4x4.",
    finalPart: "Alongamento e feedback coletivo.",
    notes: "Treino no Jerusalém | Quadra - CREC.",
    createdBy: "Leo",
  },
];

export const schoolSeed: SchoolRecord[] = [
  {
    id: "sch-1",
    name: "Escola Estadual João Ramalho",
    contact: "Direção",
    phone: "(11) 4000-1111",
    email: "contato@joaoramalho.edu.br",
    region: "SBC",
    status: "não contatada",
    owner: "Leo",
    nextAction: "Enviar apresentação",
    notes: "Prioridade para apresentação institucional.",
  },
  {
    id: "sch-2",
    name: "Escola Municipal Jerusalém",
    contact: "Coordenação",
    phone: "(11) 4000-2222",
    email: "contato@jerusalem.edu.br",
    region: "SBC",
    status: "em conversa",
    owner: "Allef",
    nextAction: "Marcar reunião",
    notes: "Contato inicial positivo.",
  },
  {
    id: "sch-3",
    name: "Colégio Exemplo",
    contact: "Secretaria",
    phone: "(11) 4000-3333",
    email: "contato@colegioexemplo.com",
    region: "SBC",
    status: "reunião marcada",
    owner: "Vito",
    nextAction: "Preparar material",
    notes: "Levar apresentação visual do projeto.",
  },
];


