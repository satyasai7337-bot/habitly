// A rotating "thought of the day". One is chosen by the calendar day so it's
// stable for the whole day and changes each day, cycling through the list.

export const THOUGHTS = [
  "Small habits, repeated daily, become the person you're becoming.",
  "You don't have to be extreme, just consistent.",
  "Drink the water. Take the walk. Your future self says thanks.",
  "Discipline is choosing what you want most over what you want now.",
  "One glass, one rep, one page — progress is built in small moves.",
  "Your body hears everything your routine says.",
  "Motivation gets you started; habits keep you going.",
  "Missed yesterday? Today is a clean slate. Start again.",
  "Sleep isn't lazy — it's how you recharge for everything else.",
  "The walk you don't feel like taking is the one you'll be glad you did.",
  "Tiny 1% improvements add up to a different you in a year.",
  "What you do daily matters more than what you do once in a while.",
  "Don't break the chain — keep your streak alive today.",
  "Take care of your body; it's the only place you have to live.",
  "Quitting a bad habit is a gift you give your future self.",
  "Every time you say no to a craving, you grow a little stronger.",
  "Hydrate, move, rest, repeat. Simple beats fancy.",
  "Progress, not perfection. Just show up today.",
  "A short workout still beats the workout you skipped.",
  "Your habits are voting for the kind of person you'll become.",
  "Calm mind, strong body — both are built one day at a time.",
  "The best time to start was yesterday. The next best time is now.",
  "Replace the urge with a glass of water and a deep breath.",
  "Consistency is more powerful than intensity.",
  "Eat to fuel your day, not to fight your mood.",
  "Rest is productive. Burnout is not.",
  "You're one good habit away from a better week.",
  "Don't count the days — make the days count.",
  "Strength is built in the boring, repeated days.",
  "A journey of a thousand miles begins with a single step.",
  "Be stronger than your excuses.",
  "Future you is watching what you do right now.",
  "Move your body so your mind can rest.",
  "Slow progress is still progress. Keep going.",
  "The habit you protect today protects you tomorrow.",
  "Win the morning, win the day.",
  "Less scrolling, more strolling.",
  "Your only competition is who you were yesterday.",
  "Show up for yourself the way you show up for others.",
  "Good days are built, not found.",
];

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

export function thoughtForDate(d = new Date()) {
  return THOUGHTS[dayOfYear(d) % THOUGHTS.length];
}
