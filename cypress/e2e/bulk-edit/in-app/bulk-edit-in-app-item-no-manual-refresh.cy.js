import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {

    });

    it(
      'C367983 Verify that confirmation screen DOES NOT require manual refresh (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
      }
    );
  });
});
