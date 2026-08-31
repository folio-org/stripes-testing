import { BATCH_REQUEST_SIZE } from '../constants';
import { acquisitionUnits, fiscalYears, funds, fundTypes, groups, ledgers } from '../routes';
import { batchCount } from '../utils/batching';
import { responseRecords } from '../utils/responses';

const fundLedgerIds = (responses) => {
  return responseRecords(responses, funds.id, 'funds').map(({ ledgerId }) => ledgerId);
};

const uncachedFundLedgerIds = (responses, state) => {
  return fundLedgerIds(responses).filter((ledgerId) => ledgerId && !state.ledgerIds?.has(ledgerId));
};

// These list panes have no response-derived references; their only render-time
// filter resource is the acquisition-unit list.
export const fiscalYearsProfile = {
  filters: [acquisitionUnits],
  results: [fiscalYears],
};

export const ledgersProfile = {
  filters: [acquisitionUnits],
  results: [ledgers],
};

export const groupsProfile = {
  filters: [acquisitionUnits],
  results: [groups],
};

export const fundsProfile = {
  filters: [acquisitionUnits, fundTypes, groups, ledgers],
  results: [funds],
  responseDependencies: [
    {
      route: ledgers,
      dependsOn: [funds.id],
      when: ({ responses }) => fundLedgerIds(responses).some(Boolean),
      requestCount: batchCount(fundLedgerIds),
    },
  ],
};

/**
 * Find Fund keeps ledger records in the mounted plugin's client cache. Runtime
 * state mirrors that behavior so a second result action does not wait for a
 * ledger request the UI correctly omits. Opening the filter pane resets it.
 */
export const findFundLedgerDependency = {
  route: ledgers,
  dependsOn: [funds.id],
  when: ({ responses, state }) => uncachedFundLedgerIds(responses, state).length > 0,
  requestCount: ({ responses, state }) => {
    return Math.ceil(uncachedFundLedgerIds(responses, state).length / BATCH_REQUEST_SIZE);
  },
  remember: ({ responses, state }) => {
    state.ledgerIds = state.ledgerIds || new Set();
    uncachedFundLedgerIds(responses, state).forEach((ledgerId) => state.ledgerIds.add(ledgerId));
  },
};
