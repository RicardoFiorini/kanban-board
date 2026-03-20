# Kanban Board - Gestão de Tarefas
Este projeto é uma aplicação de quadro Kanban desenvolvida com o framework Angular, focada na organização visual de tarefas e otimização de fluxo de trabalho.
> [!TIP]
> A aplicação faz uso extensivo do módulo DragDrop do Angular CDK para proporcionar uma experiência de usuário fluida e profissional.
## Tecnologias Utilizadas

- **Angular:** Framework principal para a estrutura da SPA.
- **TypeScript:** Tipagem estática para um código mais seguro e escalável.
- **Angular CDK (Drag and Drop):** Biblioteca para manipulação de listas interativas.
- **SCSS/CSS3:** Estilização customizada das colunas e cartões.

## Funcionalidades Implementadas
- [x] Interface dividida em colunas de progresso
- [x] Movimentação de tarefas via Drag and Drop
- [x] Criação dinâmica de novos cards
- [x] Persistência local das tarefas
- [ ] Integração com backend para múltiplos usuários
## Como Executar o Projeto
Certifique-se de ter o *Angular CLI* instalado globalmente antes de começar:
```bash

Clonar o repositório
git clone https://github.com/RicardoFiorini/kanban-board.git
Entrar na pasta
cd kanban-board
Instalar dependências
npm install
Iniciar o servidor de desenvolvimento
ng serve

```
## Estrutura do Quadro
| Coluna | Descrição |
| --- | --- |
| To Do | Tarefas que ainda não foram iniciadas |
| Doing | Tarefas em processo de execução |
| Done | Tarefas finalizadas e revisadas |
## Componentes Principais
`import { DragDropModule } from '@angular/cdk/drag-drop';`
## Conclusão
*Desenvolver este Kanban Board com Angular me permitiu entender a fundo como gerenciar estados complexos de UI e como as diretivas estruturais do framework facilitam a criação de interfaces dinâmicas e reativas.*
