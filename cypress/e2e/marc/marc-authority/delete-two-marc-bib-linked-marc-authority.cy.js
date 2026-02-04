import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      marcValue: 'Chin, Staceyann, 1972- C369084',
      markedValue: 'Chin, Staceyann,',
      searchOption: 'Personal name',
    };

    const marcFiles = [
      {
        marc: 'marcBibFileForC369084.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        numOfRecords: 2,
        propertyName: 'instance',
      },
      {
        marc: 'marcAuthFileForC369084.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        numOfRecords: 2,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

    const linkingTagForFirstMarcBib = [
      {
        rowIndex: 16,
        value: 'Chin, Staceyann, 1972- C369084',
        tag: 100,
      },
      {
        rowIndex: 27,
        value: 'Chin, Staceyann, 1972- C369084',
        tag: 600,
      },
    ];

    const linkingTagForSecondMarcBib = [
      {
        rowIndex: 11,
        value: 'Chin, Staceyann, 1972- C369084',
        tag: 100,
      },
      {
        rowIndex: 19,
        value: 'Feminist poetry C369084',
        tag: 650,
      },
    ];

    const twoMarcBibsToLink = [
      {
        marcBibRecord: 'C369084The other side of paradise : a memoir / Staceyann Chin.',
        linkingFields: linkingTagForFirstMarcBib,
      },
      {
        marcBibRecord:
          'C369084Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin',
        linkingFields: linkingTagForSecondMarcBib,
      },
    ];

    before('Creating user', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      InventoryInstances.deleteFullInstancesByTitleViaApi('C369084*');
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('*C369084');
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getAdminToken();
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.loginAsAdmin({
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        }).then(() => {
          twoMarcBibsToLink.forEach((marcBib) => {
            InventoryInstances.searchByTitle(marcBib.marcBibRecord);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            marcBib.linkingFields.forEach((linking) => {
              cy.wait(2000);
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

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
      MarcAuthority.deleteViaAPI(createdAuthorityIDs[2]);
    });

    it(
      'C369084 Delete authorized "MARC Authority" record that has two linked field in different "MARC Bib" records (spitfire)',
      { tags: ['criticalPathBroken', 'spitfire', 'C369084'] },
      () => {
        MarcAuthorities.switchToBrowse();
        MarcAuthorities.searchByParameter(testData.searchOption, testData.marcValue);

        MarcAuthorities.selectTitle(testData.marcValue);
        MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedValue);
        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.checkDeleteModalMessage(
          `Are you sure you want to permanently delete the authority record:  ${testData.marcValue} ? If you proceed with deletion, then 2 linked bibliographic records will retain authorized value and will become uncontrolled.`,
        );
        MarcAuthoritiesDelete.clickCancelButton();

        MarcAuthoritiesDelete.clickDeleteButton();
        MarcAuthoritiesDelete.checkDeleteModal();
        MarcAuthoritiesDelete.checkDeleteModalMessage(
          `Are you sure you want to permanently delete the authority record:  ${testData.marcValue} ? If you proceed with deletion, then 2 linked bibliographic records will retain authorized value and will become uncontrolled.`,
        );
        MarcAuthoritiesDelete.confirmDelete();
        MarcAuthoritiesDelete.checkAfterDeletion(testData.marcValue);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.searchByTitle(twoMarcBibsToLink[1].marcBibRecord);
        InventoryInstances.selectInstance();
        InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
        InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane('Subject');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          11,
          '100',
          '1',
          '\\',
          '$a Chin, Staceyann, $d 1972- C369084 $e Author $e Narrator $0 http://id.loc.gov/authorities/names/n2008052404 $1 http://viaf.org/viaf/24074052',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          19,
          '650',
          '\\',
          '0',
          '$a Feminist poetry C369084',
          '',
          '$0 http://id.loc.gov/authorities/subjects/sh85047755',
          '',
        );
        QuickMarcEditor.checkLinkButtonExist('100');

        QuickMarcEditor.closeEditorPane();
        InventoryInstances.searchByTitle(twoMarcBibsToLink[0].marcBibRecord);
        InventoryInstances.selectInstance();
        InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Contributor');
        InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane('Subject');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          16,
          '100',
          '1',
          '\\',
          '$a Chin, Staceyann, $d 1972- C369084 $e author. $0 http://id.loc.gov/authorities/names/n2008052404',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          27,
          '600',
          '1',
          '0',
          '$a Chin, Staceyann, $d 1972- C369084 $x Childhood and youth. $0 http://id.loc.gov/authorities/names/n2008052404',
        );
        QuickMarcEditor.pressCancel();

        InventoryInstance.waitInventoryLoading();
        InventoryInstance.viewSource();
        InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
      },
    );
  });
});
