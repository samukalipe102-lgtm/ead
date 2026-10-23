// Seed do banco com o CONTEÚDO REAL preservado do protótipo HTML original.
// Nada foi inventado: textos, transcrições, atividades e quizzes são os mesmos
// do arquivo original. Senhas iniciais são aplicadas com hash (nunca texto puro).
//
// IMPORTANTE (preservação): o seed NÃO apaga dados existentes. Ele apenas insere
// registros que ainda não existem (INSERT OR IGNORE / checagem de existência),
// de modo a nunca sobrescrever usuários, mensagens, notas ou certificados reais.

import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { initDb, getDb, get, run, tx } from './index.js';
import { resolveDbPath } from '../config.js';

// ---- Conteúdo dos 6 cursos (preservado integralmente do HTML original) ----
export const COURSES = [
  {
    id: 'c1',
    title: 'Curso 1 — Introdução à Umbanda e Desenvolvimento Mediúnico',
    hours: 100, type: 'COMPLEMENTARY', category: 'Fundamentos & Mediunidade',
    description: 'Acolhimento para iniciantes e médiuns em desenvolvimento. Apresenta os pilares éticos, históricos e práticos da religião com respeito às diversidades de cada terreiro.',
    modules: [
      { id: 'c1_m1', title: 'Módulo 1 — História, Fundamentos e Valores da Umbanda', order: 1, lessons: [
        { id: 'c1_m1_l1', title: 'Aula 1 — O que é a Umbanda? Origens, princípios e acolhimento', duration: '45m',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          content: `A Umbanda é uma religião brasileira fundada na caridade, na fraternidade e no respeito à natureza e ao ser humano. Manifestada publicamente no início do século XX pelo Caboclo das Sete Encruzilhadas através do médium Zélio Fernandino de Moraes, a Umbanda sintetiza o encontro de sabedoria dos povos indígenas, da ancestralidade africana, do cristianismo e do espiritismo.

Nesta aula fundamental, estudamos o princípio basilar da Umbanda: "A manifestação do espírito para a caridade". A religião não faz distinção de cor, raça, gênero ou condição social. Todos são acolhidos para o alívio das dores físicas e espirituais.`,
          transcript: 'Seja bem-vindo ao estudo dos Fundamentos da Umbanda. Hoje abordaremos o surgimento histórico da religião e seus pilares primordiais de caridade e acolhimento livre de preconceitos.',
          activity: 'Reflita e escreva um texto breve (10 a 15 linhas) sobre como o princípio da caridade desinteressada se aplica ao trabalho diário no terreiro.',
          quiz: [ { question: 'Qual é o pilar ético fundamental da Umbanda formulado desde sua origem?', options: ['A busca por bens materiais', 'A manifestação do espírito para a caridade', 'A obrigatoriedade de dogmas rígidos', 'O isolamento social'], correct: 1 } ] },
        { id: 'c1_m1_l2', title: 'Aula 2 — A diversidade das tradições e a conduta ética no terreiro', duration: '50m',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          content: `A Umbanda é ricamente diversa. Não existe um papado ou um livro único e imutável. Cada terreiro possui suas tradições locais, herdadas de seus fundadores e guias espirituais. Respeitar essa diversidade é pré-requisito para o médium consciente.

A conduta ética abrange a humildade na corrente, a pontualidade, a postura respeitosa com a assistência e o sigilo absoluto das dores compartilhadas pelos consulentes durante o atendimento espiritual.`,
          transcript: 'Nesta segunda aula, analisamos como as diferentes casas de Umbanda organizam suas práticas e a importância vital da ética e do sigilo sacerdotal e mediúnico.',
          activity: 'Identifique 3 atitudes éticas indispensáveis para um médium durante uma gira pública de atendimento.',
          quiz: [ { question: 'Por que o sigilo referente aos atendimentos é obrigatório?', options: ['Por capricho da administração', 'Para proteger a dignidade e privacidade do consulente', 'Para ocultar os fundamentos', 'Apenas por tradição verbal'], correct: 1 } ] },
      ]},
      { id: 'c1_m2', title: 'Módulo 2 — O Desenvolvimento Mediúnico Consciente', order: 2, lessons: [
        { id: 'c1_m2_l1', title: 'Aula 1 — Sensibilidade, concentração e equilíbrio emocional', duration: '40m', videoUrl: null,
          content: `A mediunidade na Umbanda é encarada como uma ferramenta de serviço e autoaperfeiçoamento, não como um privilégio ou poder. O desenvolvimento mediúnico exige disciplina mental, oração, vigilância dos pensamentos e equilíbrio das emoções.

O médium deve aprender a silenciar a mente, diferenciar suas próprias emoções das intuições trazidas pelos guias e manter a serenidade diante das dificuldades.`,
          transcript: 'Aprender a concentrar-se e manter a higiene mental diária é a base para uma incorporação harmoniosa e segura.',
          activity: 'Elabore um diário de reflexão pessoal sobre momentos de sensibilidade percebidos durante a semana.',
          quiz: [ { question: 'Qual a atitude mental correta no desenvolvimento mediúnico?', options: ['Vaidade e exibicionismo', 'Vigilância, humildade e equilíbrio emocional', 'Insegurança constante', 'Indiferença ao próximo'], correct: 1 } ] },
      ]},
    ],
  },
  {
    id: 'c2',
    title: 'Curso 2 — Ervas, Banhos, Defumação e Elementos Naturais',
    hours: 100, type: 'COMPLEMENTARY', category: 'Fundamentos da Natureza',
    description: 'Estudo aprofundado do uso tradicional das plantas rituais, classificação de ervas (quentes, mornas e frias), preparo seguro de banhos, defumação ritual e preservação ambiental.',
    modules: [
      { id: 'c2_m1', title: 'Módulo 1 — Classificação e Uso Sagrado das Ervas', order: 1, lessons: [
        { id: 'c2_m1_l1', title: 'Aula 1 — Ervas Quentes, Mornas e Frias: Conceitos e Aplicação', duration: '50m', videoUrl: null,
          content: `As ervas na Umbanda são veículos de vibração da natureza (axé vegetal). Elas se dividem tradicionalmente em:
1. Ervas Quentes (Limpadoras/Agressivas): Utilizadas para descarrego pesado (ex: arruda, guiné, espada de São Jorge).
2. Ervas Mornas (Equilibradoras/Manutenção): Restauram o campo energético (ex: manjericão, alecrim, alfazema).
3. Ervas Frias (Específicas/Acalmadoras): Atuam nos chakras superiores e conectam com a espiritualidade suave (ex: colônia, rosa branca).

O conhecimento das ervas garante o uso ritual seguro, evitando irritações cutâneas e reações alérgicas.`,
          transcript: 'Bem-vindo ao estudo fitoenergético da Umbanda. Hoje aprenderemos a categorizar as ervas e utilizá-las com respeito e responsabilidade.',
          activity: 'Monte uma lista com 3 ervas de cada categoria (quente, morna e fria) e descreva a forma correta de colheita e maceração.',
          quiz: [ { question: 'Qual das seguintes ervas é considerada equilibradora/morna?', options: ['Arruda', 'Manjericão', 'Pimenta malagueta', 'Espada de Ogum'], correct: 1 } ] },
      ]},
    ],
  },
  {
    id: 'c3',
    title: 'Curso 3 — Trabalhos Espirituais e Práticas Religiosas',
    hours: 100, type: 'COMPLEMENTARY', category: 'Ritualística & Prática',
    description: 'Fundamentos dos rituais, abertura e fechamento de giras, firmezas, pontos de atração e descarrego, postura do médium passista e acolhimento aos consulentes.',
    modules: [
      { id: 'c3_m1', title: 'Módulo 1 — Organização Ritualística e Condução da Gira', order: 1, lessons: [
        { id: 'c3_m1_l1', title: 'Aula 1 — A estrutura e sacredade do espaço da gira', duration: '45m', videoUrl: null,
          content: `A gira é o momento em que o terreiro se abre como um portal de luz entre o plano material e o espiritual. Desde o bater da cabeça no congá até a defumação e a chamada das linhas, cada ato ritual possui um fundamento profundo de proteção e harmonização das correntes.`,
          transcript: 'Aprenda os fundamentos ritualísticos da abertura e fechamento dos trabalhos em terreiro.',
          activity: 'Descreva a sequência habitual de abertura de uma gira conforme a tradição estudada.',
          quiz: [ { question: 'Qual a finalidade principal da defumação inicial da gira?', options: ['Apenas aromatizar o ambiente', 'Limpar e harmonizar o campo vibratório do terreiro e da assistência', 'Substituir as orações', 'Acelerar o encerramento'], correct: 1 } ] },
      ]},
    ],
  },
  {
    id: 'c4',
    title: 'Curso 4 — Orixás, Linhas de Trabalho e Fundamentos',
    hours: 100, type: 'COMPLEMENTARY', category: 'Teologia & Tradição',
    description: 'Estudo teológico sobre as divindades (Orixás), as Sete Linhas de Umbanda e as falanges de trabalhadores espirituais: Pretos-Velhos, Caboclos, Crianças, Exus e Pombagiras.',
    modules: [
      { id: 'c4_m1', title: 'Módulo 1 — As Tronos Divinas e as Linhas de Ação', order: 1, lessons: [
        { id: 'c4_m1_l1', title: 'Aula 1 — Os Orixás como manifestações dos atributos divinos de Deus (Olorum)', duration: '55m', videoUrl: null,
          content: `Na Umbanda, Olorum é Deus Único, Onipresente e Onipotente. Os Orixás são Suas divindades emanadas, regentes das forças da natureza e das qualidades morais da criação (Fé, Amor, Conhecimento, Justiça, Lei, Evolução e Geração).`,
          transcript: 'Estudaremos a visão umbandista sobre os Orixás como tronos e forças estruturantes da criação divina.',
          activity: 'Correlacione os 7 Orixás principais com os correspondentes sentidos morais e elementos da natureza.',
          quiz: [ { question: 'Na teologia umbandista, o que são os Orixás?', options: ['Seres humanos divinizados', 'Manifestações e atributos das forças de Deus (Olorum) na natureza', 'Apenas figuras míticas', 'Espíritos desencarnados comuns'], correct: 1 } ] },
      ]},
    ],
  },
  {
    id: 'c5',
    title: 'Curso 5 — Pontos Cantados, Atabaques e Cultura da Umbanda',
    hours: 100, type: 'COMPLEMENTARY', category: 'Musicalidade & Tradição Oral',
    description: 'A função vibratória das orações cantadas (pontos), ritmos tradicionais (Ijexá, Nagô, Barravento), preservação da memória oral da Umbanda e musicalidade litúrgica.',
    modules: [
      { id: 'c5_m1', title: 'Módulo 1 — A Ciência do Ponto Cantado e do Toque', order: 1, lessons: [
        { id: 'c5_m1_l1', title: 'Aula 1 — Ponto Cantado: Mantras, Evocação e Vibração no Congá', duration: '40m', videoUrl: null,
          content: `O ponto cantado na Umbanda não é mero entretenimento ou apresentação musical. É uma oração em ritmo e rima que altera o padrão de frequência do terreiro, evocando a presença das falanges espirituais e ancorando o axé dos Orixás.`,
          transcript: 'Entenda como o som e a intenção do curimba direcionam as energias da corrente espiritual.',
          activity: 'Grave ou transcreva um ponto cantado tradicional da linha de Pretos-Velhos e explique seu significado espiritual.',
          quiz: [ { question: 'Qual é a função primordial do ponto cantado na gira?', options: ['Preencher o silêncio', 'Ancorar vibrações espirituais, evocar falanges e direcionar a corrente', 'Distrair a assistência', 'Substituir a doutrina'], correct: 1 } ] },
      ]},
    ],
  },
  {
    id: 'c6',
    title: 'Curso 6 — Formação Sacerdotal: Pai ou Mãe de Santo',
    hours: 300, type: 'SACERDOTAL', category: 'Formação Sacerdotal de 300 Horas',
    description: 'A formação completa para capacitados à direção de terreiros de Umbanda. Abrange 12 módulos aprofundados com ética sacerdotal, gestão do terreiro, orientação mediúnica, doutrina e projeto pedagógico final.',
    modules: [
      { id: 'c6_m1', title: 'Módulo 1 — Fundamentos Sacerdotais e História da Umbanda', order: 1, lessons: [
        { id: 'c6_m1_l1', title: 'Aula 1 — A vocação sacerdotal, a humildade e a liderança comunitária', duration: '60m',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          content: `Ser Pai ou Mãe de Santo é assumir o compromisso de servir como pai/mãe espiritual de uma comunidade. O sacerdócio umbandista exige renúncia da vaidade, dedicação aos aflitos, estudo constante e exemplo de postura pessoal.

Nesta aula inicial da formação sacerdotal de 300h, analisamos o compromisso do dirigente de manter as portas abertas para a caridade e orientar com amor e firmeza seus filhos de fé.`,
          transcript: 'Seja bem-vindo ao programa de Formação Sacerdotal. Hoje iniciaremos nossa reflexão sobre o papel do dirigente espiritual e os pilares de liderança moral e acolhimento.',
          activity: 'Redija uma carta de intenção sacerdotal explicitando seus valores e o compromisso moral assumido perante a Umbanda.',
          quiz: [ { question: 'Qual a principal qualidade exigida de um dirigente sacerdotal na Umbanda?', options: ['Domínio autoritário sobre os médiuns', 'Humildade, dedicação ao próximo e postura de serviço', 'Exclusividade de conhecimento oculto', 'Busca por proeminência social'], correct: 1 } ] },
        { id: 'c6_m1_l2', title: 'Aula 2 — Responsabilidade e Ética no Atendimento ao Público', duration: '55m',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          content: `O atendimento espiritual é o momento de maior vulnerabilidade do consulente. O sacerdote é o fiador da ética no terreiro, garantindo que nenhum médium ultrapasse os limites do respeito, da confidencialidade ou da integridade física e emocional de quem busca ajuda.`,
          transcript: 'Nesta aula trataremos da gestão da ética no terreiro, proteção aos consulentes e limitação responsável das orientações espirituais.',
          activity: 'Elabore um Código de Conduta Ética para médiuns da assistência e do atendimento.',
          quiz: [ { question: 'O que o sacerdote deve fazer se um consulente relatar problemas severos de saúde física ou psíquica?', options: ['Mandar suspender tratamentos médicos', 'Garantir acolhimento espiritual e orientar expressamente o acompanhamento por profissionais de saúde qualificados', 'Ignorar o relato', 'Cobrar por um ritual especial'], correct: 1 } ] },
      ]},
      { id: 'c6_m2', title: 'Módulo 2 — Organização Administrativa e Jurídica do Terreiro', order: 2, lessons: [
        { id: 'c6_m2_l1', title: 'Aula 1 — Estatuto, regimento interno e responsabilidade comunitária', duration: '50m', videoUrl: null,
          content: `Um terreiro de Umbanda também é uma instituição civil que se relaciona com a sociedade. O sacerdote deve compreender noções de organização administrativa, constituição de associação sem fins lucrativos, regimento interno claro e cumprimento da LGPD e normas ambientais.`,
          transcript: 'Orientações práticas sobre formalização jurídica, estatuto social e convivência comunitária.',
          activity: 'Rascunhe os tópicos essenciais de um Regimento Interno para um terreiro comunitário.',
          quiz: [ { question: 'Por que é recomendável a formalização jurídica e organização do terreiro?', options: ['Para cobrar mensalidades obrigatórias', 'Para garantir transparência, proteção legal, segurança comunitária e regularidade perante a sociedade', 'Para criar um negócio privado', 'É proibido ter estatuto social'], correct: 1 } ] },
      ]},
    ],
  },
];

// Usuários iniciais. As senhas são as mesmas do protótipo ('123') porém agora
// armazenadas com hash. Devem ser trocadas no primeiro acesso (ver docs).
const USERS = [
  { id: '100', name: 'Diretoria Sacerdotal', email: 'admin@umbanda.org', role: 'ADMIN', password: '123', courses: [] },
  { id: 'u3', name: 'Maria da Silva', email: 'aluno@umbanda.org', role: 'STUDENT', password: '123', courses: ['c6', 'c1', 'c2'] },
  { id: 'u4', name: 'Carlos Eduardo', email: 'carlos@gmail.com', role: 'STUDENT', password: '123', courses: ['c1'] },
];

function videoStatusFor(url) {
  // Estado real derivado da URL conhecida. URL ausente => UNAVAILABLE.
  return url ? 'AVAILABLE' : 'UNAVAILABLE';
}

export function seed() {
  tx(() => {
    // Cursos / módulos / aulas (preserva: só insere o que não existe)
    for (let ci = 0; ci < COURSES.length; ci++) {
      const c = COURSES[ci];
      const exists = get('SELECT id FROM courses WHERE id = ?', [c.id]);
      if (!exists) {
        run('INSERT INTO courses (id,title,hours,type,category,description,sort_order) VALUES (?,?,?,?,?,?,?)',
          [c.id, c.title, c.hours, c.type, c.category, c.description, ci]);
      }
      for (const m of c.modules) {
        if (!get('SELECT id FROM modules WHERE id = ?', [m.id])) {
          run('INSERT INTO modules (id,course_id,title,sort_order) VALUES (?,?,?,?)',
            [m.id, c.id, m.title, m.order]);
        }
        for (let li = 0; li < m.lessons.length; li++) {
          const l = m.lessons[li];
          if (!get('SELECT id FROM lessons WHERE id = ?', [l.id])) {
            run(`INSERT INTO lessons
              (id,module_id,course_id,title,duration,content,transcript,activity,quiz_json,video_url,video_status,sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
              [l.id, m.id, c.id, l.title, l.duration, l.content, l.transcript, l.activity,
               JSON.stringify(l.quiz || []), l.videoUrl, videoStatusFor(l.videoUrl), li]);
          }
        }
      }
    }

    // Usuários + acessos
    for (const u of USERS) {
      if (!get('SELECT id FROM users WHERE email = ?', [u.email])) {
        run('INSERT INTO users (id,name,email,password_hash,role,status) VALUES (?,?,?,?,?,?)',
          [u.id, u.name, u.email, bcrypt.hashSync(u.password, 10), u.role, 'ACTIVE']);
      }
      for (const cid of u.courses) {
        run('INSERT OR IGNORE INTO course_access (user_id,course_id) VALUES (?,?)', [u.id, cid]);
      }
    }

    // Inscrições preservadas
    const enrollments = [
      { id: 'e1', userId: 'u3', userName: 'Maria da Silva', email: 'aluno@umbanda.org', courseId: 'c6', courseTitle: 'Curso 6 — Formação Sacerdotal: Pai ou Mãe de Santo (300h)', status: 'APPROVED', requestDate: '2026-10-10', notes: 'Inscrição sacerdotal confirmada e liberada.' },
      { id: 'e2', userId: 'u4', userName: 'Carlos Eduardo', email: 'carlos@gmail.com', courseId: 'c1', courseTitle: 'Curso 1 — Introdução à Umbanda e Desenvolvimento Mediúnico', status: 'APPROVED', requestDate: '2026-10-22', notes: 'Solicitação inicial aprovada.' },
    ];
    for (const e of enrollments) {
      if (!get('SELECT id FROM enrollments WHERE id = ?', [e.id])) {
        run('INSERT INTO enrollments (id,user_id,user_name,email,course_id,course_title,status,request_date,notes) VALUES (?,?,?,?,?,?,?,?,?)',
          [e.id, e.userId, e.userName, e.email, e.courseId, e.courseTitle, e.status, e.requestDate, e.notes]);
      }
    }

    // Comunicado preservado
    if (!get('SELECT id FROM announcements WHERE id = ?', ['ann-1'])) {
      run('INSERT INTO announcements (id,title,content,target_group,author_name,date,pinned) VALUES (?,?,?,?,?,?,?)',
        ['ann-1', 'Abertura das Inscrições para a Formação Sacerdotal (300h)',
         'Sejam bem-vindos ao ciclo de estudos sacerdotais de 2026. Lembrem-se de verificar suas atividades práticas no Módulo 1.',
         'ALL', 'Diretoria Sacerdotal', '2026-10-20', 1]);
    }

    // Nota preservada
    if (!get('SELECT id FROM grades WHERE id = ?', ['g-1'])) {
      run('INSERT INTO grades (id,student_id,student_name,course_id,course_title,assignment_name,score,max_score,feedback,date) VALUES (?,?,?,?,?,?,?,?,?,?)',
        ['g-1', 'u3', 'Maria da Silva', 'c6', 'Curso 6 — Formação Sacerdotal: Pai ou Mãe de Santo (300h)',
         'Avaliação Teórica - Módulo 1', 9.5, 10, 'Excelente compreensão dos fundamentos éticos e liderança humilde.', '2026-10-22']);
    }

    // Certificado preservado
    if (!get('SELECT id FROM certificates WHERE id = ?', ['CERT-300-8841'])) {
      run('INSERT INTO certificates (id,user_id,user_name,course_id,course_title,hours,issue_date,status) VALUES (?,?,?,?,?,?,?,?)',
        ['CERT-300-8841', 'u3', 'Maria da Silva', 'c6', 'Curso 6 — Formação Sacerdotal: Pai ou Mãe de Santo', 300, '2026-10-23', 'VALID']);
    }

    // Mensagem preservada (migrada para o modelo de threads reais)
    if (!get('SELECT id FROM message_threads WHERE id = ?', ['thread-seed-1'])) {
      run('INSERT INTO message_threads (id,student_id,subject,course_id) VALUES (?,?,?,?)',
        ['thread-seed-1', 'u3', 'Dúvida sobre bibliografia do Módulo 1', 'c6']);
      run('INSERT INTO messages (id,thread_id,sender_id,sender_role,body,created_at) VALUES (?,?,?,?,?,?)',
        ['m-seed-1', 'thread-seed-1', 'u3', 'STUDENT',
         'Saravá a todos! Gostaria de saber qual a bibliografia recomendada para aprofundar o estudo do Módulo 1 sobre liderança sacerdotal?', '2026-10-22 14:15']);
      run('INSERT INTO messages (id,thread_id,sender_id,sender_role,body,created_at) VALUES (?,?,?,?,?,?)',
        ['m-seed-2', 'thread-seed-1', '100', 'ADMIN',
         'Axé, Maria! Recomendamos a leitura dos materiais em PDF anexos na aula e as obras clássicas de síntese doutrinária e ética do terreiro.', '2026-10-22 15:30']);
    }

    // Configuração de e-mail (destino). Credenciais ficam em variáveis de ambiente.
    if (!get('SELECT id FROM email_settings WHERE id = 1')) {
      run('INSERT INTO email_settings (id,destination_email) VALUES (1,?)', ['admin@umbanda.org']);
    }
  });
}

// Execução direta: node src/db/seed.js
if (import.meta.url === `file://${process.argv[1]}`) {
  initDb(resolveDbPath());
  seed();
  console.log('Seed concluído. Banco em:', resolveDbPath());
}
