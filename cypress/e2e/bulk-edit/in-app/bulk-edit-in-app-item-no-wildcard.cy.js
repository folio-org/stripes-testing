import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {

    });

    it(
      'C399065 Verify that special characters in Item Barcode are NOT treated as wildcards for Bulk Edit (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
      }
    );
  });
});
