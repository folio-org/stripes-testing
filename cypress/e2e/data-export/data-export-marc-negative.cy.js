import TopMenu from '../../support/fragments/topMenu';
import TestTypes from '../../support/dictionary/testTypes';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import devTeams from '../../support/dictionary/devTeams';

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataExportPath, waiter: ExportFileHelper.waitLoading });
  });

  it(
    'C9292 Negative test - invalid file extension (firebird)',
    { tags: [TestTypes.extendedPath, devTeams.firebird] },
    () => {
      ExportFileHelper.uploadFile('example.json');
      ExportFileHelper.verifyWarningWithInvalidFileExtension();
      ExportFileHelper.clickCancelButton();
    },
  );
});
