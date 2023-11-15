import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {

    });

    it(
      'C380592 Verify that Holdings without "Source" populated can be updated(firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {

      },
    );
  });
});
