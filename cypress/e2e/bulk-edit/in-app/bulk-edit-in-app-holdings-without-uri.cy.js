import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C409429 Verify Bulk Edit for Holdings without populated "URI" in electronic access (firebird) (TaaS)',
      { tags: [testTypes.criticalPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
