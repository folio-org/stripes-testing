import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('MARC -> MARC Authority', () => {
  const testData = {
    tag100: '100',
    tag150: '150',
    tag650: '650',
    searchOption: 'Keyword',
    marcAuthIcon: 'Linked to MARC authority',
    authorityType: 'Auth/Ref',
    linked100FieldValues: [
      11,
      '100',
      '1',
      '\\',
      '$a Chin, Staceyann, $d 1972-',
      '$e Author $e Narrator',
      '$0 id.loc.gov/authorities/names/n2008052404',
      '$1 http://viaf.org/viaf/24074052',
    ],
    notLinked650FieldValues: [
      19,
      '650',
      '\\',
      '0',
      '$a Feminist poetry $0 id.loc.gov/authorities/subjects/sh85047755',
    ],
    deleteModalMessage:
      'Are you sure you want to permanently delete the authority record:  Poetry ? If you proceed with deletion, then 1 linked bibliographic record will retain authorized value and will become uncontrolled.',
  };

  const marcFiles = [
    {
      marc: 'marcBibFileForC374148.mrc',
      fileName: `testMarcFileC374148.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle: 'Crossfire : a litany for survival.',
      field650Value: 'The other side of paradise : a memoir / Staceyann Chin.',
    },
    {
      marc: 'marcAuthFileForC374148_01.mrc',
      fileName: `testMarcFileC374148.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authority100FieldValue: '$a Chin, Staceyann, $d 1972-',
      authorityTitle: 'Chin, Staceyann, 1972-',
    },
    {
      marc: 'marcAuthFileForC374148_02.mrc',
      fileName: `testMarcFileC374148.${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorutyTitle: 'Poetry',
      authority150FieldValue: 'Feminist poetry',
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
      InventoryInstance.searchResults(marcFiles[2].authority150FieldValue);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag150,
        marcFiles[2].authority150FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag650);
      QuickMarcEditor.closeCallout();

      InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
      InventoryInstance.verifySelectMarcAuthorityModal();
      MarcAuthorities.switchToSearch();
      InventoryInstance.searchResults(marcFiles[1].authorityTitle);
      MarcAuthorities.checkFieldAndContentExistence(
        testData.tag100,
        marcFiles[1].authority100FieldValue,
      );
      InventoryInstance.clickLinkButton();
      QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);
      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100FieldValues);
      QuickMarcEditor.pressSaveAndClose();

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
    'C374148 Delete auth/ref "MARC Authority" record that has one linked field in "MARC Bib" record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      MarcAuthorities.searchByParameter(testData.searchOption, marcFiles[2].authorutyTitle);

      MarcAuthorities.selectByTypeAndHeading(marcFiles[2].authorutyTitle, testData.authorityType);

      MarcAuthoritiesDelete.clickDeleteButton();
      MarcAuthoritiesDelete.checkDeleteModal();
      MarcAuthoritiesDelete.checkDeleteModalMessage(testData.deleteModalMessage);

      MarcAuthoritiesDelete.confirmDelete();
      MarcAuthoritiesDelete.verifyDeleteComplete(marcFiles[2].authorutyTitle);

      TopMenuNavigation.navigateToApp('Inventory');
      InventoryInstances.searchByTitle(createdRecordIDs[0]);
      InventoryInstances.selectInstance();

      InventoryInstance.editMarcBibliographicRecord();

      QuickMarcEditor.verifyTagFieldAfterLinking(...testData.linked100FieldValues);
      QuickMarcEditor.verifyTagFieldNotLinked(...testData.notLinked650FieldValues);

      QuickMarcEditor.checkAllBoxesInARowAreEditable(testData.tag650);

      QuickMarcEditor.pressCancel();

      InventoryInstance.viewSource();
      InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${testData.tag100}\t`);
      InventoryViewSource.notContains(`${testData.marcAuthIcon}\n\t${testData.tag650}\t`);
    },
  );
});
