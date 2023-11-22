import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryKeyboardShortcuts from '../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../../support/fragments/inventory/inventoryHotkeys';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC -> MARC Bibliographic -> Derive MARC bib -> Manual linking', () => {
  const hotKeys = InventoryHotkeys.hotKeys;
  const testData = {
    tag700: '700',
    tag100: '100',
    tag100content: 'Sprouse, Chris',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC365603.mrc',
      fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC365603_1.mrc',
      fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
    {
      marc: 'marcAuthFileC365603_2.mrc',
      fileName: `testMarcFileC365603${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      numOfRecords: 1,
    },
  ];

  const linkingTagAndValues = [
    {
      rowIndex: 33,
      value: 'Sprouse, Chris',
      tag: 100,
    },
    {
      rowIndex: 75,
      value: 'Sprouse, Chris',
      tag: 700,
    },
    {
      rowIndex: 78,
      value: 'Martin, Laura',
      tag: 700,
    },
  ];
  const bib700AfterLinkingToAuth100 = [
    75,
    testData.tag700,
    '1',
    '\\',
    '$a Sprouse, Chris',
    '$e artist.',
    '$0 1357871',
    '',
  ];
  const createdRecordsIDs = [];

  before('Creating user and test data', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    cy.getAdminToken().then(() => {
      marcFiles.forEach((marcFile) => {
        DataImport.uploadFile(marcFile.marc, marcFile.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.waitLoadingList();
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(marcFile.fileName);
        for (let i = 0; i < marcFile.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdRecordsIDs.push(link.split('/')[5]);
          });
        }
        cy.visit(TopMenu.dataImportPath);
      });
      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordsIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linking) => {
          QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(linking.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });
    });

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userData = createdUserProperties;

      cy.login(testData.userData.username, testData.userData.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstance.searchByTitle(createdRecordsIDs[0]);
      InventoryInstances.selectInstance();
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userData.userId);
      InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
      MarcAuthority.deleteViaAPI(createdRecordsIDs[1]);
      MarcAuthority.deleteViaAPI(createdRecordsIDs[2]);
    });
  });

  it(
    'C365603 Derive | Cancel unlinking "MARC Bibliographic" field from "MARC Authority" record and use the "Save & close" button in deriving window. (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.verifyRemoveLinkingModal(
        'Do you want to remove authority linking for this new bibliographic record?',
      );
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.checkEditableQuickMarcFormIsOpened();
      QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(linkingTagAndValues[1].rowIndex);
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
      QuickMarcEditor.checkUnlinkTooltipText(75, 'Unlink from MARC Authority record');
      QuickMarcEditor.clickUnlinkIconInTagField(linkingTagAndValues[1].rowIndex);
      QuickMarcEditor.checkUnlinkModal(
        'By selecting Unlink, then field 700 will be unlinked from the MARC authority record. Are you shure you want to continue?',
      );
      QuickMarcEditor.cancelUnlinkingField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.checkUnlinkModal(
        'By selecting Unlink, then field 700 will be unlinked from the MARC authority record. Are you shure you want to continue?',
      );
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkButtonSaveAndCloseEnable();
      QuickMarcEditor.checkViewMarcAuthorityTooltipText(linkingTagAndValues[1].rowIndex);
      QuickMarcEditor.clickViewMarcAuthorityIconInTagField(linkingTagAndValues[1].rowIndex);
      MarcAuthorities.checkFieldAndContentExistence(testData.tag100, testData.tag100content);

      cy.go('back');
      QuickMarcEditor.verifyRemoveLinkingModal(
        'Do you want to remove authority linking for this new bibliographic record?',
      );
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkCallout('Record created.');
      InstanceRecordView.verifyInstancePaneExists();
      InstanceRecordView.verifyContributorNameWithMarcAppIcon(0, 1, testData.tag100content);
      InstanceRecordView.verifyContributorNameWithMarcAppIcon(
        4,
        1,
        'Martin, Laura (Comic book artist)',
      );
      InventoryInstance.deriveNewMarcBibRecord();
      QuickMarcEditor.verifyTagFieldAfterLinking(...bib700AfterLinkingToAuth100);
    },
  );
});
