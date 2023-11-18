import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C388493 Verify that User with "Bulk Edit: Local Edit" and "Bulk Edit: In app - View inventory" permissions can edit user records | Local (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
