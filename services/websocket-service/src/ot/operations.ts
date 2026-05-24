/**
 * Simple Operational Transformation for plain text.
 * Operations are arrays of: number (retain), string (insert), negative number (delete).
 */

export type OTOp = number | string; // positive=retain, string=insert, negative=delete

export interface Operation {
  ops: OTOp[];
  baseLength: number;
  targetLength: number;
}

export function apply(doc: string, operation: Operation): string {
  let result = '';
  let idx = 0;
  for (const op of operation.ops) {
    if (typeof op === 'string') {
      result += op;
    } else if (op > 0) {
      result += doc.slice(idx, idx + op);
      idx += op;
    } else if (op < 0) {
      idx += Math.abs(op);
    }
  }
  return result;
}

export function transform(op1: Operation, op2: Operation): [Operation, Operation] {
  // Returns [op1', op2'] such that apply(apply(doc, op1), op2') = apply(apply(doc, op2), op1')
  const ops1: OTOp[] = [];
  const ops2: OTOp[] = [];

  let i1 = 0, i2 = 0;
  let a = [...op1.ops];
  let b = [...op2.ops];

  const take = (arr: OTOp[], idx: number): [OTOp, OTOp[]] => {
    const rest = arr.slice(idx);
    return [rest[0], rest.slice(1)];
  };

  let queue1 = [...op1.ops];
  let queue2 = [...op2.ops];

  while (queue1.length > 0 || queue2.length > 0) {
    const op_a = queue1[0];
    const op_b = queue2[0];

    if (op_a === undefined) {
      ops1.push(op_b as OTOp);
      ops2.push(op_b as OTOp);
      queue2.shift();
      continue;
    }
    if (op_b === undefined) {
      ops1.push(op_a as OTOp);
      ops2.push(op_a as OTOp);
      queue1.shift();
      continue;
    }

    // Both are inserts
    if (typeof op_a === 'string') {
      ops1.push(op_a);
      ops2.push(op_a.length);
      queue1.shift();
      continue;
    }
    if (typeof op_b === 'string') {
      ops1.push(op_b.length);
      ops2.push(op_b);
      queue2.shift();
      continue;
    }

    const min_len = Math.min(Math.abs(op_a as number), Math.abs(op_b as number));

    if ((op_a as number) > 0 && (op_b as number) > 0) {
      ops1.push(min_len);
      ops2.push(min_len);
    } else if ((op_a as number) < 0 && (op_b as number) < 0) {
      // both delete same range
    } else if ((op_a as number) > 0 && (op_b as number) < 0) {
      ops2.push(-min_len);
    } else if ((op_a as number) < 0 && (op_b as number) > 0) {
      ops1.push(-min_len);
    }

    const rem_a = (op_a as number) > 0 ? (op_a as number) - min_len : (op_a as number) + min_len;
    const rem_b = (op_b as number) > 0 ? (op_b as number) - min_len : (op_b as number) + min_len;

    if (rem_a === 0) queue1.shift(); else queue1[0] = rem_a;
    if (rem_b === 0) queue2.shift(); else queue2[0] = rem_b;
  }

  return [
    { ops: ops1, baseLength: op2.targetLength, targetLength: op1.targetLength },
    { ops: ops2, baseLength: op1.targetLength, targetLength: op2.targetLength },
  ];
}
