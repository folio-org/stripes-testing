import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C409428 Verify Bulk Edit for Item without populated "URI" in electronic access (firebird) (TaaS)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
