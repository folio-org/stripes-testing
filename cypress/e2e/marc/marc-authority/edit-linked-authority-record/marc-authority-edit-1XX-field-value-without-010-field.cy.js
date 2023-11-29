import getRandomPostfix from '../../../../support/utils/stringTools';
import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import { JOB_STATUS_NAMES } from '../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import InventoryKeyboardShortcuts from '../../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import InventoryHotkeys from '../../../../support/fragments/inventory/inventoryHotkeys';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag611: '611',
    tag111: '111',
    updatedValue:
      '$a C374158 Vatican Council $n (2nd : $d 1962-1966 : $c Basilica di San Pietro in Vaticano)',
    autoUpdateUserName: 'Automated linking update',
    marcAuthIcon: 'Linked to MARC authority',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374158.mrc',
      fileName: `testMarcFileC374158${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'An Anglican view of the Vatican Council.',
    },
    {
      marc: 'marcAuthFileC374158.mrc',
      fileName: `testMarcFileC374158${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading:
        'C374158 Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
      updatedAuthorityHeading:
        'C374158 Vatican Council (2nd : 1962-1966 : Basilica di San Pietro in Vaticano)',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 15,
    value: 'C374158 Vatican Council',
    tag: '611',
  };
  const hotKeys = InventoryHotkeys.hotKeys;
  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;

      marcFiles.forEach((marcFile) => {
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
          () => {
            DataImport.verifyUploadState();
            DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
            JobProfiles.search(marcFile.jobProfileToRun);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(marcFile.fileName);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(marcFile.fileName);
            Logs.getCreatedItemsID().then((link) => {
              createdRecordIDs.push(link.split('/')[5]);
            });
          },
        );
      });

      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstance.searchByTitle(createdRecordIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
        MarcAuthorities.switchToSearch();
        InventoryInstance.verifySelectMarcAuthorityModal();
        InventoryInstance.searchResults(linkingTagAndValue.value);
        MarcAuthoritiesSearch.selectAuthorityByIndex(0);
        InventoryInstance.clickLinkButton();
        QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
          linkingTagAndValue.tag,
          linkingTagAndValue.rowIndex,
        );
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
      });

      cy.login(testData.userProperties.username, testData.userProperties.password, {
        path: TopMenu.marcAuthorities,
        waiter: MarcAuthorities.waitLoading,
      });
    });
  });

  after('Deleting user, data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });
  });

  it(
    'C374158 Edit "1XX" field value of linked "MARC Authority" record (without "010" field) (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingField(testData.tag111, testData.updatedValue);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.cancelUpdateLinkedBibs();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      InventoryKeyboardShortcuts.pressHotKey(hotKeys.close);
      QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibs(1);
      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.searchBy('Keyword', marcFiles[1].updatedAuthorityHeading);
      MarcAuthorities.checkResultList([marcFiles[1].updatedAuthorityHeading]);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventoryInstance.waitInstanceRecordViewOpened(marcFiles[0].instanceTitle);
      InventoryInstance.verifyRecordStatus(testData.autoUpdateUserName);
      InventoryInstance.viewSource();
      InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${testData.tag611}\t`);
      InventoryViewSource.contains(
        '$a C374158 Vatican Council $c Basilica di San Pietro in Vaticano)',
      );
    },
  );
});
