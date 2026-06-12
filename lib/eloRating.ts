export function expectedResult(eloA: number, eloB: number) {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

export function updateElo(eloA: number, eloB: number, actualA: number, k = 28) {
  const expectedA = expectedResult(eloA, eloB);
  const expectedB = 1 - expectedA;
  return {
    a: Math.round(eloA + k * (actualA - expectedA)),
    b: Math.round(eloB + k * ((1 - actualA) - expectedB))
  };
}
