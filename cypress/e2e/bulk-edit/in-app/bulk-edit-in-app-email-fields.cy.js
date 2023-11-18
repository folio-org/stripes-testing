import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C360537 Verify that the "Confirm changes" button is disabled until all fields are filled in Email update (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
