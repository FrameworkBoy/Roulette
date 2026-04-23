import { CLIENT } from './client';

export const CONTENT = {
  home: {
    primaryCta: 'Começar',
    secondaryCta: 'Assista aos vídeos',
  },

  register: {
    submitCta: 'Continuar →',
    submitLoadingCta: 'Salvando...',
  },

  quiz: {
    questionLabel: 'Pergunta',
  },

  result: {
    scoreLabel: 'acertos!',
    eligibleTitle: 'Quiz finalizado',
    ineligibleTitle: 'Quiz finalizado.\nNão foi dessa vez!',
    eligibleMessage: 'Parabéns! Você atingiu a pontuação!',
    ineligibleMessage: `Obrigado por participar.\nVeja as unidades da ${CLIENT.name}.`,
    eligibleCta: 'Girar a roleta!',
    ineligibleCta: 'Ver nossas unidades',
  },

  roulette: {
    noPrizeTitle: 'Que pena!',
    winTitle: 'Parabéns!',
    /** Use {prize} as a placeholder for the prize label. */
    winBody: 'Você ganhou\n{prize}!',
    continueCta: 'Ver nossas unidades',
  },

  units: {
    sectionHeader: 'Nossas unidades',
    videoCta: 'Assista ao vídeo',
    skipCta: 'Pular e finalizar.',
    backCta: 'Voltar',
  },

  postInteraction: {
    title: 'Conheça nossas unidades',
    subtitle: 'Venha nos visitar e transforme sua vida!',
    skipCta: 'Pular',
  },
};
