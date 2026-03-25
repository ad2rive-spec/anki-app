// SM-2 Algorithm
// quality: 0=完全不記得, 1=很難, 2=困難, 3=還行, 4=容易, 5=非常容易

export function sm2(card, quality) {
  let { interval = 1, easeFactor = 2.5, reps = 0 } = card;

  if (quality >= 3) {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    reps += 1;
  } else {
    reps = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { interval, easeFactor, reps, nextReview };
}

export function isDue(card) {
  if (!card.nextReview) return true;
  const due = card.nextReview.toDate ? card.nextReview.toDate() : new Date(card.nextReview);
  return due <= new Date();
}
