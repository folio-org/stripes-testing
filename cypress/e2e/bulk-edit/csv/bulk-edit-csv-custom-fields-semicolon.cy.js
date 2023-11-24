import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {
      
    });

    it(
      'C389567 Local | Verify bulk edit Users records with Custom fields with semicolon (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
      }
    );
  });
});
