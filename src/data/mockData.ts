import {
  Banknote,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  LucideIcon,
  Users,
} from "lucide-react";
import type { Permission } from "../auth/permissions";

export type Stat = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  permissions: Permission[];
};

export type Athlete = {
  name: string;
  category: string;
  status: "Ativo" | "Teste";
  phone: string;
  payment: "Pago" | "Pendente";
};

export type FinanceMovement = {
  date: string;
  description: string;
  type: "Receita" | "Despesa";
  value: string;
  status: "Confirmado" | "Pendente";
};

export type KanbanTask = {
  title: string;
  owner: string;
  priority: "Alta" | "Média" | "Baixa";
};

export type School = {
  name: string;
  contact: string;
  region: string;
  status: string;
  owner: string;
  nextAction: string;
};

export type AccessUser = {
  name: string;
  profile: string;
  access: string;
};

export const dashboardStats: Stat[] = [
  {
    label: "Atletas ativos",
    value: "48",
    helper: "Elenco atual do projeto",
    icon: Users,
    permissions: ["rh"],
  },
  {
    label: "Treinos esta semana",
    value: "1",
    helper: "Sábado, 17:30",
    icon: Dumbbell,
    permissions: ["treinos"],
  },
  {
    label: "Caixa atual",
    value: "R$ 8.450,00",
    helper: "Saldo consolidado",
    icon: Banknote,
    permissions: ["financeiro"],
  },
  {
    label: "Tarefas em andamento",
    value: "7",
    helper: "Gestão e marketing",
    icon: ClipboardList,
    permissions: ["gestao", "marketing"],
  },
];

export const athletes: Athlete[] = [
  {
    name: "João Silva",
    category: "Sub-19",
    status: "Ativo",
    phone: "(11) 99999-1111",
    payment: "Pago",
  },
  {
    name: "Maria Souza",
    category: "Adulto",
    status: "Ativo",
    phone: "(11) 99999-2222",
    payment: "Pendente",
  },
  {
    name: "Pedro Lima",
    category: "Sub-19",
    status: "Teste",
    phone: "(11) 99999-3333",
    payment: "Pendente",
  },
];

export const financeSummary = [
  { label: "Caixa atual", value: "R$ 8.450,00", helper: "Saldo disponivel" },
  { label: "Receitas do mês", value: "R$ 2.730,00", helper: "Mensalidades e apoios" },
  { label: "Despesas do mês", value: "R$ 680,00", helper: "Materiais e operação" },
  { label: "Mensalidades pendentes", value: "14", helper: "Acompanhamento ativo" },
];

export const financeMovements: FinanceMovement[] = [
  {
    date: "05/04/2026",
    description: "Mensalidades abril",
    type: "Receita",
    value: "R$ 2.400,00",
    status: "Confirmado",
  },
  {
    date: "08/04/2026",
    description: "Compra de bolas",
    type: "Despesa",
    value: "R$ 420,00",
    status: "Confirmado",
  },
  {
    date: "12/04/2026",
    description: "Apoio operacional",
    type: "Receita",
    value: "R$ 330,00",
    status: "Confirmado",
  },
  {
    date: "20/04/2026",
    description: "Materiais de treino",
    type: "Despesa",
    value: "R$ 260,00",
    status: "Pendente",
  },
];

export const managementKanban: Record<string, KanbanTask[]> = {
  "A Fazer": [
    { title: "Formalizar agenda de treinos", owner: "Leto", priority: "Alta" },
    { title: "Mapear necessidades de material", owner: "Tutinha", priority: "Média" },
    { title: "Organizar lista de contatos", owner: "Vic", priority: "Baixa" },
  ],
  "Em Andamento": [
    { title: "Alinhar comunicados oficiais", owner: "Giu", priority: "Alta" },
    { title: "Planejar reunião com parceiros", owner: "Tutinha", priority: "Média" },
    { title: "Revisar fluxo de mensalidades", owner: "Leto", priority: "Média" },
  ],
  Concluído: [
    { title: "Definir estrutura organizacional", owner: "Leto", priority: "Alta" },
    { title: "Registrar autorização de uso", owner: "Giu", priority: "Alta" },
  ],
};

export const marketingKanban: Record<string, KanbanTask[]> = {
  Ideias: [
    { title: "Série de posts sobre atletas", owner: "Vito", priority: "Média" },
    { title: "Calendário editorial de maio", owner: "Vito", priority: "Alta" },
  ],
  Produção: [
    { title: "Arte de inscrições abertas", owner: "Vito", priority: "Alta" },
    { title: "Video teaser de treino", owner: "Vic", priority: "Média" },
  ],
  Publicado: [
    { title: "Comunicado de treinos aos sábados", owner: "Vito", priority: "Baixa" },
  ],
};

export const trainingSchedule = [
  {
    date: "Todos os sábados",
    time: "17:30 às 19:00",
    place: "Jerusalém | Quadra - CREC",
    modality: "Voleibol",
    note: "Até dezembro de 2026, exceto feriados e dias 30/05, 20/06 e 26/09.",
  },
  {
    date: "Próximo treino",
    time: "17:30 às 19:00",
    place: "Jerusalém | Quadra - CREC",
    modality: "Voleibol",
    note: "Foco em fundamentos, organização de quadra e jogo reduzido.",
  },
];

export const schools: School[] = [
  {
    name: "Escola Estadual João Ramalho",
    contact: "SBC",
    region: "SBC",
    status: "Não contatada",
    owner: "Leo",
    nextAction: "Enviar apresentação",
  },
  {
    name: "Escola Municipal Jerusalém",
    contact: "SBC",
    region: "SBC",
    status: "Em conversa",
    owner: "Allef",
    nextAction: "Marcar reunião",
  },
  {
    name: "Colégio Exemplo",
    contact: "SBC",
    region: "SBC",
    status: "Reunião marcada",
    owner: "Vito",
    nextAction: "Preparar material",
  },
];

export const accessUsers: AccessUser[] = [
  { name: "Leo", profile: "Diretor", access: "Todas as telas" },
  { name: "Allef", profile: "Diretor", access: "Todas as telas" },
  { name: "Giulia", profile: "RH + Financeiro", access: "RH, Financeiro e Gestão" },
  { name: "Victoria", profile: "Conselheira", access: "Gestão" },
  { name: "Vito", profile: "Marketing", access: "Marketing e Gestão" },
];

export const permissionRules = [
  { profile: "Diretor", description: "acesso total" },
  { profile: "RH", description: "RH e Gestão" },
  { profile: "Financeiro", description: "Financeiro e Gestão" },
  { profile: "Marketing", description: "Marketing e Gestão" },
  { profile: "Conselheiro", description: "Gestão" },
  { profile: "Técnico", description: "Treinos" },
  { profile: "Operacional", description: "Operacional e Gestão" },
  { profile: "Atleta", description: "Dashboard" },
];

export const organization = [
  { name: "Leto", role: "Diretor de Projetos e Gestão" },
  { name: "Tutinha", role: "Diretor de Estratégia e Operações" },
  { name: "Vito", role: "Gestor de Marketing" },
  { name: "Giu", role: "Gestora de RH e Tesouraria" },
  { name: "Vic", role: "Colaboradora Estratégica" },
];

export const landingSections = [
  {
    title: "Propósito e Inclusão",
    text: "Iniciativa esportiva independente com foco no desenvolvimento humano, social e comunitário, oferecendo a experiência real de atleta a jovens e adultos, com ênfase na disciplina, responsabilidade e acolhimento.",
    icon: Users,
  },
  {
    title: "Modalidade Principal",
    text: "Voleibol como atividade central, com plano de expansão para outras modalidades.",
    icon: Dumbbell,
  },
  {
    title: "Público-alvo",
    text: "Jovens Sub-19 e adultos de ambos os gêneros. Atletas em formação e reinserção esportiva.",
    icon: ClipboardList,
  },
  {
    title: "Impacto Comunitário",
    text: "Prevenção à evasão esportiva, redução da exposição de jovens a riscos sociais, estímulo à saúde física e mental, fortalecimento do vínculo comunitário.",
    icon: Banknote,
  },
  {
    title: "Cronograma Flexível",
    text: "Proposta de utilização do espaço aos finais de semana em horários variados e em dias úteis no período noturno, com total flexibilidade para alinhamento conforme a disponibilidade institucional.",
    icon: CalendarDays,
  },
  {
    title: "Foco Social e Comunitário",
    text: "Buscamos ocupar horários disponíveis das quadras por meio de parceria com foco em um legado esportivo sustentável e organizado para a comunidade local.",
    icon: Users,
  },
];


