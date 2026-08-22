// Starter content for the initial "Smart Money Concepts (SMC)" course.
// This is seed data only — the admin can edit, reorder, publish/unpublish,
// or delete any of it later through the Training Management admin UI.
// Nothing here is hardcoded into the frontend.

export interface SeedLesson {
  title: string;
  content: string;
  order: number;
}

export interface SeedChapter {
  title: string;
  description: string;
  order: number;
  lessons: SeedLesson[];
}

export interface SeedAnswer {
  answer: string;
  isCorrect: boolean;
  order: number;
}

export interface SeedQuestion {
  question: string;
  points: number;
  order: number;
  answers: SeedAnswer[];
}

export const SMC_COURSE = {
  title: 'Smart Money Concepts (SMC)',
  slug: 'smart-money-concepts',
  description:
    'Learn the fundamentals of Smart Money Concepts, including market structure, liquidity, order blocks, fair value gaps, premium and discount, and displacement.',
  isPublished: true,
  isRequired: true,
  order: 1,
  assessment: {
    title: 'Final SMC Assessment',
    passingScore: 70,
    isPublished: true,
  },
};

export const SMC_CHAPTERS: SeedChapter[] = [
  {
    title: 'Introduction to Smart Money Concepts',
    description: 'What SMC is, why it matters, and the terminology used throughout this course.',
    order: 1,
    lessons: [
      {
        title: 'What is Smart Money Concepts?',
        order: 1,
        content: `Smart Money Concepts (SMC) is a framework for reading price charts that focuses on how large institutional participants — banks, funds, and other "smart money" — tend to move price to accumulate and distribute positions. Rather than relying purely on indicators, SMC traders study raw price action: swing highs and lows, where clusters of orders likely sit, and how price reacts around those areas.

The basic purpose of SMC is to build a map of *where* the market is likely to react and *why*, instead of guessing. It does this by combining two core ideas that repeat throughout this course:

- Market structure — the sequence of highs and lows that tells you whether the market is trending up, down, or ranging.
- Liquidity — the pools of resting orders (stop-losses and pending orders) that price is often drawn toward before reversing or continuing.

Structure and liquidity are deeply connected: price often moves toward liquidity, sweeps it, and then reacts — and that reaction is frequently what causes structure to shift. Understanding this relationship is the foundation everything else in this course builds on.

Why do traders study market structure at all? Because it gives context. A breakout means something different in an uptrend than it does in a range. Knowing the structure helps a trader avoid trading against the dominant flow of orders.

A few terms you'll see repeated throughout this course: swing high/low, higher high/higher low, lower high/lower low, liquidity pool, order block, fair value gap (FVG), premium/discount, and displacement. Each gets its own chapter — by the end of this course you'll be able to use all of them together.

This training is educational only. It is part of an authorized security-awareness simulation and does not constitute financial advice.`,
      },
    ],
  },
  {
    title: 'Market Structure',
    description: 'Swing points, and how their sequence defines bullish or bearish structure.',
    order: 2,
    lessons: [
      {
        title: 'What is Market Structure?',
        order: 1,
        content: `Market structure is simply the sequence of price swings — the ups and downs — that make up a chart. Every candlestick chart, no matter the timeframe, is built from alternating moves up and down. Market structure is the practice of labeling those swings so you can describe, objectively, whether the market is trending or ranging.

Reading structure correctly is the single most important skill in SMC. Almost every other concept in this course — liquidity, order blocks, fair value gaps — is defined *relative to* structure. Get structure wrong, and everything built on top of it will be wrong too.`,
      },
      {
        title: 'Swing Highs and Swing Lows',
        order: 2,
        content: `A swing high is a candle (or small cluster of candles) with lower highs on both sides of it — a local peak. A swing low is the opposite: a candle with higher lows on both sides of it — a local trough.

These swing points are the raw building blocks of structure. Once you can reliably spot them, you can start labeling the *relationship* between consecutive swing highs and consecutive swing lows, which is what actually tells you the trend.`,
      },
      {
        title: 'Bullish Structure',
        order: 3,
        content: `Bullish structure is a sequence of higher highs (HH) and higher lows (HL): each new swing high is higher than the last, and each new swing low is also higher than the last.

- Higher High (HH): a swing high that closes above the previous swing high.
- Higher Low (HL): a swing low that closes above the previous swing low.

As long as this pattern continues, the path of least resistance is considered to be up, and traders using SMC will typically look for buying opportunities rather than fighting the trend.`,
      },
      {
        title: 'Bearish Structure',
        order: 4,
        content: `Bearish structure is the mirror image: a sequence of lower highs (LH) and lower lows (LL).

- Lower High (LH): a swing high that closes below the previous swing high.
- Lower Low (LL): a swing low that closes below the previous swing low.

While this pattern holds, the path of least resistance is considered to be down, and traders will typically look for selling opportunities.`,
      },
      {
        title: 'Structure Confirmation',
        order: 5,
        content: `A single higher high or lower low doesn't retroactively change the trend by itself — traders usually want *confirmation* that the new swing point has actually formed and closed before treating it as valid. Reacting to a swing point too early (before the candle closes) is a common beginner mistake, since price can wick beyond a level and reverse before the candle closes.

A simple habit: wait for a candle to close beyond the relevant swing point before labeling a new HH/HL or LH/LL. This small discipline avoids a lot of false reads of structure.`,
      },
    ],
  },
  {
    title: 'Liquidity',
    description: 'Where resting orders cluster, and why price is often drawn toward them.',
    order: 3,
    lessons: [
      {
        title: 'What is Liquidity?',
        order: 1,
        content: `In SMC, "liquidity" refers to areas on the chart where a large number of pending orders are likely resting — mainly stop-loss orders and stop-entry orders. For a large participant to enter or exit a big position without moving the price too much against themselves, they need the opposite side of the market to have enough resting orders to trade into. Price is often drawn toward these pools before making its "real" move.

This is different from the everyday meaning of "liquidity" (how easily an asset can be bought or sold) — in SMC it specifically means *where the orders are sitting on the chart*.`,
      },
      {
        title: 'Buy-Side and Sell-Side Liquidity',
        order: 2,
        content: `- Buy-side liquidity (BSL) sits above swing highs — this is where buy-stop orders (from short sellers protecting themselves, and breakout buyers) tend to cluster.
- Sell-side liquidity (SSL) sits below swing lows — this is where sell-stop orders (from long traders protecting themselves, and breakout sellers) tend to cluster.

A simple way to remember it: liquidity sits just beyond the "obvious" levels that most retail traders place their stops around.`,
      },
      {
        title: 'Equal Highs, Equal Lows, and Liquidity Pools',
        order: 3,
        content: `When price forms two or more swing highs at roughly the same level, it creates "equal highs" — and the same applies to "equal lows." These are considered especially attractive liquidity pools, because many traders place stop-losses or breakout orders right around these obvious, repeated levels, creating a denser cluster of resting orders in one place.

The more times a level is tested without breaking, the more liquidity is thought to build up around it.`,
      },
      {
        title: 'Liquidity Sweeps and Grabs',
        order: 4,
        content: `A liquidity sweep (or "liquidity grab") happens when price pushes briefly beyond a swing high or low — just far enough to trigger the resting orders there — and then reverses direction. To traders using SMC, a sweep followed by a sharp reversal is often read as a sign that the move was about clearing out orders rather than genuinely continuing the trend, and it's frequently used as a clue that a structure shift may be starting.

This is exactly the kind of pattern that real-world manipulative platforms exploit rhetorically — claiming price was "grabbed" to justify why a user's simulated balance changed. In this course, a sweep is a chart-reading concept only, not a mechanism that affects your simulated account.`,
      },
    ],
  },
  {
    title: 'Break of Structure and Change of Character',
    description: 'Distinguishing trend continuation from a potential reversal.',
    order: 4,
    lessons: [
      {
        title: 'Break of Structure (BOS)',
        order: 1,
        content: `A Break of Structure (BOS) occurs when price closes beyond a swing point *in the direction of the current trend* — for example, a new higher high forming during an uptrend, or a new lower low forming during a downtrend. A BOS is generally read as confirmation that the existing trend is continuing.`,
      },
      {
        title: 'Change of Character (CHoCH) and Market Structure Shift (MSS)',
        order: 2,
        content: `A Change of Character (CHoCH) — sometimes called a Market Structure Shift (MSS) — occurs when price breaks structure in the *opposite* direction of the current trend. For example, if the market has been making higher highs and higher lows (bullish), and price then closes below the most recent higher low, that's a CHoCH: the first sign the bullish structure may be ending and a bearish phase could be starting.

CHoCH/MSS is one of the earliest and most-watched signals in SMC, because it's often the first objective evidence that the balance of buying and selling pressure has shifted.`,
      },
      {
        title: 'Continuation vs. Reversal: Confirming the Shift',
        order: 3,
        content: `It's easy to confuse a temporary pullback with a genuine reversal. A few things traders commonly look for to add confidence to a CHoCH read:

- Was the move preceded by a liquidity sweep of the opposing side?
- Was the break accompanied by displacement (a strong, fast move — covered in a later chapter)?
- Did price close convincingly beyond the level, not just wick through it?

None of these guarantee a reversal — SMC is a framework for building probability and context, not a certainty machine.`,
      },
    ],
  },
  {
    title: 'Order Blocks',
    description: 'Identifying the candles that mark where institutional orders may sit.',
    order: 5,
    lessons: [
      {
        title: 'What is an Order Block?',
        order: 1,
        content: `An order block is the last opposing candle before a strong, fast move (displacement) in the other direction. The idea is that this candle marks the area where large participants placed a significant number of orders right before price moved away sharply — and that price may return to that zone later to "rebalance" or fill remaining orders before continuing in the original direction.`,
      },
      {
        title: 'Bullish and Bearish Order Blocks',
        order: 2,
        content: `- A bullish order block is the last down-close candle before a strong move up. Traders watching for continuation may look for price to return to this zone as a potential area of interest for buying.
- A bearish order block is the last up-close candle before a strong move down. Traders may look for price to return to this zone as a potential area of interest for selling.

Order blocks are typically only considered meaningful when they're followed by genuine displacement — a small, unremarkable move afterward doesn't carry the same weight.`,
      },
      {
        title: 'Identifying Zones and Invalidation',
        order: 3,
        content: `To mark an order block, traders typically use the high-to-low range (sometimes just the body) of that last opposing candle. This range becomes the "zone of interest."

An order block is considered invalidated once price closes fully through the zone in the opposite direction of what the block was expected to support — at that point, the idea that large orders remain unfilled there is treated as no longer valid, and traders using SMC would generally stop watching that zone.`,
      },
    ],
  },
  {
    title: 'Fair Value Gaps',
    description: 'Spotting imbalance left behind by fast price moves.',
    order: 6,
    lessons: [
      {
        title: 'What is a Fair Value Gap?',
        order: 1,
        content: `A Fair Value Gap (FVG) is a three-candle pattern that appears when price moves quickly enough in one direction that it leaves a visible gap between the wick of the first candle and the wick of the third candle — the middle candle's range isn't fully "overlapped" by its neighbors. This gap represents an area where trading was one-sided and imbalanced: far more aggressive buying (or selling) than the opposite side.`,
      },
      {
        title: 'Bullish and Bearish FVGs',
        order: 2,
        content: `- A bullish FVG forms during a strong up-move: the low of the third candle sits above the high of the first candle, leaving a gap.
- A bearish FVG forms during a strong down-move: the high of the third candle sits below the low of the first candle, leaving a gap.

Both represent imbalance — a lack of two-sided trading in that price range.`,
      },
      {
        title: 'Imbalance and Areas of Interest',
        order: 3,
        content: `Because an FVG represents a price range that wasn't "fairly" traded on both sides, some traders believe price is likely to return to that zone at some point to rebalance it before continuing in its original direction — similar in spirit to how order blocks are used. FVGs are frequently used alongside order blocks as an additional area of interest, particularly when both concepts point to overlapping zones.

As with everything in this course, this is a framework for building a case, not a guarantee of what price will do next.`,
      },
    ],
  },
  {
    title: 'Premium and Discount',
    description: 'Using a dealing range to judge whether price is expensive or cheap relative to itself.',
    order: 7,
    lessons: [
      {
        title: 'The Dealing Range and Equilibrium',
        order: 1,
        content: `A dealing range is simply a recent swing high and swing low treated as the boundaries of the current price range. The midpoint of that range — exactly 50% between the high and low — is called equilibrium.

Equilibrium is used as a dividing line: everything above it is considered the "premium" half of the range, and everything below it is the "discount" half.`,
      },
      {
        title: 'Premium, Discount, and Directional Bias',
        order: 2,
        content: `- Premium: the upper half of the dealing range, above equilibrium. In an overall bullish context, traders using SMC often treat premium as a less attractive place to initiate new buys (price is "expensive" relative to the range) and a more natural area to look for selling or take profit.
- Discount: the lower half of the dealing range, below equilibrium. In a bullish context, discount is often treated as a more attractive area to look for buying (price is "cheap" relative to the range).

The logic reverses in a bearish context: traders may prefer selling from premium and see discount as a place profit-taking or reversal attempts are more likely. Premium/discount is a relative, range-dependent concept — it's meaningless without first defining the dealing range it's measured against.`,
      },
    ],
  },
  {
    title: 'Displacement',
    description: 'Recognizing strong, fast directional moves and what they signal.',
    order: 8,
    lessons: [
      {
        title: 'What is Displacement?',
        order: 1,
        content: `Displacement refers to a strong, fast, and often large-bodied directional price move — noticeably more aggressive than the price action around it. Displacement candles tend to have small wicks relative to their bodies, showing that one side (buyers or sellers) was clearly in control for that period.

Displacement is frequently what leaves behind the fair value gaps and order blocks discussed in earlier chapters — it's the "cause," and FVGs/order blocks are the "evidence" left behind.`,
      },
      {
        title: 'Displacement and Market Structure',
        order: 2,
        content: `Displacement is often used as a filter for how seriously to treat a break of structure. A CHoCH or BOS that happens on a slow, choppy candle is generally treated with more skepticism than one that happens with clear displacement — because displacement suggests a genuine, forceful shift in buying/selling pressure rather than a random wiggle.

Many SMC entry approaches wait specifically for displacement *after* a liquidity sweep and structure shift before considering a trade — which is exactly the sequence covered in the next chapter.`,
      },
    ],
  },
  {
    title: 'SMC Entry Model',
    description: 'A simple educational model that combines the concepts from this course into one sequence.',
    order: 9,
    lessons: [
      {
        title: 'Building the SMC Entry Model — Bias, Liquidity, and Structure Shift',
        order: 1,
        content: `This lesson combines earlier chapters into a simple, educational sequence some SMC traders use to look for potential setups. It is a teaching model, not a guaranteed method — markets can and do move against any framework.

1. Directional bias — start with a higher-timeframe read of structure (bullish or bearish) and where price sits relative to premium/discount.
2. Liquidity — identify the nearest relevant liquidity (equal highs/lows, obvious swing points) that price may be drawn toward first.
3. Structure shift — wait for a liquidity sweep followed by a CHoCH/MSS in the direction of the higher-timeframe bias.
4. Displacement — look for a strong, fast move confirming the shift, which typically leaves behind an order block and/or FVG.`,
      },
      {
        title: 'Entry, Stop-Loss, and Target Concepts',
        order: 2,
        content: `Continuing the sequence from the previous lesson:

5. Order block / FVG — mark the zone left behind by the displacement move as the area of interest.
6. Entry — some traders look for price to return to that zone before considering an entry in the direction of the new structure.
7. Stop-loss concept — a stop is typically placed beyond the zone or the recent swing point that would invalidate the idea if reached.
8. Target concept — a target is typically set at the next relevant liquidity pool or structural level in the direction of the trade.

**This model is presented strictly for educational purposes as part of an authorized security-awareness training simulation.** It is not a guarantee of profitable trading, not financial advice, and real trading carries real financial risk. No framework — SMC or otherwise — eliminates the need for sound risk management, covered next.`,
      },
    ],
  },
  {
    title: 'Risk Management',
    description: 'Protecting capital regardless of how good any single strategy looks.',
    order: 10,
    lessons: [
      {
        title: 'Position Sizing and Risk Per Trade',
        order: 1,
        content: `Position sizing is deciding how much of an account to risk on a single trade. A common guideline discussed in trading education is risking a small, fixed percentage of account capital per trade (often cited examples fall in the 0.5%–2% range) so that a string of losses doesn't seriously damage the account. Position size should be calculated from the stop-loss distance, not guessed — the wider the stop, the smaller the position needs to be to keep the same dollar risk.`,
      },
      {
        title: 'Stop Loss and Risk-to-Reward',
        order: 2,
        content: `A stop-loss is a predefined price at which a trade idea is considered invalidated and the position is closed to limit further loss. Risk-to-reward (R:R) compares the distance to the stop-loss against the distance to the target — for example, a 1:2 R:R means the potential reward is twice the amount risked.

Favorable R:R doesn't guarantee profitability by itself (win rate matters too), but consistently poor R:R makes it mathematically difficult to be profitable even with a good win rate.`,
      },
      {
        title: 'Drawdown, Overtrading, and Trading Psychology',
        order: 3,
        content: `Drawdown is the decline in account value from a previous peak. Large drawdowns are hard to recover from mathematically — a 50% loss requires a 100% gain just to break even — which is exactly why position sizing and stop-losses matter so much.

Overtrading — taking low-quality or excessive trades, often driven by boredom or a desire to "win back" losses — is one of the most common ways traders erode an account outside of any specific strategy failing. Trading psychology (patience, discipline, accepting losses as a normal part of any strategy) is frequently cited as at least as important as chart-reading skill.

This entire course, including this chapter, is delivered as part of a security-awareness training simulation. Real trading and real deposits carry real financial risk, and no course can eliminate that risk.`,
      },
    ],
  },
];

export const SMC_QUESTIONS: SeedQuestion[] = [
  {
    question: 'What is a higher high?',
    points: 1,
    order: 1,
    answers: [
      { answer: 'A swing high that forms above the previous swing high, indicating bullish structure', isCorrect: true, order: 1 },
      { answer: 'A swing low that forms below the previous swing low', isCorrect: false, order: 2 },
      { answer: 'Any candle with a long upper wick', isCorrect: false, order: 3 },
      { answer: 'The highest price ever reached by an asset', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is buy-side liquidity?',
    points: 1,
    order: 2,
    answers: [
      { answer: 'A pool of resting buy-stop orders typically found above swing highs or equal highs', isCorrect: true, order: 1 },
      { answer: 'Liquidity available to buy an asset at the lowest possible price', isCorrect: false, order: 2 },
      { answer: 'The amount of cash a trader personally has available to buy', isCorrect: false, order: 3 },
      { answer: 'Sell orders resting below swing lows', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What does BOS mean?',
    points: 1,
    order: 3,
    answers: [
      { answer: 'Break of Structure — price breaking beyond a prior swing point in the direction of the existing trend', isCorrect: true, order: 1 },
      { answer: 'Bottom of Session', isCorrect: false, order: 2 },
      { answer: 'Buy Order Signal', isCorrect: false, order: 3 },
      { answer: 'Best Open Strategy', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is a Fair Value Gap (FVG)?',
    points: 1,
    order: 4,
    answers: [
      { answer: "A three-candle imbalance where price moves quickly, leaving an unfilled gap between the first and third candle's wicks", isCorrect: true, order: 1 },
      { answer: 'The difference between the bid and ask price', isCorrect: false, order: 2 },
      { answer: 'A gap that only appears over a weekend', isCorrect: false, order: 3 },
      { answer: 'The average price of an asset over a fixed period', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is an order block?',
    points: 1,
    order: 5,
    answers: [
      { answer: 'The last opposing candle before a strong displacement move, marking a zone of interest', isCorrect: true, order: 1 },
      { answer: 'Any candle with unusually high volume', isCorrect: false, order: 2 },
      { answer: 'A block of several consecutive red candles', isCorrect: false, order: 3 },
      { answer: 'The final candle that closes a trading session', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is premium (in the premium/discount concept)?',
    points: 1,
    order: 6,
    answers: [
      { answer: 'The upper half of a defined dealing range, above equilibrium', isCorrect: true, order: 1 },
      { answer: 'A fee a broker charges per trade', isCorrect: false, order: 2 },
      { answer: 'The lower half of a dealing range', isCorrect: false, order: 3 },
      { answer: 'The highest price ever recorded for an asset', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is discount (in the premium/discount concept)?',
    points: 1,
    order: 7,
    answers: [
      { answer: 'The lower half of a defined dealing range, below equilibrium', isCorrect: true, order: 1 },
      { answer: 'A reduced trading commission', isCorrect: false, order: 2 },
      { answer: 'The upper half of a dealing range', isCorrect: false, order: 3 },
      { answer: 'A temporary halt in trading', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'What is displacement?',
    points: 1,
    order: 8,
    answers: [
      { answer: 'A strong, fast directional price move made of large-bodied candles, often creating imbalance', isCorrect: true, order: 1 },
      { answer: 'A slow, sideways price movement', isCorrect: false, order: 2 },
      { answer: "The gap between a stock's open and the previous day's close", isCorrect: false, order: 3 },
      { answer: 'A broker relocating a trading account to a new server', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'Which sequence best describes the educational SMC entry model from this course?',
    points: 1,
    order: 9,
    answers: [
      { answer: 'Establish bias, identify liquidity, confirm a structure shift, look for displacement, mark an order block/FVG, then plan entry, stop-loss, and target', isCorrect: true, order: 1 },
      { answer: 'Buy first, analyze the chart afterward', isCorrect: false, order: 2 },
      { answer: 'Enter randomly, then set a stop-loss only after the trade moves against you', isCorrect: false, order: 3 },
      { answer: 'Always trade every fair value gap regardless of context', isCorrect: false, order: 4 },
    ],
  },
  {
    question: 'Why is risk management important?',
    points: 1,
    order: 10,
    answers: [
      { answer: 'It controls potential losses per trade and protects capital, helping a trader survive losing streaks', isCorrect: true, order: 1 },
      { answer: 'It guarantees that every trade will be profitable', isCorrect: false, order: 2 },
      { answer: 'It is only relevant for very large trading accounts', isCorrect: false, order: 3 },
      { answer: 'It replaces the need for any trading strategy', isCorrect: false, order: 4 },
    ],
  },
];
