export function productivityScore(total: number, completed: number, onTime: number, ratings: number[]) {
  const completionRate = total ? completed / total : 0;
  const onTimeRate = completed ? onTime / completed : 0;
  const rating = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
  return { rating, score: Math.round(completionRate * 50 + onTimeRate * 20 + (rating === null ? 0 : rating / 5 * 30)) };
}
