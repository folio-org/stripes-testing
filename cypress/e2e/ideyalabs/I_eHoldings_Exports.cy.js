import exportJobs from '../../support/a_ideyalabs/exportJobs';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import loansPage from '../../support/fragments/loans/loansPage';
import topMenu from '../../support/fragments/topMenu';
import fileManager from '../../support/utils/fileManager';
import invoices from '../../support/fragments/invoices/invoices';

describe('Exports', () => {
  const testData = {
    packageOptions: 'Holdings status',
    selectionStatus: 'Selected',
    searchOption: 'BRITISH MEDICAL JOURNAL',
    fileNameMask: '*package*',
    data: {
      packageName: 'VLeBooks',
      title: 'ebook',
    },
    packageFields: {
      package1: 'Holdings status',
      package2: 'Agreements',
    },
    titleFields: {
      title1: 'Agreements',
      title2: 'Access status type',
    },
  };
  const batchGroup = 'FOLIO';

  before('login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it('C356417 Export of selected “Package” without titles. User chooses ""Package"" fields to export.', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsPackagesSearch.byName(testData.searchOption);
    eHoldingsPackagesSearch.bySelectionStatus(testData.selectionStatus);
    eHoldingsPackages.openPackage();
    exportJobs.exportsPackageCSVClick();
    exportJobs.packageFieldsToExportRadio();
    exportJobs.packageFieldsToExportDropdown(testData.packageOptions);
    exportJobs.titleFieldsToExportRadio();
    exportJobs.clickExportButton();
    exportJobs.verifyJobIDRecord();
    fileManager.verifyFile(
      loansPage.verifyFileName,
      testData.fileNameMask,
      loansPage.verifyContentOfExportFileName,
      ['Package Holdings Status', 'Selected']
    );
  });

  it('C367972 Export button must be disabled when user tries to export Package record with more than 10k of Title records', () => {
    cy.visit(topMenu.eholdingsPath);
    eHoldingsSearch.switchToPackages();
    eHoldingsPackagesSearch.byName(testData.data.packageName);
    eHoldingsPackages.openPackage();
    exportJobs.exportsPackageCSVClick();
    exportJobs.packageFieldsSelectFromExportDropdown(
      testData.packageFields.package1
    );
    exportJobs.packageFieldsSelectFromExportDropdown(
      testData.packageFields.package2
    );
    exportJobs.allPackageFieldsToExportRadioButton();
    exportJobs.titleFieldsToExportDropDown(testData.titleFields.title1);
    exportJobs.titleFieldsToExportDropDown(testData.titleFields.title2);
    exportJobs.allTitleFieldsToExportRadioButton();
    exportJobs.clickCancelButton();
    exportJobs.filterTitles(testData.data.title);
    exportJobs.exportsPackageCSVClick();
    exportJobs.packageFieldsSelectFromExportDropdown(
      testData.packageFields.package1
    );
    exportJobs.packageFieldsSelectFromExportDropdown(
      testData.packageFields.package2
    );
    exportJobs.allPackageFieldsToExportRadioButton();
    exportJobs.titleFieldsToExportDropDown(testData.titleFields.title1);
    exportJobs.titleFieldsToExportDropDown(testData.titleFields.title2);
    exportJobs.allTitleFieldsToExportRadioButton();
    exportJobs.clickExportButton();
    exportJobs.verifyJobIDRecord();
    fileManager.verifyFile(
      loansPage.verifyFileName,
      testData.fileNameMask,
      loansPage.verifyContentOfExportFileName,
      ['Package Holdings Status', 'Selected']
    );
  });
  it('C353217-Download batch export files from full screen view with Voucher export permission (FTP/JSON) - upload to server', () => {
    cy.visit(topMenu.inventoryPath);
    invoices.searchfolio();
    invoices.voucherExport(batchGroup);
  });
});
