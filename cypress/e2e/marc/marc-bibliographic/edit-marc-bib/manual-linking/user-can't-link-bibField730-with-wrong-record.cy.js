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
          tag730: '730',
          instanceField730Value: 'The Gone with the Wind',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };

        const linkValuesWithoutAuthoritySource = [
          {
            value: 'C380464 Stone, Robert B.',
            searchOption: 'Personal name',
          },
          {
            value: 'C380464 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
            searchOption: 'Name-title',
          },
          {
            value: 'C380464 Catalonia (Spain). Mozos de Escuadra',
            searchOption: 'Corporate/Conference name',
          },
          {
            value: 'C380464 United States. Truth in Lending Act',
            searchOption: 'Name-title',
          },
          {
            value: 'C380464 Western Region Research Conference in Agricultural Education',
            searchOption: 'Corporate/Conference name',
          },
          {
            value:
              'C380464 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
            searchOption: 'Name-title',
          },
        ];

        const linkValuesWithAuthoritySource = [
          {
            value: 'C380464 Montessori method of education',
            searchOption: 'Subject',
            authoritySource: String.raw`LC Children's Subject Headings`,
          },
          {
            value: 'C380464 Gulf Stream',
            searchOption: 'Geographic name',
            authoritySource: 'LC Subject Headings (LCSH)',
          },
          {
            value: 'C380464 Peplum films',
            searchOption: 'Genre',
            authoritySource: 'LC Genre/Form Terms (LCGFT)',
          },
        ];

        const linkableValue = {
          value: 'C380464 Marvel comics',
          searchOption: 'Uniform title',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC380464.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380464.mrc',
            fileName: `testMarcFileC375070.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 10,
            propertyName: 'authority',
          },
        ];

        const bib730FieldValues = [
          66,
          testData.tag730,
          '\\',
          '\\',
          '$t The Gone with $t the Wind $g test $h how $k key',
        ];

        const createdRecordIDs = [];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380464*');

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
              cy.reload();
              InventoryInstances.waitContentLoading();
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
          'C380464 Verify that user cant link "730" MARC Bib field with wrong record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380464'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib730FieldValues);
            InventoryInstance.verifyAndClickLinkIconByIndex(bib730FieldValues[0]);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('uniformTitle');
            MarcAuthorities.checkSearchInput(testData.instanceField730Value);
            MarcAuthorities.verifyEmptyAuthorityField();
            linkValuesWithoutAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.checkRow(linkValue.value);
              MarcAuthorities.selectTitle(linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
            });

            linkValuesWithAuthoritySource.forEach((linkValue) => {
              MarcAuthorityBrowse.searchBy(linkValue.searchOption, linkValue.value);
              MarcAuthorities.chooseAuthoritySourceOption(linkValue.authoritySource);
              MarcAuthorities.selectTitle(linkValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.closeAuthoritySourceOption();
            });

            MarcAuthorityBrowse.searchBy(linkableValue.searchOption, linkableValue.value);
            MarcAuthorities.checkRow(linkableValue.value);
            MarcAuthorities.selectTitle(linkableValue.value);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              bib730FieldValues[1],
              bib730FieldValues[0],
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              bib730FieldValues[0],
              bib730FieldValues[1],
              bib730FieldValues[2],
              bib730FieldValues[3],
              '$a C380464 Marvel comics',
              '',
              '$0 http://id.loc.gov/authorities/names/n80026980',
              '',
            );
          },
        );
      });
    });
  });
});
