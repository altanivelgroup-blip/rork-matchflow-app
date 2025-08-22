export const PROMO_GRAPHICS = {
  gallery: {
    collage: 'https://r2-pub.rork.com/generated-images/5345414a-7c5d-437a-822b-384c8ff72d89.png',
  },
  aiDreamDate: {
    simulator: 'https://r2-pub.rork.com/generated-images/a665e66c-c13e-4402-a3f9-7950bd37f50e.png',
  },
  matchCelebration: {
    fireworks: 'https://r2-pub.rork.com/generated-images/13185672-087d-4ac7-b151-dbf9b740c08e.png',
  },
  connection: {
    romantic: 'https://r2-pub.rork.com/generated-images/a91c3e04-1c0d-4891-a511-e3d4feeddd15.png',
  },
} as const;

export type PromoGraphicCategory = keyof typeof PROMO_GRAPHICS;
export type PromoGraphicType<T extends PromoGraphicCategory> = keyof typeof PROMO_GRAPHICS[T];