# Luz de Mãe: Cuidado que Protege Vidas
 
## Título do projeto: Luz de Mãe 

###  1. Descrição do Problema 

#### O Problema:

A mortalidade fetal é uma tragédia silenciosa e, em muitos casos, evitável. Um dos principais fatores que levam ao óbito fetal é a falta de acompanhamento adequado e o abandono do pré-natal.
Muitas gestações de risco não são monitoradas de perto devido à dificuldade de comunicação entre o sistema de saúde e a paciente, ou pela falta de compreensão da gestante sobre a importância de exames e sintomas de alerta. 

 

#### Público e Contexto Afetado:

Gestantes, especialmente aquelas que dependem do sistema público de saúde (SUS) e mães de primeira viagem. O projeto também apoia Agentes Comunitários de Saúde e enfermeiros, 
que precisam monitorar o engajamento dessas mulheres no pré-natal. 

 

#### Bases de Dados Públicas:

*DATASUS - SIM* (Sistema de Informação sobre Mortalidade): Para entender as principais causas e as regiões com maiores taxas de óbito fetal histórico. 

[Datasus](http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sim/cnv/fet10uf.def) 
 

#### DATASUS - SINASC (Sistema de Informações sobre Nascidos Vivos):

Para cruzar dados de nascimentos saudáveis e correlacionar com a quantidade de consultas de pré-natal realizadas (evidenciando a importância da adesão). 

### 2. Proposta de Solução Tecnológica 

#### Como a solução ataca o problema:

O "Luz de Mãe" é um aplicativo que atua como uma "caderneta da gestante digital e inteligente". Mais do que agendar consultas, ele traduz termos médicos para uma linguagem acolhedora, 
avisa sobre a importância de vacinas e exames de cada trimestre, e monitora o bem-estar da mãe. Se a gestante faltar a uma consulta ou registrar um sintoma de risco (como pressão alta) no app, um alerta é enviado para 
a Unidade Básica de Saúde (UBS) da sua região, permitindo que a rede de saúde faça uma busca ativa antes que o quadro se agrave. 


#### Tecnologias que serão implementadas: 

*Front-end: NextJs/React.*

*Back-end: Node.js com framework NestJs.*

*Banco de Dados DEV: SQLite.*

### Justificativa das escolhas técnicas:

- **Next.js/React (front-end):** a gestante acessa o Luz de Mãe pelo navegador do celular, sem baixar nada da loja e sem ocupar espaço no aparelho. Isso importa para quem usa celulares mais simples, que vivem com a memória cheia. O Next.js entrega as páginas já montadas pelo servidor, então elas abrem rápido mesmo em conexões móveis lentas. O React permite reaproveitar os mesmos componentes, como o cartão de consulta e o aviso de exame, em todas as telas.

- **Node.js com NestJS (back-end):** o back-end usa TypeScript, a mesma linguagem do front-end, então a equipe compartilha tipos e regras de validação entre as duas pontas e evita divergências nos dados de saúde. O NestJS organiza o código em módulos independentes (gestantes, consultas, sintomas e alertas para a UBS), o que facilita dividir o trabalho entre os integrantes e testar cada parte isoladamente. O modelo assíncrono do Node.js atende bem o envio de alertas para a UBS, quenão pode travar o uso do app pela gestante.

- **SQLite (banco de desenvolvimento):** o banco inteiro fica em um único arquivo e não exige instalarnem configurar servidor, então cada integrante roda o projeto completo na própria máquina em poucos minutos. Porser relacional, ele já modela desde o início as relações que o sistema precisa, como gestante, consultas agendadas e sintomas registrados. Isso garante agilidadena prototipagem e nos testes iniciais da solução.

### 3. Identidade Visual Inicial 

####  Logo do Projeto:

<p align="center">
  <img src="logo.svg" alt="Logo do Luz de Mãe: silhuet
a de uma gestante abraçando o ventre, envolta por uma
folha" width="240">
</p>

A logo apresenta a silhueta delicada de uma gestante abraçando o ventre, ladeada por formas que remetem a folhas e proteção, simbolizando o cuidado contínuo, a vida em formação e o acolhimento. 

  

#### Paleta de Cores: 

 Rosa Pastel (Cor Principal): #FAD0C9 (Transmite acolhimento, cuidado maternal, empatia e tranquilidade). 

 Rosa Bebê (Cor Secundária): #F8E9E3 (Utilizado para fundos, trazendo leveza e respiro para a interface). 

 Cinza Escuro (Texto): #4A4A4A (Garante alta legibilidade e contraste, sem o peso agressivo da cor preta, mantendo a suavidade do design). 

#### Tipografia: 

##### Títulos:

Poppins (Uma fonte arredondada, amigável e moderna, que passa a sensação de proximidade). 

#### Textos Principais:

Open Sans (Limpa e altamente legível, garantindo que gestantes de qualquer idade consigam ler as orientações de saúde sem esforço). 

### 4. Pitch Inicial 

*O Luz de Mãe é um aplicativo de acompanhamento humanizado que transforma o pré-natal em uma jornada de acolhimento e segurança. Diferente de sistemas médicos frios ou cadernetas de papel que acabam esquecidas, nossa solução cria uma ponte digital entre a gestante e o sistema de saúde. Ao traduzir orientações médicas para uma linguagem simples e alertar automaticamente a rede de apoio caso a paciente falte a consultas cruciais, o Luz de Mãe atua na prevenção ativa, garantindo que nenhuma mulher passe por uma gestação de risco desamparada. Cuidar do pré-natal é proteger o futuro, e a tecnologia é a nossa ferramenta para salvar vidas.*

### 5. Equipe / Integrantes do Grupo 

`Faruc Matheus de Medeiros Martins - RA: 20261017031`

`Felipe Komninakis - RA: 2026109201`

`Weverton da Silva Luna - RA: 2026110799`

 

Projeto desenvolvido para o Checkpoint 1 do FMU Tech Inovação 1ª Edição (2026.2) - Contribuindo para o ODS 3 da ONU (Saúde e Bem-Estar).
