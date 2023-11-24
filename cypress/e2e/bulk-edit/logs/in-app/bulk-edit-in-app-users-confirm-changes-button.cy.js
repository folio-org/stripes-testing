import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {

    });

    it(
      'C360536 Verify that the "Confirm changes" button is disabled until at least one update action is selected (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
      }
    );
  });
});
