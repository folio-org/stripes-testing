import devTeams from '../../../support/dictionary/devTeams';
import testTypes from '../../../support/dictionary/testTypes';

describe('bulk-edit', () => {
  describe('permissions', () => {
    before('create test data', () => {
    });

    after('delete test data', () => {
    });

    it(
      'C388492 Verify that User with "Bulk Edit: Local View" and "Bulk edit: In app - Edit user records" permissions can edit user records (in app) (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {

      }
    );
  });
});
