import exportJobs from '../../../../../support/ideyalabs/exportJobs';
import testTypes from '../../../../../support/dictionary/testTypes';
import exportManagerSearchPane from '../../../../../support/fragments/exportManager/exportManagerSearchPane';
import topMenu from '../../../../../support/fragments/topMenu';

const testData = {
  integrationMethod: 'Integration name',
  sucessStatus: 'Successful',
  failedStatus: 'Failed',
  exportMethod: 'Integration name',
  fileName: 'AAA_Integration name_2023-06-20_14_36_04.edi',
  jobFileName: 'AAA_Integration name_2023-06-20_14:36:04.edi',
};

describe('Export Manager', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C358971 Already exported order is not included repeatedly in next exports(thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.exportManagerOrganizationsPath);
      exportManagerSearchPane.selectExportMethod(testData.integrationMethod);
      exportManagerSearchPane.searchBySuccessful();
      exportManagerSearchPane.verifyResult(testData.sucessStatus);
      exportManagerSearchPane.verifyResultAndClick(testData.sucessStatus);
      cy.exec('java -jar sikuli_ide.jar -r ftp.sikuli');
      // Used sikuli to open the exported .edi file with ""Notepad""
      // Based on the Testcase we need to change the PNG in the sikuli folder as it changes from the system to system
      exportManagerSearchPane.rerunJob();
      cy.reload();
      exportManagerSearchPane.verifyResult(testData.failedStatus);
    }
  );

  it(
    'C365123 Downloading the exact .edi file that was exported for a given export job with Successful status(thunderjet)',
    { tags: [testTypes.extendedPath] },
    () => {
      cy.visit(topMenu.exportManagerOrganizationsPath);
      exportManagerSearchPane.selectExportMethod(testData.exportMethod);
      exportManagerSearchPane.searchBySuccessful();
      exportManagerSearchPane.selectSearchResultItem();
      exportJobs.verifyFileName(testData.jobFileName);
      exportManagerSearchPane.verifyResultAndClick(testData.sucessStatus);
      exportManagerSearchPane.downloadJob();
      cy.verifyDownload(testData.fileName);
      cy.exec('java -jar sikuli_ide.jar -r ss.sikuli');
      // Used sikuli to Navigate to local directory for downloaded files and open downloaded file with ""Notepad""
      // Based on the Testcase we need to change the PNG in the sikuli folder as it changes from the system to system
    }
  );
});
