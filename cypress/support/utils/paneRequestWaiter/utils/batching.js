import { BATCH_REQUEST_SIZE } from '../constants';

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

/** Calculates request batches after the application de-duplicates IDs. */
export const batchCount = (getValues) => {
  return ({ responses }) => {
    return Math.ceil(uniqueValues(getValues(responses)).length / BATCH_REQUEST_SIZE);
  };
};

/** Calculates request batches when the application preserves duplicate IDs. */
export const rawBatchCount = (getValues) => {
  return ({ responses }) => {
    return Math.ceil(getValues(responses).filter(Boolean).length / BATCH_REQUEST_SIZE);
  };
};
