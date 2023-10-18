export function $map(arrays, op) {
  const mapLength = arrays[0].length;
  if (!arrays.every((a) => a.length === mapLength)) {
    throw new Error("cannot $map over arrays of different lengths");
  }

  const result = [];
  for (let i = 0; i < mapLength; i++) {
    const items = arrays.map((a) => a[i]);
    result.push(op(items, i));
  }

  return result;
}

export function $array(length, value) {
  return Array(length).fill(value);
}

export function $reduce(arrays, op, initial) {
  const reduceLength = arrays[0].length;
  if (!arrays.every((a) => a.length === reduceLength)) {
    throw new Error("cannot $reduce over arrays of different lengths");
  }

  let reduced = initial;
  for (let i = 0; i < reduceLength; i++) {
    const items = arrays.map((a) => a[i]);
    reduced = op(reduced, items);
  }

  return reduced;
}

export function $average(array, weights) {
  let weightSum = weights.reduce((t, c) => t + c, 0);
  return (
    $reduce(
      [array, weights],
      (reduced, [array, weights]) => reduced + array * weights,
      0,
    ) / weightSum
  );
}

export function $lerp(length, min, max) {
  return Array(length)
    .fill(min)
    .map((x, i) => x + i * ((max - min) / length));
}

export function $sum(array) {
  return array.reduce((t, c) => t + c, 0);
}

export function $max(array, sentinel) {
  return array.map((array) => (array < sentinel ? sentinel : array));
}

export function $min(array, sentinel) {
  return array.map((array) => (array > sentinel ? sentinel : array));
}
