import TopMenu from '../../support/fragments/topMenu';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataExportPath, waiter: ExportFileHelper.waitLoading });
  });

  it(
    'C9292 Negative test - invalid file extension (firebird)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      ExportFileHelper.uploadFile('example.json');
      ExportFileHelper.verifyWarningWithInvalidFileExtension();
      ExportFileHelper.clickCancelButton();
    },
  );
});
