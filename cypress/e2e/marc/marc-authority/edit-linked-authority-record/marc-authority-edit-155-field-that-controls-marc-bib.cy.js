import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { JOB_STATUS_NAMES } from '../../../../support/constants';

describe('MARC -> MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag100: '100',
    tag110: '110',
    tag111: '111',
    tag130: '130',
    tag150: '150',
    tag151: '151',
    tag154: '154',
    tag155: '155',
    tag655: '655',
    tag155RowIndex: 7,
    tag655RowIndex: 52,
    authority155FieldValue: '$a C374146 Drama',
    newAuthority155FieldValue: '$a C374146 Drama $t test',
    searchOption: 'Keyword',
    authorized: 'Authorized',
    reference: 'Reference',
    cannotChangeCalloutMessage:
      'Cannot change the saved MARC authority field 155 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
    cannotAddCalloutMessage:
      'Cannot add a $t to the $155 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374146.mrc',
      fileName: `testMarcFileC374146.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'C374146 Drama',
    },
    {
      marc: 'marcAuthFileForC374146.mrc',
      fileName: `testMarcFileC374146.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Drama',
    },
  ];

  const createdRecordIDs = [];

  before('Create test data', () => {
    cy.loginAsAdmin({
      path: TopMenu.dataImportPath,
      waiter: DataImport.waitLoading,
    }).then(() => {
      marcFiles.forEach((marcFile) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdRecordIDs.push(link.split('/')[5]);
        });
      });
    });

    cy.visit(TopMenu.inventoryPath).then(() => {
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();
      InventoryInstance.editMarcBibliographicRecord();
      InventoryInstance.verifyAndClickLinkIconByIndex(testData.tag655RowIndex);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcFiles[0].instanceTitle);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag155,
        testData.authority155FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(testData.tag655RowIndex, testData.tag655);
      QuickMarcEditor.pressSaveAndClose();

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
    Users.deleteViaApi(testData.userProperties.userId);
  });

  it(
    'C374146 Edit tag value ("155") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

      MarcAuthorities.checkAuthorizedColumn(testData.authorized);
      MarcAuthorities.selectItem(marcFiles[0].instanceTitle, false);

      MarcAuthority.edit();
      QuickMarcEditor.checkContent(testData.authority155FieldValue, testData.tag155RowIndex);

      QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag100);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag100, testData.tag110);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag110, testData.tag111);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag111, testData.tag130);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag150);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag151);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag154);
      // Todo: the below two lines should be uncommented once https://issues.folio.org/browse/UIQM-526 is resolved.
      // QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotSaveCalloutMessage);
      // QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag154, testData.tag155);
      QuickMarcEditor.checkButtonsDisabled();

      QuickMarcEditor.updateExistingFieldContent(
        testData.tag155RowIndex,
        testData.newAuthority155FieldValue,
      );
      QuickMarcEditor.checkButtonsEnabled();

      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotAddCalloutMessage);
      QuickMarcEditor.closeCallout();
    },
  );
});
