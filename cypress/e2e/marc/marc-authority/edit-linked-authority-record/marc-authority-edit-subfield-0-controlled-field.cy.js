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
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC Authority -> Edit linked Authority record', () => {
  const testData = {
    tag700: '700',
    tag010: '010',
    updatedValue: '$a n91074081',
    accordion: 'Contributor',
  };
  const marcFiles = [
    {
      marc: 'marcBibFileC374157.mrc',
      fileName: `testMarcFileC374157${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      instanceTitle:
        'Runaway bride/ produced by Robert W. Cort, Ted Field, Scott Kroopf, Tom Rosenberg; written by Josann McGibbon, Sara Parriott; directed by Garry Marshall.',
    },
    {
      marc: 'marcAuthFileC374157.mrc',
      fileName: `testMarcFileC374157${getRandomPostfix()}.mrc`,
      jobProfileToRun: 'Default - Create SRS MARC Authority',
      authorityHeading: 'C374157 Roberts, Julia, 1967-',
      valueAfterSave: 'C374157 Roberts, Julia, 1967-',
    },
  ];
  const linkingTagAndValue = {
    rowIndex: 56,
    value: 'C374157 Roberts, Julia,',
    tag: '700',
  };
  const createdRecordIDs = [];

  before('Creating user, importing and linking records', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
      Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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
        InventoryInstance.verifyAndClickLinkIconByIndex(linkingTagAndValue.rowIndex);
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

  after('Deleting created users, Instances', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.userProperties.userId);
      createdRecordIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
        else InventoryInstance.deleteInstanceViaApi(id);
      });
    });
  });

  it(
    'C374157 Verify that edited "010" value of linked "MARC Authority" record will update "$0" controlled field when "010" = "$0" (spitfire) (TaaS)',
    { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
    () => {
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
      MarcAuthority.edit();
      QuickMarcEditor.updateExistingField(testData.tag010, testData.updatedValue);
      QuickMarcEditor.checkButtonsEnabled();
      QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
      QuickMarcEditor.confirmUpdateLinkedBibs(1);
      MarcAuthorities.closeMarcViewPane();
      MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
      MarcAuthorities.checkResultList([marcFiles[1].authorityHeading]);
      MarcAuthorities.verifyNumberOfTitles(5, '1');
      MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
      InventoryInstance.checkInstanceTitle(marcFiles[0].instanceTitle);
      InventoryInstance.verifyRecordAndMarcAuthIcon(
        testData.accordion,
        `Linked to MARC authority\n${marcFiles[1].valueAfterSave}`,
      );
      InventoryInstance.viewSource();
      InventoryViewSource.contains(
        'Linked to MARC authority\n\t700\t1  \t$a C374157 Roberts, Julia, $d 1967- $e Actor. $0 id.loc.gov/authorities/names/n91074081',
      );
    },
  );
});
