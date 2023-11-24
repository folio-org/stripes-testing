import testTypes from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';

describe('bulk-edit', () => {
  describe('csv approach', () => {
    before('create test data', () => {

    });

    after('delete test data', () => {
      
    });

    it(
      'C359010 Verify the successful notification and absence of empty "File with updated records" after uploading unmodified file for bulk edit Users (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
      }
    );
  });
});
