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
          tag130: '130',
          instanceField130Value: 'C380452 King Kong (1933) Skull Island',
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
          searchOption: 'Uniform title',
        };

        const linkValuesWithoutAuthoritySource = [
          {
            value: 'C380452 Stone, Robert B.',
            searchOption: 'Personal name',
          },
          {
            value: 'C380452 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn',
            searchOption: 'Name-title',
          },
          {
            value: 'C380452 Catalonia (Spain). Mozos de Escuadra',
            searchOption: 'Corporate/Conference name',
          },
          {
            value: 'C380452 United States. Truth in Lending Act',
            searchOption: 'Name-title',
          },
          {
            value: 'C380452 Western Region Research Conference in Agricultural Education',
            searchOption: 'Corporate/Conference name',
          },
          {
            value:
              'C380452 Geophysical Symposium (21st : 1976 : Leipzig, Germany) Proceedings. Selections',
            searchOption: 'Name-title',
          },
        ];

        const linkValuesWithAuthoritySource = [
          {
            value: 'C380452 Montessori method of education',
            searchOption: 'Subject',
            authoritySource: "LC Children's Subject Headings",
          },
          {
            value: 'C380452 Gulf Stream',
            searchOption: 'Geographic name',
            authoritySource: 'LC Subject Headings (LCSH)',
          },
          {
            value: 'C380452 Peplum films',
            searchOption: 'Genre',
            authoritySource: 'LC Genre/Form Terms (LCGFT)',
          },
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC380452.mrc',
            fileName: `testMarcFileC380452.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC380452.mrc',
            fileName: `testMarcFileC380452.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 10,
            propertyName: 'authority',
          },
        ];

        const bib130FieldValues = [
          9,
          testData.tag130,
          '1',
          '\\',
          '$a C380452 King Kong (1933) $t Skull Island $f 1900 $g trt',
        ];

        const createdRecordIDs = [];

        before('Creating user and data', () => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380452*');

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
          'C380452 Verify that user cant link "130" MARC Bib field with wrong record (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C380452'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib130FieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag130);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.checkSearchOption('uniformTitle');
            MarcAuthorities.checkSearchInput(testData.instanceField130Value);
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
          },
        );
      });
    });
  });
});
