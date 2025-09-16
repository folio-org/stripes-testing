import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag600: '600',
          instanceField600Value: '1909-1998. (Barry Morris),',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };

        const linkValuesWithoutAuthoritySource = [
          {
            value: 'C380454 Catalonia (Spain). Mozos de Escuadra',
            searchOption: 'Corporate/Conference name',
          },
          {
            value: 'C380454 United States. Truth in Lending Act',
            searchOption: 'Name-title',
          },
          {
            value: 'C380454 Western Region Research Conference in Agricultural Education',
            searchOption: 'Corporate/Conference name',
          },
          {
            value:
              'C380454 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
            searchOption: 'Name-title',
          },
        ];

        const linkValuesWithAuthoritySource = [
          {
            value: 'C380454 Marvel comics',
            searchOption: 'Uniform title',
            authoritySource: 'LC Name Authority file (LCNAF)',
          },
          {
            value: 'C380454 Montessori method of education',
            searchOption: 'Subject',
            authoritySource: String.raw`LC Children's Subject Headings`,
          },
          {
            value: 'C380454 Gulf Stream',
            searchOption: 'Geographic name',
            authoritySource: 'LC Subject Headings (LCSH)',
          },
          {
            value: 'C380454 Peplum films',
            searchOption: 'Genre',
            authoritySource: 'LC Genre/Form Terms (LCGFT)',
          },
        ];

        const linkableValue = {
          value: 'C380454 Stone, Robert B.',
          searchOption: 'Personal name',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380454.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380454.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 10,
            propertyName: 'authority',
          },
        ];

        const bib600FieldValues = [
          21,
          testData.tag600,
          '1',
          '0',
          '$b C380454 Goldwater, Barry M. $t (Barry Morris), $d 1909-1998.',
        ];

        const createdRecordIDs = [];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380454*');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
                  createdRecordIDs.push(record[marcFile.propertyName].id);
                });
              });
            });
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C380454 Verify that user cant link "600" MARC Bib field with wrong record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380454'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib600FieldValues);
            InventoryInstance.verifyAndClickLinkIconByIndex(bib600FieldValues[0]);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('personalNameTitle');
            MarcAuthorities.checkSearchInput(testData.instanceField600Value);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchOption('personalNameTitle');
            MarcAuthorities.checkSearchInput('');
            MarcAuthorities.verifyEmptyAuthorityField();
            linkValuesWithoutAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
            });

            linkValuesWithAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.closeAuthoritySourceOption();
            });

            MarcAuthorityBrowse.searchBy(linkableValue.searchOption, linkableValue.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              bib600FieldValues[1],
              bib600FieldValues[0],
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              bib600FieldValues[0],
              bib600FieldValues[1],
              bib600FieldValues[2],
              bib600FieldValues[3],
              '$a C380454 Stone, Robert B.',
              '',
              '$0 http://id.loc.gov/authorities/names/n79061096',
              '',
            );
          },
        );
      });
    });
  });
});
