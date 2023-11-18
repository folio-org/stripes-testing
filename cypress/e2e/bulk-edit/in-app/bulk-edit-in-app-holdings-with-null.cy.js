import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C380588 Verify bulk edit of Holdings record that contains NULL values in reference data (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
