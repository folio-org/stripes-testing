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
    tag149: '149',
    tag150: '150',
    tag151: '151',
    tag155: '155',
    tag650: '650',
    tag150RpwIndex: 9,
    authority150FieldValue: '$a C374144 Oratory',
    newAuthority150FieldValue: '$a Oratory $t test',
    searchOption: 'Keyword',
    authorized: 'Authorized',
    reference: 'Reference',
    cannotChangeCalloutMessage:
      'Cannot change the saved MARC authority field 150 because it controls a bibliographic field(s). To change this 1XX, you must unlink all controlled bibliographic fields.',
    cannotSaveCalloutMessage: 'Record cannot be saved without 1XX field.',
    cannotAddCalloutMessage:
      'Cannot add a $t to the $150 field because it controls a bibliographic field(s) that cannot control this subfield. To change this 1XX value, you must unlink all controlled bibliographic fields that cannot control $t.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374144.mrc',
      fileName: `testMarcFileC374144.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'Oratory, Primitive',
    },
    {
      marc: 'marcAuthFileForC374144.mrc',
      fileName: `testMarcFileC374144.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'Oratory',
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
      InventoryInstance.verifyAndClickLinkIcon(testData.tag650);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcFiles[0].instanceTitle);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag150,
        testData.authority150FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
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
    Users.deleteViaApi(testData.userProperties.userId);
    InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
    MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
  });

  it(
    'C374144 Edit tag value ("150") in the "MARC Authority" record which controls "MARC Bib(s)" (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchBy(testData.searchOption, marcFiles[1].authorityHeading);

      MarcAuthorities.checkAuthorizedReferenceColumn(testData.authorized, testData.reference);
      MarcAuthorities.selectItem(marcFiles[0].instanceTitle, false);

      MarcAuthority.edit();
      QuickMarcEditor.checkContent(testData.authority150FieldValue, testData.tag150RpwIndex);

      QuickMarcEditor.updateExistingTagName(testData.tag150, testData.tag100);
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

      QuickMarcEditor.updateExistingTagName(testData.tag130, testData.tag151);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag151, testData.tag155);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout(testData.cannotChangeCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag155, testData.tag149);
      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotSaveCalloutMessage);
      QuickMarcEditor.closeCallout();

      QuickMarcEditor.updateExistingTagName(testData.tag149, testData.tag150);
      QuickMarcEditor.checkButtonsDisabled();

      QuickMarcEditor.updateExistingFieldContent(
        testData.tag150RpwIndex,
        testData.newAuthority150FieldValue,
      );
      QuickMarcEditor.checkButtonsEnabled();

      QuickMarcEditor.pressSaveAndKeepEditing(testData.cannotAddCalloutMessage);
      QuickMarcEditor.closeCallout();
    },
  );
});
