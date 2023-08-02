import exportJobs from '../../support/fragments/ideyalabs/exportJobs';
import testTypes from '../../support/dictionary/testTypes';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsPackagesSearch from '../../support/fragments/eholdings/eHoldingsPackagesSearch';
import eHoldingsSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import invoices from '../../support/fragments/invoices/invoices';
import loansPage from '../../support/fragments/loans/loansPage';
import topMenu from '../../support/fragments/topMenu';
import fileManager from '../../support/utils/fileManager';

const testData = {
  batchGroup: 'FOLIO',
  packageOptions: 'Holdings status',
  selectionStatus: 'Selected',
  searchOption: 'BRITISH MEDICAL JOURNAL',
  fileNameMask: '*package*',
  data: {
    packageName: 'VLeBooks',
    title: 'ebook',
  },
  packageFields: {
    packageOne: 'Holdings status',
    packageTwo: 'Agreements',
  },
  titleFields: {
    titleOne: 'Agreements',
    titleTwo: 'Access status type',
  },
};

describe('Eholdings - exports', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C356417 Export of selected ""Package"" without titles. User chooses ""Package"" fields to export. (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
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
    }
  );

  it(
    'C367972 Export button must be disabled when user tries to export Package record with more than 10k of Title records (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.eholdingsPath);
      eHoldingsSearch.switchToPackages();
      eHoldingsPackagesSearch.byName(testData.data.packageName);
      eHoldingsPackages.openPackage();
      exportJobs.exportsPackageCSVClick();
      exportJobs.packageFieldsSelectFromExportDropdown(
        testData.packageFields.packageOne
      );
      exportJobs.packageFieldsSelectFromExportDropdown(
        testData.packageFields.packageTwo
      );
      exportJobs.allPackageFieldsToExportRadioButton();
      exportJobs.titleFieldsToExportDropDown(testData.titleFields.titleOne);
      exportJobs.titleFieldsToExportDropDown(testData.titleFields.titleTwo);
      exportJobs.allTitleFieldsToExportRadioButton();
      exportJobs.clickCancelButton();
      exportJobs.filterTitles(testData.data.title);
      exportJobs.exportsPackageCSVClick();
      exportJobs.packageFieldsSelectFromExportDropdown(
        testData.packageFields.packageOne
      );
      exportJobs.packageFieldsSelectFromExportDropdown(
        testData.packageFields.packageTwo
      );
      exportJobs.allPackageFieldsToExportRadioButton();
      exportJobs.titleFieldsToExportDropDown(testData.titleFields.titleOne);
      exportJobs.titleFieldsToExportDropDown(testData.titleFields.titleTwo);
      exportJobs.allTitleFieldsToExportRadioButton();
      exportJobs.clickExportButton();
      exportJobs.verifyJobIDRecord();
      fileManager.verifyFile(
        loansPage.verifyFileName,
        testData.fileNameMask,
        loansPage.verifyContentOfExportFileName,
        ['Package Holdings Status', 'Selected']
      );
    }
  );

  it(
    'C353217 Download batch export files from full screen view with Voucher export permission (FTP/JSON) - upload to server (thunderjet)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.invoicesPath);
      invoices.selectFolio();
      invoices.voucherExportManualExport(testData.batchGroup);
      invoices.verifyDownloadButtonAndClick();
      // In Voucher Export screen, when performing Run Manual Export Voucher, Export record status = 'Error' due to that download button is not visible.
    }
  );
});
