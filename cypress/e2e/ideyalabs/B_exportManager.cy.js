// import Exports from "../../support/a_ideyalabs/export";
import exportJobs from '../../support/a_ideyalabs/exportJobs';
import exportManagerSearchPane from '../../support/fragments/exportManager/exportManagerSearchPane';
import topMenu from '../../support/fragments/topMenu';

describe('Exports', () => {
  const testData = {
    integrationMethod: 'Integration name',
    status: 'Successful',
    exportMethod: 'Integration name',
    fileName: 'AAA_Integration name_2023-06-20_14_36_04.edi'
  };

  before('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C358971 Already exported order is not included repeatedly in next exports(Thunderjet)', () => {
    cy.visit(topMenu.exportManagerOrganizationsPath);
    exportManagerSearchPane.selectExportMethod(testData.integrationMethod);
    exportManagerSearchPane.verifyResult(testData.status);
    exportManagerSearchPane.verifyResultAndClick(testData.status);
    cy.exec('java -jar sikuli_ide.jar -r ftp.sikuli');
    // Open FTP client (f.e. FileZilla) and search for exported File name from Step 2 in FTP order directory from Preconditions #2.4
    // Open exported .edi file with ""Notepad"" or similar tool
    exportManagerSearchPane.rerunJob();
    cy.reload();
  });

  it('C365123 Downloading the exact .edi file that was exported for a given export job with Successful status', () => {
    cy.visit(topMenu.exportManagerOrganizationsPath);
    exportManagerSearchPane.selectExportMethod(testData.exportMethod);
    exportManagerSearchPane.selectSearchResultItem();
    exportJobs.verifyFileName();
    exportManagerSearchPane.verifyResultAndClick(testData.status);
    exportManagerSearchPane.downloadJob();
    cy.verifyDownload(testData.fileName);
    cy.exec('java -jar sikuli_ide.jar -r ss.sikuli');
  });
});
